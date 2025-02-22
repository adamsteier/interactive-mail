import { NextResponse } from 'next/server';

interface SearchParams {
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
  keyword: string;
}

interface PlaceSearchResult {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  // Add other fields as needed
}

interface PlaceSearchResponse {
  results: PlaceSearchResult[];
  status: string;
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  rating?: number;
  user_ratings_total?: number;
  business_status: string;
  types: string[];
}

interface PlaceDetailsResponse {
  result: PlaceDetails;
  status: string;
}

export async function POST(request: Request) {
  try {
    const { location, radius, keyword } = await request.json() as SearchParams;
    
    // Build the Places API URL using keyword instead of type
    const baseUrl = 'https://maps.googleapis.com/maps/api/place';
    const searchUrl = `${baseUrl}/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(searchUrl);
    const data = await response.json() as PlaceSearchResponse;

    // Get details for each place
    const detailedPlaces = await Promise.all(
      data.results.map(async (place: PlaceSearchResult) => {
        const detailsUrl = `${baseUrl}/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,business_status,types&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json() as PlaceDetailsResponse;
        return detailsData.result;
      })
    );

    return NextResponse.json({ places: detailedPlaces });
  } catch (error) {
    console.error('Google Places API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
} 