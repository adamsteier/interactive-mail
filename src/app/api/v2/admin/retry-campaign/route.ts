import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { processPaidCampaign } from '@/v2/services/campaignProcessingService';

export async function POST(request: NextRequest) {
  try {
    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // Update status to processing
    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: 'processing',
      retryAttempt: new Date().getTime(), // Use timestamp for retry tracking
      lastRetryAt: Timestamp.now()
    });

    // Call processing service
    const result = await processPaidCampaign(campaignId);

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('Error retrying campaign:', error);
    return NextResponse.json(
      { error: 'Failed to retry campaign processing' },
      { status: 500 }
    );
  }
}
