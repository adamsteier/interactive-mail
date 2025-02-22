import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('http://ip-api.com/json/');
    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
  }
} 