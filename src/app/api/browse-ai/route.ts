import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const response = await fetch(`https://api.browse.ai/v2/robots/${process.env.BROWSE_AI_ROBOT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('Failed to create Browse.ai task');
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Browse.ai error:', error);
    return NextResponse.json(
      { error: 'Failed to create Browse.ai task' },
      { status: 500 }
    );
  }
} 