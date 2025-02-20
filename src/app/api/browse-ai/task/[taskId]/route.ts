import { NextRequest, NextResponse } from 'next/server';

interface BrowseAIBusiness {
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: string;
  reviews: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;
    const response = await fetch(`https://api.browse.ai/v2/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to fetch task status');
    }

    // Transform Browse.ai data into our format
    const results = data.capturedLists?.businesses?.map((business: BrowseAIBusiness) => ({
      name: business.name,
      address: business.address,
      phone: business.phone,
      website: business.website,
      rating: business.rating,
      reviews: business.reviews
    })) || [];

    return NextResponse.json({
      status: data.status,
      results
    });

  } catch (error) {
    console.error('Error fetching task status:', error);
    return NextResponse.json({ 
      status: 'error',
      error: 'Failed to fetch task status'
    }, { status: 500 });
  }
} 