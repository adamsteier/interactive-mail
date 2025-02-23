import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { targetArea, businessName, businessType, userLocation, geocodeResult } = await req.json();

    // Extract bounding box from geocode result, preferring bounds over viewport
    const boundingBox = geocodeResult.geometry.bounds || geocodeResult.geometry.viewport;

    const prompt = `I need to analyze a business and its target market:
      Business Name: ${businessName}
      Target Area: ${targetArea}
      Business Type: ${businessType}
      User Location: ${userLocation}
      Geocoded Address: ${geocodeResult.formatted_address}
      
      Google Maps provided this bounding box for the area:
      {
        "northeast": { "lat": ${boundingBox.northeast.lat}, "lng": ${boundingBox.northeast.lng} },
        "southwest": { "lat": ${boundingBox.southwest.lat}, "lng": ${boundingBox.southwest.lng} }
      }

      Analyze this business and provide:
      1. The specific industry classification for this business
      2. A clear, factual description of what this business does (avoid words like "likely" or "probably")
      3. The primary customer types for this business
      4. A bounding box for the target area that would work well for Google Maps searches.
         Use the provided Google Maps bounding box as a starting point, but adjust it if needed.
         For example, if the user specified "North ${geocodeResult.formatted_address}", 
         modify the bounding box to only cover the northern portion.

      Format your response as JSON:
      {
        "industry": "specific industry name",
        "description": "clear, factual description",
        "customerTypes": ["type1", "type2", "type3"],
        "boundingBox": {
          "southwest": { "lat": number, "lng": number },
          "northeast": { "lat": number, "lng": number }
        }
      }`;

    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content: "You are a business analyst who specializes in industry classification and business analysis. Always respond in valid JSON format. When adjusting bounding boxes, ensure they logically match the user's target area description (e.g., 'North Edmonton' should only cover the northern portion of Edmonton's bounding box)."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    const analysis = JSON.parse(responseContent);

    return NextResponse.json({ 
      analysis,
      source: 'openai'
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 