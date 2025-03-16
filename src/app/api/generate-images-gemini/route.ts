import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GenerateImagesRequest {
  prompt: string;
  numImages?: number;
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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
    });
    
    // Array to store image data
    const imageUrls: string[] = [];
    
    // Generate multiple images
    for (let i = 0; i < numImages; i++) {
      try {
        // Request image generation from Gemini with slight variations to get different images
        const adjustedPrompt = i === 0 
          ? prompt 
          : `${prompt} (Variation ${i+1}: Make this slightly different while keeping the same style)`;
          
        // Generate image with multimodal output
        const result = await model.generateContent(adjustedPrompt);
        const response = result.response;
        
        // Process response to extract images
        if (response.candidates && response.candidates[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData?.data) {
              // Add the base64 data URL to our collection
              const mimeType = part.inlineData.mimeType || 'image/jpeg';
              const dataUrl = `data:${mimeType};base64,${part.inlineData.data}`;
              imageUrls.push(dataUrl);
              break; // Just get one image per request
            }
          }
        }
      } catch (err) {
        console.error(`Error generating image ${i+1}:`, err);
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < numImages - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Fallback to placeholder images if generation fails
    if (imageUrls.length === 0) {
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