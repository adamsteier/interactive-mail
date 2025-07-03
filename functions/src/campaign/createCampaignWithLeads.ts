import { onCall, CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp, DocumentReference } from "firebase-admin/firestore";
import { 
  Campaign, 
  CampaignLead,
  CreateCampaignData, 
  LeadStatus, 
  CreateCampaignResponse,
  CampaignMode,
  LeadData
} from "../types/campaign";
import { chunkArray } from "../lib/chunkArray";

// Get the initialized Firestore instance
const db = getFirestore();

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
      leadChunks[0] ?? [], // Handle case where leadChunks[0] might be undefined if allFoundLeadsData is empty
      campaignRef, 
      firstBatch, 
      data.selectedPlaceIds, // Array of googlePlaceId
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
  leads: LeadData[], // Expecting updated LeadData structure
  campaignRef: DocumentReference,
  batch: FirebaseFirestore.WriteBatch,
  selectedGooglePlaceIds: string[], // Renamed for clarity
  mode: CampaignMode,
  typeStats: Campaign["typeStats"]
): Promise<void> {
  for (const leadPayload of leads) {
    // Destructure all new fields from leadPayload
    const {
      searchBusinessType, 
      aiReasoning,
      googlePlaceId,
      googleBusinessName,
      googleFormattedAddress,
      googleTypes,
      googlePostalCode,
      googlePhoneNumber,
      googleWebsite,
      googleRating
    } = leadPayload;

    // Ensure googlePlaceId is present (it's the primary identifier for leads now)
    if (!googlePlaceId) {
      logger.warn("Skipping lead due to missing googlePlaceId", { leadPayload });
      continue;
    }

    let status: LeadStatus;
    const isSelected = selectedGooglePlaceIds.includes(googlePlaceId);
    
    if (mode === CampaignMode.AUTOPILOT) {
      status = isSelected ? LeadStatus.AUTOPILOT_SELECTED : LeadStatus.AUTOPILOT_FOUND;
    } else {
      status = isSelected ? LeadStatus.SELECTED : LeadStatus.FOUND;
    }
    
    // Use searchBusinessType for typeStats
    if (!typeStats[searchBusinessType]) {
      typeStats[searchBusinessType] = { found: 0, selected: 0, sent: 0 };
    }
    if (isSelected) {
      typeStats[searchBusinessType].selected++;
    } else {
      typeStats[searchBusinessType].found++;
    }
    
    const leadDocData: CampaignLead = {
      status,
      searchBusinessType, 
      aiReasoning,
      googlePlaceId,
      googleBusinessName,
      googleFormattedAddress,
      googleTypes: googleTypes || [], // Default to empty array
      googlePostalCode: googlePostalCode || undefined, // Store if present
      googlePhoneNumber: googlePhoneNumber || undefined,
      googleWebsite: googleWebsite || undefined,
      googleRating: googleRating || undefined,
      createdAt: Timestamp.now(),
      selectedAt: isSelected ? Timestamp.now() : null,
      // Store otherData if necessary, perhaps under a specific key or merge carefully
      // For now, we are explicitly mapping known fields.
      // If otherData contains fields that match CampaignLead, they will be overwritten by explicit assignments above.
      // If you want to merge all otherData fields: ...otherData
    };
    
    const leadDocRef = campaignRef.collection("leads").doc(googlePlaceId); // Use googlePlaceId as doc ID
    batch.set(leadDocRef, leadDocData);
  }
} 