// Gemini API service for generating images based on prompt
import axios from 'axios';

export interface GeminiImageResponse {
  success: boolean;
  images: string[];               // URLs to the images (now Firebase Storage URLs)
  imageIds?: string[];            // Firestore document IDs
  originalDataUrls?: string[];    // Original base64 data URLs for immediate display
  prompt?: string;
  error?: string;
  note?: string;
}

/**
 * Generate a detailed image prompt based on user inputs
 */
export const generateImagePrompt = (
  brandName: string,
  stylePreferences: string[],
  industry: string,
  targetDescription: string,
  imageStyle: string[],
  imagePrimarySubject: string,
  layoutStyle: string,
  colors: {
    primary: string;
    accent: string;
  }
): string => {
  // Convert image style array to string
  const styleString = imageStyle.length > 0 ? imageStyle.join(', ') : 'photographic';
  
  // Brand aesthetic derived from preferences
  const brandAesthetic = stylePreferences.length > 0 ? 
    stylePreferences.join(', ') : 'professional, modern';
  
  // Gemini works well with more concise prompts compared to DALL-E
  return `Create a high-quality ${styleString} image for a postcard for ${brandName}${industry ? ' in the ' + industry + ' industry' : ''}. 

This should be a FULL-FRAME BACKGROUND IMAGE with:
- ${imagePrimarySubject || 'a smiling person'} as the primary subject
- Appeal to ${targetDescription || 'business professionals'}
- Color palette that complements ${colors.primary} and ${colors.accent}
- Style: ${brandAesthetic}
- Layout: ${layoutStyle}

Important:
- Fill the entire frame - no borders or empty space
- Create a composition where text can be overlaid anywhere with good contrast
- No text or logos in the image
- Include areas for text overlays
- Subject should be clearly visible and well-composed
- Avoid overly busy patterns
- Ensure proper depth and dimension`;
};

/**
 * Call API to generate images using Gemini
 */
export const generateImages = async (
  prompt: string,
  numImages: number = 3,
  templateId?: string
): Promise<GeminiImageResponse> => {
  try {
    // Call our API route for Gemini
    const response = await axios.post('/api/generate-images-gemini', {
      prompt,
      numImages,
      templateId
    });
    
    return response.data;
  } catch (error) {
    console.error('Error generating images with Gemini:', error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 