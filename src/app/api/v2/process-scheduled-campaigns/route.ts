import { NextRequest, NextResponse } from 'next/server';
import { processReadyCampaigns } from '@/v2/services/campaignProcessingService';
import { requireCronAuth } from '@/lib/apiAuth';

// This endpoint should be called daily by a cron job (e.g., Vercel Cron, GitHub Actions, or external service)
export async function GET(request: NextRequest) {
  try {
    // CRON ONLY: Require CRON_SECRET authentication
    const cronAuthError = requireCronAuth(request);
    if (cronAuthError) {
      return cronAuthError;
    }
    
    console.log('Starting scheduled campaign processing...');
    
    // Process all campaigns that are ready
    const result = await processReadyCampaigns();
    
    console.log('Scheduled campaign processing complete:', {
      processed: result.processed.length,
      skipped: result.skipped.length,
      failed: result.failed.length
    });
    
    return NextResponse.json({
      success: true,
      processed: result.processed.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
      timestamp: new Date().toISOString(),
      details: {
        processed: result.processed,
        skipped: result.skipped,
        failed: result.failed
      },
      message: `Processed ${result.processed.length} campaigns, skipped ${result.skipped.length}, failed ${result.failed.length}`
    });
    
  } catch (error) {
    console.error('Scheduled campaign processing error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for flexibility with cron services
export async function POST(request: NextRequest) {
  return GET(request);
} 