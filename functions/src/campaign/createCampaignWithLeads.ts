import { onCall, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp, DocumentReference } from "firebase-admin/firestore";
import { initializeApp } from "firebase-admin/app";
import { 
  Campaign, 
  CampaignLead, 
  CreateCampaignData, 
  LeadStatus, 
  CreateCampaignResponse,
  CampaignMode
} from "../types/campaign";
import { chunkArray } from "../lib/chunkArray";

// Initialize Firebase Admin - this needs to happen before accessing Firestore
const app = initializeApp();
const db = getFirestore(app);

/**
 * Creates a new campaign with leads
 * Called when user clicks "Start Campaign" button
 */
export const createCampaignWithLeads = onCall({ 
  enforceAppCheck: true  // Requires App Check for production security
}, async (request: CallableRequest<CreateCampaignData>): Promise<CreateCampaignResponse> => {
  const data = request.data;
  
  logger.info("Creating campaign with leads", { 
    cid: data.cid,
    mode: data.mode,
    leadsCount: data.allFoundLeadsData.length,
    selectedCount: data.selectedPlaceIds.length
  });

  // Authentication check
  if (!request.auth) {
    throw new Error("Unauthorized: User must be authenticated");
  }

  const userId = request.auth.uid;
  
  // Input validation
  if (!data.cid || !data.allFoundLeadsData || !data.selectedPlaceIds) {
    throw new Error("Invalid input: Missing required fields");
  }

  if (data.allFoundLeadsData.length > 5000) {
    throw new Error("Too many leads: Maximum 5000 leads allowed");
  }

  // Check for existing campaign (idempotency)
  const campaignRef = db.collection("campaigns").doc(data.cid);
  const existingCampaign = await campaignRef.get();
  
  if (existingCampaign.exists) {
    return { 
      success: true, 
      campaignId: data.cid, 
      status: "already_exists" 
    };
  }

  // Create initial typeStats object to track counts by business type
  const typeStats: Campaign["typeStats"] = {};
  
  // Process leads and prepare campaign document
  try {
    // Setup main campaign document data
    const campaignData: Campaign = {
      ownerUid: userId,
      strategyId: data.strategyId,
      campaignMode: data.mode as CampaignMode,
      status: "draft",
      productType: "postcard_4x6", // Default product type
      quantity: data.selectedPlaceIds.length,
      price: {
        tierApplied: null,
        unitCost: null,
        total: null,
        currency: "CAD"
      },
      recurrence: data.mode === CampaignMode.AUTOPILOT ? data.recurrence || null : null,
      nextRunAt: data.mode === CampaignMode.AUTOPILOT ? data.nextRunAt || null : null,
      designIdLocked: data.mode === CampaignMode.AUTOPILOT ? data.designIdLocked || null : null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      teamId: null,
      typeStats: typeStats
    };

    // We'll process leads in chunks to stay under Firestore batch limit (500 operations)
    // Leaving 50 operations buffer for other possible operations
    const MAX_BATCH_SIZE = 450; 
    const leadChunks = chunkArray(data.allFoundLeadsData, MAX_BATCH_SIZE);
    
    // Process first batch (includes the campaign document)
    const firstBatch = db.batch();
    firstBatch.set(campaignRef, campaignData);

    // Process first chunk of leads
    await processLeadChunk(
      leadChunks[0], 
      campaignRef, 
      firstBatch, 
      data.selectedPlaceIds, 
      data.mode as CampaignMode,
      typeStats
    );
    
    // Commit the first batch (with campaign doc + first chunk of leads)
    await firstBatch.commit();
    
    // Process remaining lead chunks in separate batches
    if (leadChunks.length > 1) {
      for (let i = 1; i < leadChunks.length; i++) {
        const batch = db.batch();
        await processLeadChunk(
          leadChunks[i], 
          campaignRef, 
          batch, 
          data.selectedPlaceIds, 
          data.mode as CampaignMode,
          typeStats
        );
        await batch.commit();
      }
    }
    
    // Update the campaign with final typeStats (after all batches)
    await campaignRef.update({ 
      typeStats: typeStats,
      updatedAt: Timestamp.now()
    });
    
    logger.info("Campaign created successfully", { 
      campaignId: data.cid,
      userId,
      leadsProcessed: data.allFoundLeadsData.length
    });
    
    return {
      success: true,
      campaignId: data.cid
    };
    
  } catch (error) {
    logger.error("Error creating campaign", { error, campaignId: data.cid, userId });
    throw new Error(`Failed to create campaign: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});

/**
 * Processes a chunk of leads for batch operations
 */
async function processLeadChunk(
  leads: any[], 
  campaignRef: DocumentReference,
  batch: FirebaseFirestore.WriteBatch,
  selectedPlaceIds: string[],
  mode: CampaignMode,
  typeStats: Campaign["typeStats"]
): Promise<void> {
  
  // Process each lead in the chunk
  for (const leadData of leads) {
    const { place_id, businessType } = leadData;
    
    // Determine lead status based on selection and campaign mode
    let status: LeadStatus;
    const isSelected = selectedPlaceIds.includes(place_id);
    
    if (mode === CampaignMode.AUTOPILOT) {
      status = isSelected ? LeadStatus.AUTOPILOT_SELECTED : LeadStatus.AUTOPILOT_FOUND;
    } else {
      status = isSelected ? LeadStatus.SELECTED : LeadStatus.FOUND;
    }
    
    // Initialize typeStats for this business type if not already done
    if (!typeStats[businessType]) {
      typeStats[businessType] = {
        found: 0,
        selected: 0,
        sent: 0
      };
    }
    
    // Update counts in typeStats
    if (isSelected) {
      typeStats[businessType].selected++;
    } else {
      typeStats[businessType].found++;
    }
    
    // Prepare lead document data
    const leadDocData: CampaignLead = {
      status,
      businessType,
      createdAt: Timestamp.now(),
      selectedAt: isSelected ? Timestamp.now() : null,
      place_id,
      name: leadData.name,
      vicinity: leadData.vicinity,
      // Copy other available fields from the lead data
      ...Object.entries(leadData)
        .filter(([key]) => !["status", "businessType", "createdAt", "selectedAt"].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    };
    
    // Add lead to batch
    const leadDocRef = campaignRef.collection("leads").doc(place_id);
    batch.set(leadDocRef, leadDocData);
  }
} 