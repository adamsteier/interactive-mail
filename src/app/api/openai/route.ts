import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { targetArea, businessName, businessType, userLocation } = await req.json();

    const prompt = `I need to analyze a business and its target market:
      Business Name: ${businessName}
      Target Area: ${targetArea}
      Business Type: ${businessType}
      User Location: ${userLocation}

      Analyze this business and provide:
      1. The specific industry classification for this business
      2. A clear, factual description of what this business does (avoid words like "likely" or "probably")
      3. The primary customer types for this business
      4. A bounding box for ${targetArea} that would work well for Google Maps searches
         (provide coordinates that encompass the target area)

      Format your response as JSON:
      {
        "industry": "specific industry name",
        "description": "clear, factual description",
        "customerTypes": ["type1", "type2", "type3"],
        "boundingBox": {
          "southwest": { "lat": 53.4, "lng": -113.7 },
          "northeast": { "lat": 53.7, "lng": -113.2 }
        }
      }

      Example for Edmonton:
      "boundingBox": {
        "southwest": { "lat": 53.4, "lng": -113.7 },
        "northeast": { "lat": 53.7, "lng": -113.2 }
      }`;

    const completion = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "system",
          content: "You are a business analyst who specializes in industry classification and business analysis. Always respond in valid JSON format."
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