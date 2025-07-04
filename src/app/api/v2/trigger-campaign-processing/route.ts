import { NextRequest, NextResponse } from 'next/server';
import { processPaidCampaign, isCampaignReadyForProcessing } from '@/v2/services/campaignProcessingService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, scheduledSendDate } = body;
    
    if (!campaignId) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID is required'
      }, { status: 400 });
    }
    
    // Check if campaign is ready for processing
    const { ready, issues } = await isCampaignReadyForProcessing(campaignId);
    if (!ready) {
      console.log(`Campaign ${campaignId} not ready:`, issues);
      
      // If the only issue is scheduled date, that's OK - we'll handle it
      const onlySchedulingIssue = issues.length === 1 && 
        issues[0].includes('Scheduled for');
      
      if (!onlySchedulingIssue) {
        return NextResponse.json({
          success: false,
          error: 'Campaign not ready for processing',
          issues
        }, { status: 400 });
      }
    }
    
    // Parse scheduled send date
    const sendDate = new Date(scheduledSendDate);
    const now = new Date();
    const hoursUntilSend = (sendDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // If scheduled for more than 1 hour in the future, just mark as scheduled
    if (hoursUntilSend > 1) {
      console.log(`Campaign ${campaignId} scheduled for ${sendDate.toISOString()}`);
      
      // Update status to scheduled
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'scheduled',
        scheduledSendDate: sendDate,
        schedulingNote: `Will be processed on ${sendDate.toLocaleDateString()}`,
        updatedAt: new Date()
      });
      
      // TODO: In production, create a Cloud Scheduler job or Pub/Sub message
      // For now, we'll rely on a periodic check function
      
      return NextResponse.json({
        success: true,
        message: `Campaign scheduled for ${sendDate.toLocaleDateString()}`,
        scheduledDate: sendDate.toISOString(),
        status: 'scheduled'
      });
    }
    
    // Process immediately (ASAP or scheduled time has arrived)
    console.log(`Processing campaign ${campaignId} immediately`);
    
    // Update status to processing
    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: 'processing',
      processingStartedAt: new Date(),
      updatedAt: new Date()
    });
    
    // Process the campaign
    const result = await processPaidCampaign(campaignId, false); // Not test mode
    
    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      stats: result.stats,
      message: result.success 
        ? `Successfully processed ${result.processed} postcards`
        : `Failed to process campaign: ${result.errors.join(', ')}`,
      status: result.success ? 'sent' : 'failed'
    });
    
  } catch (error) {
    console.error('Campaign processing trigger error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check scheduled campaigns (can be called by a cron job)
export async function GET() {
  try {
    const { processReadyCampaigns } = await import('@/v2/services/campaignProcessingService');
    
    // Process all campaigns that are ready
    const result = await processReadyCampaigns();
    
    return NextResponse.json({
      success: true,
      processed: result.processed.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
      details: result,
      message: `Processed ${result.processed.length} campaigns, skipped ${result.skipped.length}, failed ${result.failed.length}`
    });
    
  } catch (error) {
    console.error('Scheduled campaign check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 