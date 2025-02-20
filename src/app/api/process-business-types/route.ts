import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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
    const { businessTypes, location } = await req.json();
    console.log('Processing:', { businessTypes, location });

    // Ask LLM to help process the business types and determine map squares
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a search query specialist. Create optimized Google Maps search URLs."
        },
        {
          role: "user",
          content: `
I need to create Google Maps search URLs for the following business types in ${location}:
${businessTypes.map((type: BusinessType) => `${type.name} (${type.count} businesses)`).join('\n')}

For each business type:
1. Split the type if it contains multiple businesses (e.g., "Hotels and Hospitality" -> "hotels", "hospitality")
2. Create a Google Maps search URL for each business type
3. Return the results as JSON

Format:
{
  "searchQueries": [
    {
      "businessType": "original business type",
      "searchUrls": ["url1", "url2"]
    }
  ]
}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    const squares: MapSquare[] = JSON.parse(responseContent).searchQueries.map((query: { businessType: string; searchUrls: string[] }) => ({
      businessType: query.businessType,
      center: { lat: 0, lng: 0 },
      zoom: 10
    }));

    // Create Browse.ai tasks for each square
    const taskIds = [];
    for (const square of squares) {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(square.businessType)}/@${square.center.lat},${square.center.lng},${square.zoom}z`;
      
      console.log('Creating task for URL:', searchUrl); // Debug log

      const browseResponse = await fetch('https://api.browse.ai/v2/robots/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotId: process.env.BROWSE_AI_ROBOT_ID,
          inputParameters: {
            originUrl: searchUrl // Changed from url to originUrl based on docs
          }
        }),
      });

      const responseText = await browseResponse.text();
      console.log('Browse.ai response:', responseText); // Debug log

      if (!browseResponse.ok) {
        throw new Error(`Failed to create Browse.ai task: ${responseText}`);
      }

      const taskData = JSON.parse(responseText);
      taskIds.push(taskData.result.task.id);
    }

    return NextResponse.json({ 
      success: true, 
      squares,
      taskIds
    });
  } catch (error) {
    console.error('Error processing business types:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process business types'
    }, { status: 500 });
  }
} 