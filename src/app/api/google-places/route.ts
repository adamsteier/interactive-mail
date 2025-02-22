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

interface ScoredPlaceDetails extends PlaceDetails {
  relevanceScore: number;
}

function scoreRelevance(place: PlaceSearchResult, keyword: string): number {
  let score = 0;
  const keywordLower = keyword.toLowerCase();
  const nameLower = place.name.toLowerCase();
  const words = keywordLower.split(' ');
  
  // Exact name match is best
  if (nameLower === keywordLower) score += 10;
  
  // Partial name matches
  if (nameLower.includes(keywordLower)) score += 7;
  words.forEach(word => {
    if (nameLower.includes(word)) score += 3;
  });
  
  // Type matches
  if (place.types.some(t => t.includes(keywordLower))) score += 5;
  words.forEach(word => {
    if (place.types.some(t => t.includes(word))) score += 2;
  });

  // Penalize very generic results
  if (!nameLower.includes(keywordLower) && 
      !place.types.some(t => t.includes(keywordLower))) {
    score -= 3;
  }

  return score;
}

async function getAllPlaces(initialUrl: string, keyword: string): Promise<ScoredPlaceDetails[]> {
  let allResults: PlaceSearchResult[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 3;
  const minimumScore = 5; // Require decent relevance

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
    
    const scoredResults = data.results.map(place => ({
      ...place,
      relevanceScore: scoreRelevance(place, keyword)
    }));

    // Stop if results become too irrelevant
    if (scoredResults.every(p => p.relevanceScore < minimumScore)) {
      console.log('Stopping due to low relevance');
      break;
    }

    allResults = [...allResults, ...scoredResults];
    nextPageToken = data.next_page_token;
    pageCount++;

  } while (nextPageToken && pageCount < maxPages);

  // Filter and sort by relevance
  return allResults
    .filter(place => place.relevanceScore >= minimumScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function POST(request: Request) {
  try {
    const { location, radius, keyword } = await request.json() as SearchParams;
    
    const baseUrl = 'https://maps.googleapis.com/maps/api/place';
    const searchUrl = `${baseUrl}/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

    const allResults = await getAllPlaces(searchUrl, keyword);
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