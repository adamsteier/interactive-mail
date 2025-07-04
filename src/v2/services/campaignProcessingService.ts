import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  getDocs,
  collection,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { V2Campaign as Campaign } from '@/v2/types/campaign';
import { V2Design as Design } from '@/v2/types/design';
import { V2Brand as Brand } from '@/v2/types/brand';
import { processPostcardForPrint } from './imageProcessingService';
import { batchCreatePostcards, getCampaignMailpieceStats, LeadData } from './stannpService';

export interface ProcessingResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  stats?: {
    total: number;
    byStatus: Record<string, number>;
    totalCost: number;
    avgDeliveryTime?: number;
  };
}

/**
 * Main function to process a paid campaign
 * This should be triggered after successful payment
 */
export async function processPaidCampaign(
  campaignId: string,
  isTest: boolean = false
): Promise<ProcessingResult> {
  const errors: string[] = [];
  
  try {
    console.log(`Starting campaign processing for ${campaignId} (test: ${isTest})`);
    
    // 1. Get campaign data
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    
    if (!campaignSnap.exists()) {
      throw new Error('Campaign not found');
    }
    
    const campaign = { id: campaignId, ...campaignSnap.data() } as Campaign;
    
    // Verify campaign is in correct state
    if (campaign.status !== 'paid' && !isTest) {
      throw new Error(`Campaign status is ${campaign.status}, expected 'paid'`);
    }
    
    // Update status to processing
    await updateDoc(campaignRef, {
      status: 'processing',
      processingStartedAt: Timestamp.now()
    });
    
    // 2. Get brand data
    if (!campaign.ownerUid || !campaign.brandId) {
      throw new Error('Campaign missing owner UID or brand ID');
    }
    
    const brandRef = doc(db, 'users', campaign.ownerUid, 'brands', campaign.brandId);
    const brandSnap = await getDoc(brandRef);
    
    if (!brandSnap.exists()) {
      throw new Error('Brand not found');
    }
    
    const brand = { id: campaign.brandId, ...brandSnap.data() } as Brand;
    
    // 3. Get all unique designs used in campaign
    const designIds = [...new Set(campaign.designAssignments?.map(da => da.designId) || [])];
    const designs = new Map<string, Design>();
    
    for (const designId of designIds) {
      const designRef = doc(db, 'users', campaign.ownerUid, 'designs', designId);
      const designSnap = await getDoc(designRef);
      
      if (designSnap.exists()) {
        designs.set(designId, { id: designId, ...designSnap.data() } as Design);
      } else {
        errors.push(`Design ${designId} not found`);
      }
    }
    
    // 4. Process each design (upscale + add logo)
    const processedDesigns = new Map<string, { frontUrl: string; backUrl?: string }>();
    
    for (const [designId, design] of designs) {
      try {
        console.log(`Processing design ${designId}`);
        
        // Get the AI-generated image URL
        const frontImageUrl = design.generation?.finalImageUrl;
        if (!frontImageUrl) {
          throw new Error(`No front image URL for design ${designId}`);
        }
        
        // Process the image (upscale + logo) - returns ProcessingResult with front.url
        const processingResult = await processPostcardForPrint(
          frontImageUrl,
          brand,
          campaign.ownerUid,
          campaignId,
          designId
        );
        
        processedDesigns.set(designId, {
          frontUrl: processingResult.front.url,
          // TODO: Handle back design if needed
        });
        
      } catch (error) {
        const errorMsg = `Failed to process design ${designId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // 5. Get all leads and prepare for Stannp
    const leadsToProcess: Array<{
      lead: LeadData;
      frontUrl: string;
      backUrl?: string;
      designId: string;
    }> = [];
    
    // Get leads from chunks (for large campaigns)
    const leadChunks = await getDocs(collection(db, 'campaigns', campaignId, 'leadsChunks'));
    const allLeads: LeadData[] = [];
    
    if (leadChunks.empty) {
      // Fallback to old structure
      const leadsCollection = await getDocs(collection(db, 'campaigns', campaignId, 'leads'));
      leadsCollection.forEach(doc => {
        allLeads.push({ id: doc.id, ...doc.data() } as LeadData);
      });
    } else {
      // Get leads from chunks
      leadChunks.forEach(chunkDoc => {
        const chunk = chunkDoc.data();
        if (chunk.leads && Array.isArray(chunk.leads)) {
          allLeads.push(...(chunk.leads as LeadData[]));
        }
      });
    }
    
    console.log(`Found ${allLeads.length} leads to process`);
    
    // Match leads to designs based on business type
    for (const lead of allLeads) {
      // Find the design assignment for this lead's business type
      const assignment = campaign.designAssignments?.find(da => 
        lead.businessType && da.businessTypes.includes(lead.businessType)
      );
      
      if (assignment && processedDesigns.has(assignment.designId)) {
        const designUrls = processedDesigns.get(assignment.designId)!;
        leadsToProcess.push({
          lead,
          frontUrl: designUrls.frontUrl,
          backUrl: designUrls.backUrl,
          designId: assignment.designId
        });
      } else {
        errors.push(`No design found for lead ${lead.id} (type: ${lead.businessType})`);
      }
    }
    
    // 6. Send to Stannp in batches
    console.log(`Sending ${leadsToProcess.length} postcards to Stannp`);
    
    const { successful, failed } = await batchCreatePostcards(
      campaignId,
      leadsToProcess,
      isTest
    );
    
    // Add failed lead errors
    failed.forEach(({ lead, error }) => {
      errors.push(`Lead ${lead.id}: ${error}`);
    });
    
    // 7. Update campaign status
    const finalStatus = successful.length > 0 ? 'sent' : 'failed';
    const stats = await getCampaignMailpieceStats(campaignId);
    
    await updateDoc(campaignRef, {
      status: finalStatus,
      processingCompletedAt: Timestamp.now(),
      leadsSent: successful.length,
      leadsFailed: failed.length,
      processingErrors: errors,
      mailpieceStats: stats,
      'scheduling.actualSendDate': Timestamp.now()
    });
    
    console.log(`Campaign processing complete. Sent: ${successful.length}, Failed: ${failed.length}`);
    
    return {
      success: successful.length > 0,
      processed: successful.length,
      failed: failed.length,
      errors,
      stats
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    console.error('Campaign processing failed:', error);
    
    // Update campaign status to failed
    try {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'failed',
        processingErrors: errors,
        processingFailedAt: Timestamp.now()
      });
    } catch (updateError) {
      console.error('Failed to update campaign status:', updateError);
    }
    
    return {
      success: false,
      processed: 0,
      failed: 0,
      errors
    };
  }
}

/**
 * Check if campaign is ready for processing
 */
export async function isCampaignReadyForProcessing(campaignId: string): Promise<{
  ready: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    
    if (!campaignSnap.exists()) {
      return { ready: false, issues: ['Campaign not found'] };
    }
    
    const campaign = campaignSnap.data() as Campaign;
    
    // Check status
    if (campaign.status !== 'paid') {
      issues.push(`Campaign status is ${campaign.status}, expected 'paid'`);
    }
    
    // Check required fields
    if (!campaign.brandId) {
      issues.push('No brand selected');
    }
    
    if (!campaign.designAssignments || campaign.designAssignments.length === 0) {
      issues.push('No design assignments');
    }
    
    // Check if scheduled send date has passed
    if (campaign.scheduling?.scheduledSendDate) {
      const scheduledDate = campaign.scheduling.scheduledSendDate.toDate();
      if (scheduledDate > new Date()) {
        issues.push(`Scheduled for ${scheduledDate.toLocaleDateString()}, not ready yet`);
      }
    }
    
    return {
      ready: issues.length === 0,
      issues
    };
    
  } catch (error) {
    return {
      ready: false,
      issues: [`Error checking campaign: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Process all campaigns that are ready
 * This could be run as a scheduled Cloud Function
 */
export async function processReadyCampaigns(): Promise<{
  processed: string[];
  skipped: string[];
  failed: string[];
}> {
  const processed: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];
  
  try {
    // Find all paid campaigns
    const paidCampaigns = await getDocs(
      query(collection(db, 'campaigns'), where('status', '==', 'paid'))
    );
    
    for (const campaignDoc of paidCampaigns.docs) {
      const campaignId = campaignDoc.id;
      const { ready, issues } = await isCampaignReadyForProcessing(campaignId);
      
      if (ready) {
        const result = await processPaidCampaign(campaignId);
        if (result.success) {
          processed.push(campaignId);
        } else {
          failed.push(campaignId);
        }
      } else {
        console.log(`Skipping campaign ${campaignId}: ${issues.join(', ')}`);
        skipped.push(campaignId);
      }
    }
    
  } catch (error) {
    console.error('Error processing ready campaigns:', error);
  }
  
  return { processed, skipped, failed };
} 