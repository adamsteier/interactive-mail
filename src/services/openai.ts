// OpenAI API service for generating images based on prompt

export interface ImageGenerationResponse {
  images: string[];  // Base64 encoded images or URLs
  success: boolean;
  error?: string;
}

// Response types for OpenAI API
interface OpenAIImageData {
  url: string;
  revised_prompt?: string;
}

interface OpenAIImageResponse {
  created: number;
  data: OpenAIImageData[];
}

/**
 * Generate images using OpenAI's DALL-E model
 * @param prompt The text prompt to generate images from
 * @param n Number of images to generate (default: 3)
 * @returns Array of image URLs or base64 encoded images
 */
export async function generateImages(
  prompt: string,
  n: number = 3
): Promise<ImageGenerationResponse> {
  try {
    // Get API key from environment variable
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('OpenAI API key not found');
      return {
        images: [],
        success: false,
        error: 'API key not configured. Please set OPENAI_API_KEY environment variable.'
      };
    }
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',  // Using DALL-E 3 model for high quality images
        prompt,
        n,
        size: '1024x1024',  // Standard size, can be changed as needed
        response_format: 'url'  // Will return URLs instead of b64_json for better performance
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      return {
        images: [],
        success: false,
        error: errorData.error?.message || 'Failed to generate images'
      };
    }
    
    const data = await response.json() as OpenAIImageResponse;
    // Extract image URLs from the response
    const images = data.data.map((item: OpenAIImageData) => item.url);
    
    return {
      images,
      success: true
    };
  } catch (error) {
    console.error('Error generating images:', error);
    return {
      images: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate a detailed prompt for the AI based on user inputs
 */
export function generateImagePrompt(
  brandName: string,
  stylePreferences: string[],
  industry: string,
  targetDescription: string,
  imageStyle: string[],
  primarySubject: string,
  layoutStyle: string,
  colorScheme: { primary: string, accent: string }
): string {
  // Constructing a detailed prompt that captures all the key information
  return `Create a professional, high-quality image for a postcard for ${brandName}, 
  a ${industry} business. The image should feature ${primarySubject} 
  with a ${imageStyle.join(', ')} style and a ${layoutStyle} layout feel.
  The brand has a ${stylePreferences.join(', ')} style preference.
  Target audience: ${targetDescription}
  Use color scheme inspired by these colors: primary ${colorScheme.primary}, accent ${colorScheme.accent}.
  The image should be polished, professional, and suitable for a business postcard.
  Make the image visually striking and memorable.`;
} 