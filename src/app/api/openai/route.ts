import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function searchBusiness(businessName: string, targetArea: string, userLocation: string) {
  const searchQuery = `${businessName} ${targetArea}`;
  
  try {
    const response = await fetch('https://api.4o.nl/search/v0', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FOURO_API_KEY}`,
      },
      body: JSON.stringify({
        query: searchQuery,
        filters: {
          // First try exact location
          location: targetArea,
          // Then try user's location as fallback
          fallbackLocation: userLocation,
        },
        limit: 5,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch from 4o');
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('4o search error:', error);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { targetArea, businessName, businessType, userLocation } = await req.json();

    // First, try to find the business using 4o
    const searchResults = await searchBusiness(businessName, targetArea, userLocation);

    if (searchResults && searchResults.length > 0) {
      // Found matching business(es)
      const bestMatch = searchResults[0];
      return NextResponse.json({
        analysis: {
          industry: bestMatch.industry,
          description: bestMatch.description,
          customerTypes: bestMatch.customerTypes || [],
        },
        searchResults,
        source: '4o'
      });
    }

    // If no results found, fall back to OpenAI for analysis
    const prompt = `I need to analyze a business and its target market:
      Business Name: ${businessName}
      Target Area: ${targetArea}
      Business Type: ${businessType}
      User Location: ${userLocation}

      Analyze this business and provide:
      1. The specific industry classification for this business
      2. A clear, factual description of what this business does (avoid words like "likely" or "probably")
      3. The primary customer types for this business

      Format your response as JSON:
      {
        "industry": "specific industry name",
        "description": "clear, factual description",
        "customerTypes": ["type1", "type2", "type3"]
      }`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
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
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    const analysis = JSON.parse(responseContent);

    return NextResponse.json({ 
      analysis,
      searchResults: [],
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