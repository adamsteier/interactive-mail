// Claude API Service for postcard design generation
import axios from 'axios';

// Define the interfaces based on existing types in the application
export interface BrandData {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  brandValues: string[];
  stylePreferences: string[];
  useExistingGuidelines: boolean;
  guidelinesNotes: string;
}

export interface MarketingObjectiveDetails {
  awareness?: string;
  promotion?: string;
  traffic?: string;
  event?: string;
  other?: string;
  [key: string]: string | undefined; // Add index signature to allow string indexing
}

export interface MarketingData {
  objectives: string[];
  callToAction: string;
  promotionDetails: string;
  eventDate: string;
  offerDetails: string;
  marketingObjectives: string;
  objectiveDetails?: MarketingObjectiveDetails;
}

export interface AudienceData {
  industry: string;
  targetDescription: string;
  audienceAgeRange: string[];
  incomeLevel: string[];
  interests: string[];
  customAudience: boolean;
  customAudienceDescription: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  website: string;
  address: string;
  includeQR: boolean;
}

export interface BusinessData {
  tagline: string;
  useAiTagline: boolean;
  contactInfo: ContactInfo;
  disclaimer: string;
  includeDisclaimer: boolean;
  extraInfo: string;
}

export interface VisualData {
  imageStyle: string[];
  imageSource: string;
  imagePrimarySubject: string;
  useCustomImage: boolean;
  customImageDescription: string;
  layoutStyle: string;
  colorSchemeConfirmed: boolean;
  customColorNotes: string;
}

export interface ClaudeApiResponse {
  completion: string;
  success: boolean;
  error?: string;
}

export interface GeneratePostcardDesignParams {
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
  designStyle: 'playful' | 'professional' | 'modern' | 'traditional';
  creativityLevel?: 'template' | 'creative' | 'very_creative';
}

/**
 * Generates a prompt for Claude API based on user data, design style and creativity level
 */
