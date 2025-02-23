import { NextResponse } from 'next/server';
import { GooglePlacesService } from '@/services/googlePlaces';

interface PlaceSearchResult {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  vicinity?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface PlaceSearchResponse {
  results: PlaceSearchResult[];
  status: string;
  next_page_token?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lat, lng, radius, type, keyword } = body;

    if (!lat || !lng || !radius || !type) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const placesService = new GooglePlacesService();
    const places = await placesService.searchPlaces({
      location: { lat, lng },
      radius,
      type,
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