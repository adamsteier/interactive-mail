import { NextRequest, NextResponse } from 'next/server';
import { updateMailpieceStatus } from '@/v2/services/stannpService';

// Webhook event types from Stannp
interface StannpWebhookEvent {
  id: string;
  type: string; // 'postcard.printed', 'postcard.dispatched', etc.
  data: {
    mailpiece_id: string;
    status: string;
    timestamp: string;
    tracking_url?: string;
    [key: string]: unknown;
  };
}

// Map Stannp webhook event types to our internal status
const EVENT_STATUS_MAP: Record<string, string> = {
  'postcard.created': 'submitted',
  'postcard.rendered': 'pending',
  'postcard.printed': 'printed',
  'postcard.dispatched': 'dispatched',
  'postcard.delivered': 'delivered',
  'postcard.returned': 'returned',
  'postcard.failed': 'failed',
  'postcard.cancelled': 'failed'
};

export async function POST(req: NextRequest) {
  try {
    // Verify webhook authenticity (if Stannp provides a signature)
    const signature = req.headers.get('x-stannp-signature');
    if (signature && process.env.STANNP_WEBHOOK_SECRET) {
      // TODO: Implement signature verification when Stannp provides documentation
      // const isValid = verifyStannpSignature(signature, await req.text(), process.env.STANNP_WEBHOOK_SECRET);
      // if (!isValid) {
      //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      // }
    }
    
    // Parse webhook payload
    const event: StannpWebhookEvent = await req.json();
    
    console.log('Received Stannp webhook:', {
      type: event.type,
      mailpieceId: event.data.mailpiece_id,
      status: event.data.status
    });
    
    // Map event type to our internal status
    const newStatus = EVENT_STATUS_MAP[event.type];
    if (!newStatus) {
      console.warn('Unknown Stannp event type:', event.type);
      return NextResponse.json({ 
        success: true, 
        message: 'Event type not handled' 
      });
    }
    
    // Update mailpiece status in our database
    const result = await updateMailpieceStatus(
      event.data.mailpiece_id,
      newStatus,
      event.data
    );
    
    if (!result.success) {
      console.error('Failed to update mailpiece status:', result.error);
      return NextResponse.json(
        { error: 'Failed to update status', details: result.error },
        { status: 500 }
      );
    }
    
    // Log successful processing
    console.log('Successfully processed Stannp webhook:', {
      mailpieceId: event.data.mailpiece_id,
      oldStatus: event.data.status,
      newStatus: newStatus
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Webhook processed successfully'
    });
    
  } catch (error) {
    console.error('Stannp webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for webhook verification (some services require this)
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get('challenge');
  
  if (challenge) {
    // Echo back the challenge for webhook verification
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  return NextResponse.json({
    status: 'ok',
    webhook: 'stannp',
    message: 'Webhook endpoint is active'
  });
} 