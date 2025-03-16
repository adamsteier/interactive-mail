import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GenerateImagesRequest {
  prompt: string;
  numImages?: number;
}

// Custom interface for extended generation config that includes responseModalities
interface ExtendedGenerationConfig {
  responseModalities?: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as GenerateImagesRequest;
    const prompt = data.prompt;
    const numImages = data.numImages || 3;
    
    // Initialize the Gemini API client
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        images: [],
        error: 'Google AI API key not configured'
      }, { status: 500 });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Array to store image data
    const imageUrls: string[] = [];
    
    // Generate multiple images
    for (let i = 0; i < numImages; i++) {
      try {
        // Create a very explicit image generation prompt
        const adjustedPrompt = i === 0 
          ? `Create a detailed image of: ${prompt}. This should be a high-quality, detailed image that would work well as a postcard background.`
          : `Create a detailed image of: ${prompt} (Variation ${i+1}: Make this slightly different while keeping the same style). This should be a high-quality, detailed image that would work well as a postcard background.`;
        
        // Get the model with experimental features
        const model = genAI.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
          // Use our extended config type to properly type the responseModalities
          generationConfig: {
            // The TypeScript definitions may not be up to date with the API
            responseModalities: ["Image", "Text"] 
          } as ExtendedGenerationConfig
        });
        
        console.log('Sending prompt to Gemini:', adjustedPrompt);
        
        // Generate content with the custom prompt
        const result = await model.generateContent(adjustedPrompt);
        const response = result.response;
        
        // Process response to extract images
        if (response.candidates && response.candidates[0]?.content?.parts) {
          console.log('Got response with parts:', response.candidates[0].content.parts.length);
          
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              console.log('Found inline data with mimeType:', part.inlineData.mimeType);
              
              // Add the base64 data URL to our collection
              const mimeType = part.inlineData.mimeType || 'image/jpeg';
              const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              imageUrls.push(dataUrl);
              break; // Just get one image per request
            }
          }
        } else {
          console.log('No candidates or parts found in response');
        }
      } catch (err) {
        console.error(`Error generating image ${i+1}:`, err);
        console.error('Error details:', err instanceof Error ? err.message : err);
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < numImages - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Fallback to placeholder images if generation fails
    if (imageUrls.length === 0) {
      console.log('No images were generated, returning fallback images');
      return NextResponse.json({
        success: false,
        images: [
          'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Image+Generation+Failed',
          'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Please+Try+Again',
          'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Or+Use+Different+Prompt',
        ],
        error: 'Failed to generate any images with Gemini'
      });
    }
    
    console.log(`Successfully generated ${imageUrls.length} images`);
    return NextResponse.json({
      success: true,
      images: imageUrls
    });
    
  } catch (error) {
    console.error('Error processing Gemini image generation request:', error);
    return NextResponse.json({
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 