export const generateDesignPrompt = (params: GeneratePostcardDesignParams): string => {
  const { brandData, marketingData, audienceData, businessData, designStyle, creativityLevel = 'template' } = params;
  
  // Get the objectives as a list
  const objectives = marketingData.objectives.map(obj => `- ${obj}`).join('\n');

  // Get template descriptions based on selected style
  const getTemplateDescription = () => {
    switch(designStyle) {
      case 'playful':
        return `
PLAYFUL TEMPLATE:
- Playful, vibrant design with rounded corners and fun shapes
- Bright color gradients (pink to yellow background)
- Polaroid-style frame for the image that rotates slightly
- Playful typography with bold headings
- Fun icons from the Lucide React library (Heart, Sun, MessageCircle, Music)
- Emoji accents (like 🎉)
- Gradient CTA button with rounded corners
- Friendly, conversational tone throughout`;
      case 'professional':
        return `
PROFESSIONAL TEMPLATE:
- Clean, structured layout with a blue gradient background
- Professional, corporate styling with clear hierarchy
- Split layout with strategic information placement
- Business-oriented benefits presented as bullet points
- Squared elements with subtle shadows
- Bold call-to-action button
- Contact information displayed with simple icons
- Conservative, trustworthy aesthetic`;
      case 'modern':
        return `
MODERN TEMPLATE:
- Dramatic split layout (black and white sections)
- High contrast with minimal elements
- Bold typography with large brand name
- Red accent line as a visual divider
- Clean spacing with intentional negative space
- Black and white aesthetic with minimal color
- Elegant typography combinations
- Bold, bordered CTA button
- Contemporary, forward-thinking design language`;
      case 'traditional':
        return `
TRADITIONAL TEMPLATE:
- Warm, vintage aesthetics with amber/sepia tones
- Textured paper background with subtle patterns
- Ornate borders and traditional styling
- Classic typography with serif fonts
- Vintage frame for images with a double-border effect
- Traditional ornamental elements and symbols (✦)
- Heritage-focused messaging
- Traditional stamp element in the corner
- Warm color palette focused on amber and brown tones`;
      default:
        return '';
    }
  };

  // Adjust creativity guidance based on creativityLevel
  let creativityGuidance = '';
  switch(creativityLevel) {
    case 'template':
      creativityGuidance = `
CREATIVITY GUIDANCE: LOW VARIATION - MATCH TEMPLATE CLOSELY
For this design, I want you to closely follow the template structure while ensuring it works well with the provided brand information. 
- Maintain the core layout structure described in the template
- Use the same visual elements as described (frames, borders, color scheme)
- Keep the same division of space and proportions
- Match the typography approach
- Adapt the content to fit the brand, but don't dramatically change the template's visual approach
- Focus on polish rather than reinvention`;
      break;
    case 'creative':
      creativityGuidance = `
CREATIVITY GUIDANCE: MEDIUM VARIATION - EVOLVE THE TEMPLATE
For this design, take the template as a strong starting point but introduce thoughtful modifications.
- Maintain the core aesthetic of the template while adding your own creative touches
- Feel free to modify layouts to better highlight specific brand information
- Experiment with variations on the color scheme that maintain the template's mood
- Try different typography combinations while preserving the template's style
- Add or modify visual elements that enhance the design while keeping the template's spirit
- Consider how to make specific brand elements shine within the template structure`;
      break;
    case 'very_creative':
      creativityGuidance = `
CREATIVITY GUIDANCE: HIGH VARIATION - INNOVATE FROM THE TEMPLATE
For this design, use the template as inspiration but create something more unique and tailored.
- Start with the template's core aesthetic but push the boundaries significantly
- Feel free to reimagine the layout while maintaining the spirit of the style
- Experiment boldly with color variations that still reflect the template's mood
- Be creative with typography while ensuring it fits the overall style
- Add unique visual elements that complement the brand
- Consider unconventional arrangements that showcase the content effectively
- Focus on making the design feel custom-made for this specific brand
- Incorporate user suggestions if provided in the brand data`;
      break;
  }

  // Add the template description
  const templateDescription = getTemplateDescription();
  
  // Construct the full prompt with template approach
  return `
You are creating a React component for a POSTCARD design for ${brandData.brandName}.

🔴 CRITICAL REQUIREMENT: Your component MUST use React.createElement() syntax exclusively - do NOT use JSX tags. 
The component will be evaluated using Function constructor which cannot process JSX.

TEMPLATE-BASED APPROACH:
I want you to create a postcard based on the ${designStyle.toUpperCase()} template style described below.
${templateDescription}

${creativityGuidance}

BRAND INFORMATION:
- Brand name: ${brandData.brandName}
- Logo: ${brandData.logoUrl || 'Not provided'} (Position prominently if relevant)
- Tagline: "${businessData.tagline || 'Your brand tagline'}"
- Primary color: ${brandData.primaryColor}
- Accent color: ${brandData.accentColor}
- Brand values: ${brandData.brandValues.join(', ')}
- Style preferences: ${brandData.stylePreferences.join(', ')}

MARKETING OBJECTIVES:
${objectives}
- Call to action: "${marketingData.callToAction}"
- Key selling point: ${audienceData.industry || 'business'} services

TARGET AUDIENCE:
- Industry: ${audienceData.industry}
- Audience description: ${audienceData.targetDescription}
- Age range: ${audienceData.audienceAgeRange.join(', ')}
- Professional interests: ${audienceData.interests.join(', ')}
- Pain points: Missing deadlines, security, quality

TECHNICAL REQUIREMENTS:
1. Component must be named "PostcardDesign"
2. Must accept the following props in a destructured object:
   - imageUrl: string | null
   - isSelected: boolean
   - onSelect: () => void
   - imagePosition: { x: number; y: number; scale: number }
   - onDragEnd?: (info: { offset: { x: number; y: number } }) => void
   - brandName: string = "${brandData.brandName}"
   - tagline: string = "${businessData.tagline || 'Your brand tagline'}"
   - contactInfo: { phone?: string; email?: string; website?: string; address?: string }
   - callToAction: string = "${marketingData.callToAction || 'Contact us today'}"
   - extraInfo: string = ""
3. The component must include an image area that:
   - Shows the image when imageUrl is provided
   - Shows a placeholder when imageUrl is null
   - Positions and scales the image according to imagePosition
   - Supports dragging when onDragEnd is provided (using the transform style property)
4. The component should include a border that changes color when selected
5. ‼️ Must use React.createElement() syntax - NO JSX ‼️

Here's an example structure using React.createElement to inspire you:

\`\`\`
const PostcardDesign = (props) => {
  // Extract props with defaults
  const { 
    imageUrl, 
    isSelected, 
    onSelect, 
    imagePosition,
    onDragEnd,
    brandName = "${brandData.brandName}",
    tagline = "${businessData.tagline || 'Your brand tagline'}",
    contactInfo = {},
    callToAction = "${marketingData.callToAction || 'Contact us today'}",
    extraInfo = ""
  } = props;
  
  // Define your custom colors, styles, and other design elements here
  // Feel free to create any style objects you need for your design
  
  // For draggable image functionality
  const imageStyle = {
    transform: \`translate(\${imagePosition.x}px, \${imagePosition.y}px) scale(\${imagePosition.scale})\`,
  };
  
  // Create your component with React.createElement
  return React.createElement(
    'div',
    {
      className: \`relative overflow-hidden rounded-lg aspect-[7/5] cursor-pointer transition-shadow \${
        isSelected ? 'ring-2 ring-electric-teal shadow-lg' : 'ring-1 ring-electric-teal/30'
      }\`,
      style: { /* Your container styles */ },
      onClick: onSelect
    },
    [
      // Your creative design structure goes here, using React.createElement for each element
      // Feel free to create whatever nested structure best fits the content
    ]
  );
};
\`\`\`

Remember to create a design that would realistically work well as a physical postcard. Focus on making the key elements (brand name, call to action, image) stand out while ensuring all text is legible.

DO NOT explain your design choices or include any comments outside the code block. 
DO NOT include language identifiers like "javascript" or "jsx" in your code - just provide the raw code.
Respond ONLY with the complete React component code using React.createElement syntax.
`;
};

