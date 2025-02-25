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
  
  return `Create a high-quality ${styleString} image to be used as a background element within a postcard design for ${brandName}${industry ? ' in the ' + industry + ' industry' : ''}. 

This is creating a FULL-FRAME BACKGROUND IMAGE for a postcard based on these parameters:
- The image must feature ${imagePrimarySubject || 'a smiling person'} as the primary subject
- The image should appeal to ${targetDescription || 'business professionals'}
- Use a color palette that complements ${colors.primary} and ${colors.accent}
- The style should be ${brandAesthetic}
- Layout style: ${layoutStyle}

CRITICAL REQUIREMENTS:
- The image MUST FILL THE ENTIRE FRAME with no borders, margins, or empty space around the edges
- DO NOT create an isolated object, icon, badge, or logo floating on a background
- This should be a FULL-BLEED IMAGE that extends to all edges of the frame
- Create a composition where text can be overlaid anywhere (with sufficient contrast)
- No text or logos in the image
- The image should have areas of visual interest but also some simpler areas that can accommodate text overlays
- The subject should be clearly visible and well-composed within the frame
- The image should work as a versatile background that can accommodate different text placements
- Avoid overly busy patterns that would make text difficult to read
- Ensure the image has proper depth and doesn't look flat or like clip art`;
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