// OpenAI API service for generating images based on prompt
import axios from 'axios';

export interface OpenAIResponse {
  success: boolean;
  images: string[];
  error?: string;
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
  
  return `Create a high-quality full frame ${styleString} image to be used as a COMPONENT within a postcard design for ${brandName}${industry ? ' in the ' + industry + ' industry' : ''}. 

This is creating ONLY THE IMAGE ELEMENT of a postcard based on limited information:
- The image must have a clear, single focal point featuring ${imagePrimarySubject || 'a smiling person'}.  
- The image should appeal to ${targetDescription || 'business professionals'}
- Use a color palette that complements ${colors.primary} and ${colors.accent}
- The style should be ${brandAesthetic}
- Layout style: ${layoutStyle}

Important visual requirements:
- The image should be filling the entire space, no borders, no badges, no paper, no framing, no background elements.
- This is NOT a complete postcard design - create ONLY the image element
- Create a visually clean image that isn't overly complex
- The focal point should be prominent and immediately recognizable
- The image should look professional, polished, and suitable as part of a direct mail postcard
- No text or logos in the image
- The image should take up the entire canvas, no badges, paper
- The composition should be balanced but not too busy or cluttered
- Create an image that would work well when integrated into a postcard layout (5.5"×3.5")`;
};

/**
 * Call API to generate images
 */
export const generateImages = async (
  prompt: string,
  numImages: number = 3
): Promise<OpenAIResponse> => {
  try {
    // Call our API route instead of OpenAI directly
    const response = await axios.post('/api/generate-images', {
      brandName: '', // These aren't used directly by the API route
      stylePreferences: [],
      industry: '',
      targetDescription: '',
      imageStyle: [],
      imagePrimarySubject: '',
      layoutStyle: '',
      colors: { primary: '', accent: '' },
      // We include the pre-generated prompt which is what the API actually uses
      generatedPrompt: prompt,
      numImages
    });
    
    return response.data;
  } catch (error) {
    console.error('Error generating images:', error);
    return {
      success: false,
      images: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 