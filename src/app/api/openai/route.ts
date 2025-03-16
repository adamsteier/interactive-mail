import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define an interface for OpenAI API errors
interface OpenAIError extends Error {
  code?: string;
  response?: {
    status?: number;
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

export async function POST(req: Request) {
  try {
    const { targetArea, businessName, businessType, userLocation, geocodeResult } = await req.json();

    // Extract bounding box from geocode result, preferring bounds over viewport
    const boundingBox = geocodeResult.geometry.bounds || geocodeResult.geometry.viewport;

    // Use the web search capabilities for better results
    // Note: The Responses API is still in preview at the time of writing
    // If your OpenAI library version doesn't support it, you'll need to update
    try {
      console.log('🔍 Attempting to use Web Search with Responses API...');
      
      // Define types for address components
      interface AddressComponent {
        long_name: string;
        short_name: string;
        types: string[];
      }

      // Extract location data for geographically relevant search
      const country = geocodeResult.address_components.find(
        (c: AddressComponent) => c.types.includes("country")
      )?.short_name || "US";
      
      const city = geocodeResult.address_components.find(
        (c: AddressComponent) => c.types.includes("locality")
      )?.long_name || userLocation;
      
      const region = geocodeResult.address_components.find(
        (c: AddressComponent) => c.types.includes("administrative_area_level_1")
      )?.long_name || "";

      console.log(`🌐 Searching for: ${businessName} in ${targetArea}`);
      console.log(`📍 Location context: ${city}, ${region}, ${country}`);

      // Use the Responses API with web search capabilities
      // @ts-expect-error - Responses API may not yet be in the type definitions
      const response = await openai.responses.create({
        model: "gpt-4o",
        tools: [{ 
          type: "web_search_preview",
          search_context_size: "high", // Use high context size for better results
          user_location: {
            type: "approximate",
            country,
            city,
            region
          }
        }],
        input: `I need detailed, current information about this business to perform an analysis:
          Business Name: ${businessName}
          Target Area: ${targetArea}
          Location: ${geocodeResult.formatted_address}
          
          Search the web to find information about this business. Look for:
          - The specific industry/category this business belongs to
          - What products or services they offer
          - Their official business description from their website, LinkedIn, or Google Business Profile
          - Information about their target customers or client base
          - Their address and service area
          
          If you can't find specific information about this exact business, provide general information about similar businesses with this name or in this industry in the specified area.
        `
      });

      console.log('✅ Web search completed successfully!');
      if (response.output_annotations && response.output_annotations.length > 0) {
        console.log(`🔗 Found ${response.output_annotations.length} web sources`);
      }

      // Get the web search results from the response
      const webResults = response.output_text;

      // Now use the standard ChatGPT API to process these results and return the formatted JSON we need
      const prompt = `I've gathered the following information about this business:
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

        Web search results about the business:
        ${webResults}

        Using this information, analyze this business and provide:
        1. The specific industry classification for this business (be very specific based on the web results)
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
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a business analyst who specializes in industry classification and business analysis. Always respond in valid JSON format. Use the web search results to provide accurate information. When adjusting bounding boxes, ensure they logically match the user's target area description (e.g., 'North Edmonton' should only cover the northern portion of Edmonton's bounding box)."
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

      // Add web search sources to the response
      return NextResponse.json({ 
        analysis,
        source: 'openai',
        webSearched: true,
        // This allows the front end to display the sources if desired
        webResults: {
          text: response.output_text,
          annotations: response.output_annotations
        }
      });
    } catch (error) {
      const webSearchError = error as OpenAIError;
      console.error('⚠️ WEB SEARCH FAILED - USING FALLBACK METHOD ⚠️');
      console.error('Error details:', webSearchError.message);
      console.error('Error name:', webSearchError.name);
      console.error('Error code:', webSearchError.code);
      
      if (webSearchError.response) {
        console.error('OpenAI response status:', webSearchError.response.status);
        console.error('OpenAI error message:', webSearchError.response.data?.error?.message);
      }
      
      console.log('🔄 Switching to fallback method (no web search)');
      // Continue to fallback approach
    }
    
    // Fallback approach if web search fails or is not available
    console.log('🚨 USING FALLBACK METHOD - No web search, using standard completion');
    
    const fallbackPrompt = `I need to analyze a business and its target market:
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

    const fallbackCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a business analyst who specializes in industry classification and business analysis. Always respond in valid JSON format. When adjusting bounding boxes, ensure they logically match the user's target area description (e.g., 'North Edmonton' should only cover the northern portion of Edmonton's bounding box)."
        },
        {
          role: "user",
          content: fallbackPrompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const fallbackContent = fallbackCompletion.choices[0].message.content;
    if (!fallbackContent) {
      throw new Error('No response content from OpenAI');
    }

    const fallbackAnalysis = JSON.parse(fallbackContent);

    console.log('⚠️ NOTE: Analysis was performed WITHOUT web search data');
    console.log('📊 Generated analysis using only the business name and location');

    return NextResponse.json({ 
      analysis: fallbackAnalysis,
      source: 'openai',
      webSearched: false
    });
    
  } catch (error) {
    console.error('❌ API FATAL ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 