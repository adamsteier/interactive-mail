import { NextResponse } from 'next/server';
import { GooglePlacesService } from '@/services/googlePlaces';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Google Places API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch places' },
      { status: 500 }
    );
  }
} 