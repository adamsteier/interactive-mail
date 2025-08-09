import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { campaignId, status } = await request.json();

    if (!campaignId || !status) {
      return NextResponse.json(
        { error: 'Campaign ID and status are required' },
        { status: 400 }
      );
    }

    // Valid status options
    const validStatuses = ['paid', 'processing', 'sent', 'failed', 'scheduled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status provided' },
        { status: 400 }
      );
    }

    // Update campaign status
    await updateDoc(doc(db, 'campaigns', campaignId), {
      status,
      forceStatusAt: Timestamp.now(),
      forceStatusBy: 'admin'
    });

    return NextResponse.json({
      success: true,
      message: `Campaign status updated to ${status}`
    });

  } catch (error) {
    console.error('Error updating campaign status:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign status' },
      { status: 500 }
    );
  }
}
