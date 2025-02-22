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
  next_page_token?: string;
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

async function getAllPlaces(initialUrl: string): Promise<PlaceSearchResult[]> {
  let allResults: PlaceSearchResult[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 3; // Maximum 3 pages (up to 60 results)

  do {
    const url = nextPageToken 
      ? `${initialUrl}&pagetoken=${nextPageToken}`
      : initialUrl;
    
    // Google requires a short delay before using a pagetoken
    if (nextPageToken) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const response = await fetch(url);
    const data = await response.json() as PlaceSearchResponse;
    
    allResults = [...allResults, ...data.results];
    nextPageToken = data.next_page_token;
    pageCount++;

  } while (nextPageToken && pageCount < maxPages);

  return allResults;
}

export async function POST(request: Request) {
  try {
    const { location, radius, keyword } = await request.json() as SearchParams;
    
    const baseUrl = 'https://maps.googleapis.com/maps/api/place';
    const searchUrl = `${baseUrl}/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

    const allResults = await getAllPlaces(searchUrl);
    console.log(`Found ${allResults.length} total results for "${keyword}"`);

    // Get details for each place
    const detailedPlaces = await Promise.all(
      allResults.map(async (place) => {
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