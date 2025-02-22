import { NextResponse } from 'next/server';

interface SearchParams {
  location: {
    lat: number;
    lng: number;
  };
  radius: number;
  type: string;
}

export async function POST(request: Request) {
  try {
    const { location, radius, type } = await request.json() as SearchParams;
    
    // Build the Places API URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/place';
    const searchUrl = `${baseUrl}/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=${type}&key=${process.env.GOOGLE_PLACES_API_KEY}`;

    const response = await fetch(searchUrl);
    const data = await response.json();

    // Get details for each place
    const detailedPlaces = await Promise.all(
      data.results.map(async (place: any) => {
        const detailsUrl = `${baseUrl}/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,business_status,types&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();
        return detailsData.result;
      })
    );

    return NextResponse.json({ places: detailedPlaces });
  } catch (error) {
    console.error('Google Places API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
} 