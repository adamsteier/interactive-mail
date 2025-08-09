import { NextRequest, NextResponse } from 'next/server';
import { notifyRefundRequest } from '@/v2/services/emailNotificationService';

export async function POST(request: NextRequest) {
  try {
    const { 
      campaignId, 
      userEmail, 
      originalAmount, 
      refundAmount, 
      reason, 
      affectedLeads, 
      totalLeads 
    } = await request.json();

    if (!campaignId || !userEmail || !originalAmount || !refundAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Queue refund notification
    await notifyRefundRequest(
      campaignId,
      userEmail,
      originalAmount,
      refundAmount,
      reason || 'Refund requested',
      affectedLeads || 0,
      totalLeads || 0
    );

    return NextResponse.json({
      success: true,
      message: 'Refund request queued successfully'
    });

  } catch (error) {
    console.error('Error processing refund request:', error);
    return NextResponse.json(
      { error: 'Failed to queue refund request' },
      { status: 500 }
    );
  }
}
