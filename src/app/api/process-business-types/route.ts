import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MapSquare {
  center: { lat: number; lng: number };
  zoom: number;
  businessType: string;
}

export async function POST(request: Request) {
  try {
    const { businessTypes, location } = await request.json();
    console.log('Processing:', { businessTypes, location });

    // Ask LLM to help process the business types and determine map squares
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "user",
        content: `
          I need to create Google Maps search URLs for the following business types in ${location}:
          ${businessTypes.map(type => `${type.name} (${type.count} businesses)`).join('\n')}

          For each business type:
          1. Split the type if it contains multiple businesses (e.g., "Hotels and Hospitality" -> "hotels", "hospitality")
          2. If count > 50, split into multiple map squares with appropriate zoom levels
          3. Return center coordinates and zoom level for each square

          Format the response as JSON with this structure:
          {
            "squares": [
              {
                "businessType": "string",
                "center": { "lat": number, "lng": number },
                "zoom": number
              }
            ]
          }
        `
      }]
    });

    const squares: MapSquare[] = JSON.parse(completion.choices[0].message?.content || '{}').squares;

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