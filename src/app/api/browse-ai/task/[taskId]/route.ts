import { NextResponse, NextRequest } from 'next/server';

type Params = Promise<{ taskId: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    
    const response = await fetch(
      `https://api.browse.ai/v2/robots/${process.env.BROWSE_AI_ROBOT_ID}/tasks/${taskId}`, 
      {
        headers: {
          'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch task status');
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Browse.ai task status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task status' },
      { status: 500 }
    );
  }
} 