import { NextResponse } from 'next/server';
import axios from 'axios';
import { generateImagePrompt } from '../../../services/openai';

interface GenerateImagesRequest {
  brandName?: string;
  stylePreferences?: string[];
  industry?: string;
  targetDescription?: string;
  imageStyle?: string[];
  imagePrimarySubject?: string;
  layoutStyle?: string;
  colors?: {
    primary: string;
    accent: string;
  };
  generatedPrompt?: string;
  numImages?: number;
}

export async function POST(request: Request) {
  try {
    const data = await request.json() as GenerateImagesRequest;
    
    // Use provided prompt if available, otherwise generate one
    let prompt: string;
    if (data.generatedPrompt) {
      prompt = data.generatedPrompt;
    } else {
      // Extract parameters with fallbacks for undefined values
      const {
        brandName = '',
        stylePreferences = [],
        industry = '',
        targetDescription = '',
        imageStyle = [],
        imagePrimarySubject = '',
        layoutStyle = '',
        colors = { primary: '#000000', accent: '#ffffff' }
      } = data;
      
      // Generate the prompt
      prompt = generateImagePrompt(
        brandName,
        stylePreferences,
        industry,
        targetDescription,
        imageStyle,
        imagePrimarySubject,
        layoutStyle,
        colors
      );
    }
    
    // Number of images to generate (default to 3)
    const numImages = data.numImages || 3;
    
    // Make multiple calls if necessary (DALL-E 3 only supports n=1)
    const imageUrls: string[] = [];
    
    for (let i = 0; i < numImages; i++) {
      // Add slight variation to prompt for each image after the first
      const variedPrompt = i === 0 
        ? prompt 
        : `${prompt} Variation ${i + 1}: Make this version slightly different while maintaining the same style and subject.`;
      
      // Call OpenAI API securely from the server
      const response = await axios.post(
        'https://api.openai.com/v1/images/generations',
        {
          model: "dall-e-3",
          prompt: variedPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "url"
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );
      
      // Extract the image URL and add to our collection
      if (response.data.data && response.data.data.length > 0) {
        imageUrls.push(response.data.data[0].url);
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < numImages - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return NextResponse.json({
      success: true,
      images: imageUrls
    });
    
  } catch (error) {
    console.error('Error generating images:', error);
    return NextResponse.json({
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 