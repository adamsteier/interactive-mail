import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const response = await fetch(`https://api.browse.ai/v2/tasks/${params.taskId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error('Failed to fetch task status');
    }

    // Transform Browse.ai data into our format
    const results = data.capturedLists?.businesses?.map((business: any) => ({
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