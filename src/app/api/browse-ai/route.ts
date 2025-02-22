import { NextRequest } from 'next/server';
import { type NextResponse } from 'next/server';

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const body = await request.json();

    const response = await fetch(
      `https://api.browse.ai/v2/robots/${process.env.BROWSE_AI_ROBOT_ID}/tasks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
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
        { error: `Failed to create Browse.ai task: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Browse.ai error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to create Browse.ai task' },
      { status: 500 }
    );
  }
} 