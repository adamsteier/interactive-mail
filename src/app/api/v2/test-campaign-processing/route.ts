import { NextRequest, NextResponse } from 'next/server';
import { processPaidCampaign, isCampaignReadyForProcessing } from '@/v2/services/campaignProcessingService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, checkOnly = false } = body;
    
    if (!campaignId) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID is required'
      }, { status: 400 });
    }
    
    // If checkOnly, just verify if campaign is ready
    if (checkOnly) {
      const readiness = await isCampaignReadyForProcessing(campaignId);
      return NextResponse.json({
        success: true,
        ready: readiness.ready,
        issues: readiness.issues
      });
    }
    
    // Process the campaign
    console.log(`Processing campaign ${campaignId}...`);
    const result = await processPaidCampaign(campaignId, true); // Run in test mode
    
    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      errors: result.errors,
      stats: result.stats,
      message: result.success 
        ? `Successfully processed ${result.processed} postcards`
        : `Failed to process campaign: ${result.errors.join(', ')}`
    });
    
  } catch (error) {
    console.error('Campaign processing test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check campaign status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');
    
    if (!campaignId) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID is required'
      }, { status: 400 });
    }
    
    const readiness = await isCampaignReadyForProcessing(campaignId);
    
    return NextResponse.json({
      success: true,
      campaignId,
      ready: readiness.ready,
      issues: readiness.issues,
      instructions: {
        checkOnly: 'POST with { campaignId, checkOnly: true } to check readiness',
        process: 'POST with { campaignId } to process the campaign in test mode'
      }
    });
    
  } catch (error) {
    console.error('Campaign status check error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 