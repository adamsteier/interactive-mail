import { NextRequest, NextResponse } from 'next/server';
import { 
  createPostcard, 
  getPostcardStatus, 
  formatRecipient 
} from '@/v2/services/stannpService';

// Test lead data
const TEST_LEAD = {
  id: 'test-lead-123',
  businessName: 'Test Coffee Shop',
  firstName: 'John',
  lastName: 'Doe',
  address: '123 Test Street',
  city: 'Toronto',
  postalCode: 'M5V 3A9',
  country: 'CA'
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      frontImageUrl, 
      backImageUrl,
      testMode = true // Default to test mode for safety
    } = body;
    
    if (!frontImageUrl) {
      return NextResponse.json(
        { error: 'Front image URL is required' },
        { status: 400 }
      );
    }
    
    console.log('Testing Stannp integration with:', { 
      frontImageUrl, 
      backImageUrl,
      testMode 
    });
    
    // Format recipient
    const recipient = formatRecipient(TEST_LEAD);
    
    // Send postcard via Stannp
    const result = await createPostcard({
      test: testMode,
      size: 'A6', // 6x4 inches
      front: frontImageUrl,
      back: backImageUrl,
      recipient,
      tags: 'test-campaign-' + Date.now()
    });
    
    const { success, data, error } = result;

    if (!success || !data) {
      return NextResponse.json(
        {
          error: 'Stannp API call failed',
          details: error || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Get status to verify it was created
    const statusResult = await getPostcardStatus(data.id);
    
    return NextResponse.json({
      success: true,
      message: testMode ? 'Test postcard created successfully!' : 'Live postcard sent!',
      postcard: {
        id: data.id,
        status: data.status,
        cost: data.cost,
        format: data.format,
        created: data.created,
        pdf: data.pdf
      },
      statusCheck: statusResult.success ? statusResult.data : null,
      recipient,
      testMode
    });
    
  } catch (error) {
    console.error('Stannp test error:', error);
    return NextResponse.json(
      { 
        error: 'Stannp test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing with placeholder images
export async function GET() {
  try {
    // Use placeholder images for testing
    const frontUrl = 'https://via.placeholder.com/1871x1271/FF00B8/FFFFFF?text=Test+Postcard+Front';
    const backUrl = 'https://via.placeholder.com/1871x1271/00F0FF/FFFFFF?text=Test+Postcard+Back';
    
    const recipient = formatRecipient(TEST_LEAD);
    
    // Create test postcard
    const result = await createPostcard({
      test: true, // Always use test mode for GET
      size: 'A6',
      front: frontUrl,
      back: backUrl,
      recipient,
      tags: 'test-' + Date.now()
    });
    
    const { success, data, error } = result;

    if (!success || !data) {
      return NextResponse.json(
        {
          error: 'Stannp test failed',
          details: error || 'Unknown error',
          apiKeyConfigured: !!process.env.STANNP_API_KEY
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Stannp integration test successful!',
      test: {
        frontImage: frontUrl,
        backImage: backUrl,
        recipient,
        mode: 'TEST MODE'
      },
      result: {
        postcardId: data.id,
        status: data.status,
        cost: data.cost + ' (test mode - no charge)',
        pdfPreview: data.pdf,
        created: data.created
      },
      next_steps: [
        '1. Check the PDF preview URL to see the rendered postcard',
        '2. Use POST with your processed images to test with real designs',
        '3. Set testMode: false to send real postcards (charges apply)',
        '4. Configure webhook URL in Stannp dashboard: ' + process.env.NEXT_PUBLIC_APP_URL + '/api/webhooks/stannp'
      ]
    });
    
  } catch (error) {
    console.error('Stannp test error:', error);
    return NextResponse.json(
      { 
        error: 'Stannp test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        apiKeyConfigured: !!process.env.STANNP_API_KEY,
        hint: 'Make sure STANNP_API_KEY is set in environment variables'
      },
      { status: 500 }
    );
  }
} 