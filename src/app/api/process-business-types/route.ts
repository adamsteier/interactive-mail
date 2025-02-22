import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { calculateSearchGrid } from '@/utils/gridCalculator';

interface BusinessType {
  name: string;
  count: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MapSquare {
  center: { lat: number; lng: number };
  zoom: number;
  businessType: string;
}

export async function POST(req: Request) {
  try {
    const { businessTypes, location, boundingBox } = await req.json();
    
    const searchQueries: Array<{ businessType: string; searchUrls: string[] }> = [];
    
    for (const business of businessTypes) {
      // Calculate grid cells for this business type
      const cells = calculateSearchGrid(boundingBox, business.count);
      
      // Create search URLs for each cell
      const searchUrls = cells.map(cell => 
        `https://www.google.com/maps/search/${encodeURIComponent(business.name)}/@${cell.center.lat},${cell.center.lng},${cell.zoom}z`
      );
      
      searchQueries.push({
        businessType: business.name,
        searchUrls
      });
    }

    return NextResponse.json({ 
      success: true,
      searchQueries
    });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process business types'
    }, { status: 500 });
  }
} 