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
  
  return `Create a high-quality ${styleString} image for a ${layoutStyle} postcard design for ${brandName}, a delivery service for ${industry || 'businesses'}. 
The image should feature ${imagePrimarySubject || 'a delivery vehicle or package'} and appeal to ${targetDescription || 'business professionals'}.
Use a color palette that complements ${colors.primary} and ${colors.accent}.
The style should be ${brandAesthetic}.
The image should be professional, clean, and visually striking.
Important: Create an image with plenty of empty space or a gradient background on one side to allow for text overlay in the postcard design.
Do not include any text or logos in the image.`;
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