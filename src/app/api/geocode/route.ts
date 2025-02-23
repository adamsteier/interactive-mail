import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { targetArea } = await req.json();
    
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.append('address', targetArea);
    url.searchParams.append('components', 'country:CA');
    url.searchParams.append('key', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');

    console.log('Making geocoding request:', {
      targetArea,
      hasKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    });

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Geocoding API Error:', data);
      throw new Error(`Geocoding API Error: ${data.status}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Failed to geocode location' },
      { status: 500 }
    );
  }
} 