/**
 * Calls Claude API to generate a postcard design component
 */
export const generatePostcardDesign = async (params: GeneratePostcardDesignParams): Promise<ClaudeApiResponse> => {
  try {
    // Use the API route instead of calling Claude directly
    const response = await axios.post('/api/generate-design', params, {
      // Increase timeout to 4 minutes
      timeout: 240000,
    });
    return response.data as ClaudeApiResponse;
  } catch (error) {
    console.error('Error calling design API:', error);
    return { 
      completion: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Extracts React component code from Claude API response
 */
export const extractComponentCode = (completion: string): string => {
  console.log("Attempting to extract component code from response length:", completion.length);
  
  // Extract component code from between ```tsx and ``` blocks
  const codeRegex = /```tsx\s*([\s\S]*?)\s*```/;
  const match = completion.match(codeRegex);
  
  if (match && match[1]) {
    console.log("Found code block with tsx marker, length:", match[1].trim().length);
    return match[1].trim();
  }
  
  // Fallback to look for any code blocks
  const fallbackRegex = /```(?:jsx|typescript|js|ts|javascript)?\s*([\s\S]*?)\s*```/;
  const fallbackMatch = completion.match(fallbackRegex);
  
  if (fallbackMatch && fallbackMatch[1]) {
    console.log("Found generic code block, length:", fallbackMatch[1].trim().length);
    // Process the extracted code to remove any language identifier at the start
    let extractedCode = fallbackMatch[1].trim();
    // Check if the code starts with a language identifier
    if (/^(javascript|typescript|jsx|js|ts)\b/.test(extractedCode)) {
      // Remove the language identifier from the first line
      extractedCode = extractedCode.replace(/^(javascript|typescript|jsx|js|ts)\b\s*/, '');
      console.log("Removed language identifier from code block");
    }
    return extractedCode;
  }
  
  // Last resort: try to find component declarations
  const componentDeclarationPatterns = [
    /const\s+PostcardDesign\s*=/,
    /function\s+PostcardDesign\s*\(/,
    /const\s+\w+\s*=\s*\(\s*\{\s*.*?\s*\}\s*\)\s*=>/,
    /function\s+\w+\s*\(\s*\{\s*.*?\s*\}\s*\)/
  ];
  
  const lines = completion.split('\n');
  
  for (const pattern of componentDeclarationPatterns) {
    const startIndex = lines.findIndex(line => pattern.test(line));
    if (startIndex >= 0) {
      console.log(`Found component declaration using pattern at line: ${startIndex}`);
      // Check if the first line contains a language identifier
      let code = lines.slice(startIndex).join('\n');
      if (/^(javascript|typescript|jsx|js|ts)\b/.test(code)) {
        // Remove the language identifier from the first line
        code = code.replace(/^(javascript|typescript|jsx|js|ts)\b\s*/, '');
        console.log("Removed language identifier from component declaration");
      }
      return code;
    }
  }
  
  // Generic fallback to find any function
  const genericStartIndex = lines.findIndex(line => 
    line.includes('export const') || 
    line.includes('export function') || 
    line.includes('function') || 
    line.includes('const')
  );
  
  if (genericStartIndex >= 0) {
    console.log("Falling back to generic function detection, starting at line:", genericStartIndex);
    let code = lines.slice(genericStartIndex).join('\n');
    if (/^(javascript|typescript|jsx|js|ts)\b/.test(code)) {
      // Remove the language identifier from the first line
      code = code.replace(/^(javascript|typescript|jsx|js|ts)\b\s*/, '');
      console.log("Removed language identifier from generic function");
    }
    return code;
  }
  
  console.log("Failed to extract any component code!");
  return '';
}; 