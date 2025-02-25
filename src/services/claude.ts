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
  designStyle: 'professional' | 'modern' | 'elegant';
}

/**
 * Generates a prompt for Claude API based on user data and design style
 */
export const generateDesignPrompt = (params: GeneratePostcardDesignParams): string => {
  const { brandData, marketingData, audienceData, businessData, designStyle } = params;
  
  // Map designStyle to descriptive terms
  const styleTitle = 
    designStyle === 'professional' ? 'PROFESSIONAL/CORPORATE' :
    designStyle === 'modern' ? 'MODERN/BOLD' : 'ELEGANT/SOPHISTICATED';
  
  // Construct design guidance based on style
  let designGuidance = '';
  
  if (designStyle === 'professional') {
    designGuidance = `
DESIGN INSPIRATION:
- Clean, structured layouts with clear visual hierarchy
- Professional typography combinations (serif headers with sans-serif body text)
- Strategic use of negative space
- Subtle shadows or embossing for depth
- Structured grid-based layouts
- Monochromatic color schemes with accent colors
- Subtle textures that convey reliability (paper, linen, etc.)
- Professional iconography (simple, outlined, consistent style)
- Clear visual separation between content sections
- Conservative animations or transitions`;
  } else if (designStyle === 'modern') {
    designGuidance = `
DESIGN INSPIRATION:
- Bold asymmetric layouts with dynamic spacing
- High contrast color combinations
- Oversized typography as design elements
- Gradient overlays and duotone effects
- Geometric shapes and patterns
- Creative image cropping and positioning
- Floating elements with subtle shadows
- Unexpected element positioning
- Minimal but impactful use of color
- Interactive hover states and animations`;
  } else {
    designGuidance = `
DESIGN INSPIRATION:
- Refined layouts with generous whitespace
- Elegant typography pairs (display + serif)
- Subtle gold/metallic accents or gradients
- Delicate line details or filigree elements
- Sophisticated image treatments (vignettes, subtle filters)
- Layered design elements for depth
- Understated animations and transitions
- Balanced asymmetry in composition
- Premium color palettes (deep blues, rich burgundies, forest greens)
- Textural elements suggesting luxury materials`;
  }
  
  // Objectives string
  const objectives = marketingData.objectives.map((obj: string) => {
    if (marketingData.objectiveDetails && marketingData.objectiveDetails[obj]) {
      return `- ${obj}: ${marketingData.objectiveDetails[obj]}`;
    }
    return `- ${obj}`;
  }).join('\n');
  
  // Construct the full prompt with creative freedom
  return `
You are creating a React component for a POSTCARD design with a ${styleTitle} style for ${brandData.brandName}.

🔴 CRITICAL REQUIREMENT: Your component MUST use React.createElement() syntax exclusively - do NOT use JSX tags. 
The component will be evaluated using Function constructor which cannot process JSX.

I want you to express your creativity and design the best possible postcard that fits the brand and data provided.
Don't feel constrained by a rigid template - create something unique that best showcases the information.

BRAND INFORMATION:
- Brand name: ${brandData.brandName}
- Logo: ${brandData.logoUrl || 'Not provided'} (Position prominently)
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

${designGuidance}

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
   - Supports dragging when isSelected is true (using the transform style property)
4. The component should include a border that changes color when selected
5. ‼️ Must use React.createElement() syntax - NO JSX ‼️

CREATIVE FREEDOM:
- Feel free to use different layouts (1, 2, or 3 columns)
- Try different typography combinations appropriate for the style
- Incorporate creative visual elements like dividers, shapes, or patterns
- Consider different content organization based on the specific data provided
- Utilize shadows, gradients, or textures where appropriate
- Think about interesting ways to present the benefits or features
- Create custom styling for the call-to-action to make it stand out
- Experiment with different ways to display contact information

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
  
  // Create your component with React.createElement
  return React.createElement(
    'div',
    {
      className: \`border-2 \${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} rounded-lg aspect-[7/5]\`,
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

DO NOT explain your design choices or include any comments outside the code block. Respond ONLY with the complete React component code using React.createElement syntax.
`;
};

/**
 * Calls Claude API to generate a postcard design component
 */
export const generatePostcardDesign = async (params: GeneratePostcardDesignParams): Promise<ClaudeApiResponse> => {
  try {
    // Use the API route instead of calling Claude directly
    const response = await axios.post('/api/generate-design', params);
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
  const fallbackRegex = /```(?:jsx|typescript|js|ts)?\s*([\s\S]*?)\s*```/;
  const fallbackMatch = completion.match(fallbackRegex);
  
  if (fallbackMatch && fallbackMatch[1]) {
    console.log("Found generic code block, length:", fallbackMatch[1].trim().length);
    return fallbackMatch[1].trim();
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
      return lines.slice(startIndex).join('\n');
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
    return lines.slice(genericStartIndex).join('\n');
  }
  
  console.log("Failed to extract any component code!");
  return '';
}; 