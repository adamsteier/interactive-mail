import { NextRequest } from 'next/server';
import { type NextResponse } from 'next/server';

type Props = {
  params: {
    taskId: string;
  };
};

export async function GET(
  _request: NextRequest,
  props: Props
): Promise<NextResponse> {
  try {
    const { taskId } = props.params;
    
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
      const errorData = await response.json().catch(() => ({}));
      console.error('Browse.ai API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return Response.json(
        { error: 'Failed to fetch task status' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Browse.ai task status error:', error);
    return Response.json(
      { error: 'Failed to fetch task status' },
      { status: 500 }
    );
  }
} 