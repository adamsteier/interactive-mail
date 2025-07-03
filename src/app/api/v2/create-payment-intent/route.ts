import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Parse the request body
    const { campaignId, amount, scheduledSendDate } = await request.json();

    if (!campaignId || !amount || !scheduledSendDate) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, amount, scheduledSendDate' },
        { status: 400 }
      );
    }

    // Validate amount (should be in cents and reasonable)
    if (typeof amount !== 'number' || amount < 50 || amount > 100000) {
      return NextResponse.json(
        { error: 'Invalid amount. Must be between $0.50 and $1,000.00' },
        { status: 400 }
      );
    }

    // Verify campaign ownership
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignData = campaignDoc.data();
    if (campaignData?.ownerUid !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to access this campaign' },
        { status: 403 }
      );
    }

    // Create the Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'cad', // Updated to match Stripe account currency
      metadata: {
        campaignId: campaignId,
        userId: userId,
        scheduledSendDate: scheduledSendDate,
        leadCount: campaignData.totalLeadCount?.toString() || '0',
      },
      description: `Postcard campaign for ${campaignData.totalLeadCount || 0} recipients`,
      receipt_email: decodedToken.email || undefined,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    if (error instanceof Error) {
      // Firebase auth errors
      if (error.message.includes('ID token')) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      
      // Stripe errors
      if (error.message.includes('stripe') || error.message.includes('Stripe')) {
        return NextResponse.json(
          { error: 'Payment processing error. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 