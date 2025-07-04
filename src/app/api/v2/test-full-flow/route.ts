import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { processPaidCampaign } from '@/v2/services/campaignProcessingService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');
    
    if (!campaignId) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID is required',
        usage: 'GET /api/v2/test-full-flow?campaignId=YOUR_CAMPAIGN_ID'
      }, { status: 400 });
    }
    
    // Get campaign status
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    
    if (!campaignSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Campaign not found'
      }, { status: 404 });
    }
    
    const campaign = campaignSnap.data();
    
    return NextResponse.json({
      success: true,
      campaignId,
      currentStatus: campaign.status,
      brandId: campaign.brandId,
      totalLeads: campaign.totalLeadCount,
      designAssignments: campaign.designAssignments?.length || 0,
      scheduling: campaign.scheduling,
      payment: {
        paymentIntentId: campaign.paymentIntentId,
        paidAt: campaign.paidAt?.toDate?.(),
      },
      processing: {
        processingStartedAt: campaign.processingStartedAt?.toDate?.(),
        processingCompletedAt: campaign.processingCompletedAt?.toDate?.(),
        leadsSent: campaign.leadsSent,
        leadsFailed: campaign.leadsFailed,
        errors: campaign.processingErrors
      },
      readyToProcess: campaign.status === 'paid',
      instructions: {
        simulatePayment: `POST /api/v2/test-full-flow with { campaignId, action: "simulatePayment" }`,
        processNow: `POST /api/v2/test-full-flow with { campaignId, action: "processNow" }`
      }
    });
    
  } catch (error) {
    console.error('Test flow error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, action } = body;
    
    if (!campaignId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Campaign ID and action are required',
        validActions: ['simulatePayment', 'processNow']
      }, { status: 400 });
    }
    
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    
    if (!campaignSnap.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Campaign not found'
      }, { status: 404 });
    }
    
    const campaign = campaignSnap.data();
    
    switch (action) {
      case 'simulatePayment':
        // Simulate a successful payment
        if (campaign.status !== 'draft' && campaign.status !== 'designing' && campaign.status !== 'review') {
          return NextResponse.json({
            success: false,
            error: `Cannot simulate payment for campaign in status: ${campaign.status}`,
            currentStatus: campaign.status
          });
        }
        
        await updateDoc(campaignRef, {
          status: 'paid',
          paymentIntentId: `pi_test_${Date.now()}`,
          paidAt: new Date(),
          scheduledSendDate: new Date(), // ASAP
          estimatedDelivery: {
            start: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // +5 days
            end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)   // +10 days
          },
          updatedAt: new Date()
        });
        
        return NextResponse.json({
          success: true,
          message: 'Payment simulated successfully',
          newStatus: 'paid',
          nextStep: 'Call processNow action or wait for automatic processing'
        });
        
      case 'processNow':
        // Process the campaign immediately
        if (campaign.status !== 'paid' && campaign.status !== 'scheduled') {
          return NextResponse.json({
            success: false,
            error: `Cannot process campaign in status: ${campaign.status}`,
            currentStatus: campaign.status,
            hint: campaign.status === 'draft' ? 'First simulate payment' : undefined
          });
        }
        
        const result = await processPaidCampaign(campaignId, true); // Test mode
        
        return NextResponse.json({
          success: result.success,
          message: result.success 
            ? `Successfully processed ${result.processed} postcards in test mode`
            : 'Processing failed',
          processed: result.processed,
          failed: result.failed,
          errors: result.errors,
          stats: result.stats
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: `Invalid action: ${action}`,
          validActions: ['simulatePayment', 'processNow']
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Test flow error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 