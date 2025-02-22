import { NextResponse } from 'next/server';

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
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface PlaceSearchResponse {
  results: PlaceSearchResult[];
  status: string;
  next_page_token?: string;
}

export async function POST(req: Request) {
  try {
    const { location, radius, keyword } = await req.json();
    
    // First page
    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    let allPlaces: PlaceSearchResult[] = [];
    let nextPageToken: string | undefined;
    
    do {
      const response = await fetch(url);
      const data = await response.json() as PlaceSearchResponse;
      
      if (data.results) {
        allPlaces = [...allPlaces, ...data.results];
      }
      
      nextPageToken = data.next_page_token;
      if (nextPageToken) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      }
    } while (nextPageToken);

    return NextResponse.json({ places: allPlaces });
  } catch (error) {
    console.error('Google Places API error:', error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
} 