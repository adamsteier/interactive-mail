import { NextRequest, NextResponse } from 'next/server';
import { processPostcardForPrint } from '@/v2/services/imageProcessingService';
import { V2Brand } from '@/v2/types/brand';
import { Timestamp } from 'firebase/firestore';

// Mock brand for testing
const createMockBrand = (): V2Brand => ({
  id: 'test-brand-' + Date.now(),
  name: 'Test Brand',
  businessInfo: {
    type: 'restaurant',
  },
  logo: {
    variants: [{
      type: 'png',
      // Using a placeholder logo for testing
      url: 'https://via.placeholder.com/300x200/00F0FF/FFFFFF?text=TEST+LOGO',
      size: {
        width: 300,
        height: 200,
        fileSize: 50000
      },
      purpose: 'original',
      createdAt: Timestamp.now()
    }],
    hasTransparentBackground: false
  },
  identity: {
    voice: 'professional',
    keywords: []
  },
  socialMedia: {},
  settings: {
    isDefault: true,
    allowPublicTemplates: false,
    autoColorExtraction: true
  },
  usage: {
    totalCampaigns: 0,
    totalLeads: 0,
    totalSpent: 0
  },
  validation: {
    isComplete: true,
    missingFields: [],
    warnings: [],
    score: 100
  },
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  ownerUid: 'test-user',
  version: 1
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, campaignId = 'test-campaign', designId = 'test-design' } = body;
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }
    
    console.log('Testing image processing with:', { imageUrl, campaignId, designId });
    
    // Create mock brand
    const mockBrand = createMockBrand();
    
    // Process the image
    const result = await processPostcardForPrint(
      imageUrl,
      mockBrand,
      campaignId,
      designId
    );
    
    return NextResponse.json({
      success: true,
      result: {
        frontImageUrl: result.front.url,
        dimensions: {
          width: result.front.width,
          height: result.front.height
        },
        fileSize: result.front.size,
        processingTime: result.processingTime,
        message: 'Image successfully processed for print!'
      }
    });
    
  } catch (error) {
    console.error('Image processing test error:', error);
    return NextResponse.json(
      { 
        error: 'Image processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing with a default image
export async function GET() {
  try {
    // Use a placeholder image that simulates AI output dimensions
    const testImageUrl = 'https://via.placeholder.com/1800x1200/FF00B8/FFFFFF?text=AI+Generated+Postcard';
    
    const mockBrand = createMockBrand();
    
    const result = await processPostcardForPrint(
      testImageUrl,
      mockBrand,
      'test-campaign-' + Date.now(),
      'test-design-' + Date.now()
    );
    
    return NextResponse.json({
      success: true,
      message: 'Image processing test completed!',
      test: {
        inputImage: testImageUrl,
        inputDimensions: '1800x1200',
        outputDimensions: '1871x1271',
        logoOverlaid: true
      },
      result: {
        frontImageUrl: result.front.url,
        dimensions: {
          width: result.front.width,
          height: result.front.height
        },
        fileSize: `${(result.front.size / 1024).toFixed(2)} KB`,
        processingTime: `${result.processingTime}ms`
      }
    });
    
  } catch (error) {
    console.error('Image processing test error:', error);
    return NextResponse.json(
      { 
        error: 'Image processing test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 