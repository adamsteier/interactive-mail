import { NextResponse } from 'next/server';
import { GooglePlacesService } from '@/services/googlePlaces';

// Define a custom error type
interface PlacesApiError extends Error {
  status?: number;
  code?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('API request received:', body);

    const { lat, lng, radius, keyword } = body;

    if (!lat || !lng || !radius || !keyword) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const placesService = new GooglePlacesService();
    const places = await placesService.searchPlaces({
      location: { lat, lng },
      radius,
      keyword
    });

    console.log('Places found:', {
      keyword,
      location: { lat, lng },
      count: places.length
    });

    return NextResponse.json({ places });
  } catch (error: unknown) {
    // Type guard for our custom error
    const apiError = error as PlacesApiError;
    console.error('API error:', apiError);
    
    return NextResponse.json(
      { error: apiError.message || 'Failed to fetch places' },
      { status: 500 }
    );
  }
} 