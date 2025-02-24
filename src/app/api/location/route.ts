import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET() {
  try {
    const headersList = await headers();
    
    // Get client IP from headers in order of reliability
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIP = headersList.get('x-real-ip');
    const cfIP = headersList.get('cf-connecting-ip');
    
    // Use the first available IP address
    const clientIP = forwardedFor?.split(',')[0] || realIP || cfIP || '';

    // If we have a client IP, use it in the API call
    const apiUrl = clientIP 
      ? `http://ip-api.com/json/${clientIP}`
      : 'http://ip-api.com/json/';

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'fail') {
      throw new Error('Location lookup failed');
    }

    return NextResponse.json({
      city: data.city || 'Unknown City',
      region: data.region || 'Unknown Region',
      country: data.country || 'Unknown Country'
    });
  } catch (error) {
    console.error('Location API error:', error);
    return NextResponse.json(
      { 
        city: 'Toronto',
        region: 'ON',
        country: 'Canada'
      }, 
      { status: 200 }
    );
  }
} 