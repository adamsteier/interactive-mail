import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('Creating Browse AI task with body:', body);

    // Restructure the request body to match Browse AI's expected format
    const browseAiBody = {
      variables: {
        originUrl: body.inputParameters.originUrl
      }
    };

    const response = await fetch(`https://api.browse.ai/v2/robots/${process.env.BROWSE_AI_ROBOT_ID}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(browseAiBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Browse.ai API error:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(`Failed to create Browse.ai task: ${response.statusText}`);
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error('Browse.ai error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Browse.ai task' },
      { status: 500 }
    );
  }
} 