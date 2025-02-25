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
  const { brandData, marketingData, audienceData, businessData, visualData, designStyle } = params;
  
  // Map designStyle to descriptive terms
  const styleTitle = 
    designStyle === 'professional' ? 'PROFESSIONAL/CORPORATE' :
    designStyle === 'modern' ? 'MODERN/BOLD' : 'ELEGANT/SOPHISTICATED';
  
  // Construct design guidance based on style
  let designGuidance = '';
  
  if (designStyle === 'professional') {
    designGuidance = `
DESIGN GUIDANCE:
1. Create a clean, structured layout with professional typography
2. Use negative space effectively with a clear grid structure
3. Include a dedicated image area (approximately 40% of design)
4. Use a limited icon set (4-5 max) from a standard library like Font Awesome
5. Use specific Google Fonts that convey professionalism (Roboto, Open Sans, Lato)
6. Position logo prominently in top section with adequate spacing
7. Use subtle graphical elements that won't impact loading performance
8. Design hierarchy should emphasize security and reliability messaging
9. Include subtle legal/document imagery or motifs
10. Create clear visual separation between information sections`;
  } else if (designStyle === 'modern') {
    designGuidance = `
DESIGN GUIDANCE:
1. Create an impactful, contemporary design with bold typography
2. Use dynamic layouts with asymmetric elements and bold color blocks
3. Use specific Google Fonts with good weight contrast (Montserrat, Raleway)
4. Designate a striking image area (approximately 50% of design)
5. Use 3-4 strategic icons to reinforce key benefits (from standard library)
6. Position logo in a creative but prominent location
7. Use typography as a design element (oversized text, creative placement)
8. Create visual interest through layering and color contrast
9. Design with mobile responsiveness in mind
10. Incorporate geometric shapes using brand colors as section dividers`;
  } else {
    designGuidance = `
DESIGN GUIDANCE:
1. Create a refined, upscale design with premium typography
2. Use specific Google Fonts that convey elegance (Playfair Display, Cormorant)
3. Use subtle gradients or texture overlays (describable, not performance-heavy)
4. Incorporate classic design elements with a modern twist
5. Designate an elegant image area (approximately 35-40% of design)
6. Use sophisticated typography with careful attention to spacing
7. Include 3-4 minimal, elegant icons to highlight key services
8. Position logo in a sophisticated, branded area with ample space
9. Create visual interest through subtle variations in color and tone
10. Balance white space with content for an uncluttered, high-end feel`;
  }
  
  // Objectives string
  const objectives = marketingData.objectives.map((obj: string) => {
    if (marketingData.objectiveDetails && marketingData.objectiveDetails[obj]) {
      return `- ${obj}: ${marketingData.objectiveDetails[obj]}`;
    }
    return `- ${obj}`;
  }).join('\n');
  
  // Construct the full prompt
  return `
Using thinking mode, design a ${styleTitle} POSTCARD for ${brandData.brandName}, a delivery service targeting ${audienceData.industry || 'businesses'}.

TECHNICAL SPECIFICATIONS:
- Size: 1871×1271 pixels (5.5"×3.5" at 300 DPI)
- Resolution: 300 DPI
- Color mode: CMYK equivalent
- Bleed area: 3mm on all sides (mark this area in the design)
- Safe zone: Keep all important text and elements 1/8" from edge
- Format: A complete React component in TypeScript using React.createElement (NOT JSX syntax)
- Include placeholder for image (using a div with className for the image area)

BRAND INFORMATION:
- Brand name: ${brandData.brandName}
- Logo: ${brandData.logoUrl || 'Not provided'} (Position prominently)
- Tagline: "${businessData.tagline || 'Serving your needs since 2007'}"
- Primary color: ${brandData.primaryColor}
- Accent color: ${brandData.accentColor}
- Brand values: ${brandData.brandValues.join(', ')}
- Style preferences: ${brandData.stylePreferences.join(', ')}

MARKETING OBJECTIVES:
${objectives}
- Call to action: "${marketingData.callToAction}"
- Key selling point: Secure, timely delivery for ${audienceData.industry || 'businesses'}

TARGET AUDIENCE:
- Industry: ${audienceData.industry}
- Audience description: ${audienceData.targetDescription}
- Age range: ${audienceData.audienceAgeRange.join(', ')}
- Professional interests: ${audienceData.interests.join(', ')}
- Pain points: Missing deadlines, document security, proof of delivery

BUSINESS DETAILS:
- Contact information:
  * Phone: ${businessData.contactInfo.phone}
  * Email: ${businessData.contactInfo.email}
  * Website: ${businessData.contactInfo.website}
  * Address: ${businessData.contactInfo.address}
  * Social: ${businessData.extraInfo || '@social'}
- Include QR code: ${businessData.contactInfo.includeQR ? 'Yes' : 'No'} (linking to website)
- Additional information: "${businessData.extraInfo || ''}"

VISUAL ELEMENTS:
- Image style: ${visualData.imageStyle.join(', ')}
- Primary subject: ${visualData.imagePrimarySubject}
- Layout style: ${visualData.layoutStyle}
- Color notes: ${visualData.customColorNotes || 'Follow brand colors'}
- Use web-safe fonts or Google Fonts only
- Use professional iconography (simulated with tailwind classes or SVGs)

COPY GUIDELINES:
- Focus on addressing the customer's primary need: ${marketingData.marketingObjectives || 'reliable delivery'}
- Emphasize security and reliability for sensitive materials
- Use professional language that resonates with ${audienceData.industry} professionals
- Include 2-3 short bullet points highlighting key benefits
- Create a secondary tagline specific to ${audienceData.industry} services
- Write copy that creates emotional relief (reducing stress of deadlines)

${designGuidance}

IMPORTANT REQUIREMENTS:
1. Return a complete React function component in TypeScript that implements this design
2. DO NOT use JSX syntax - use React.createElement() syntax instead
3. Use Tailwind CSS for styling by adding className props to elements
4. The component should accept these props:
   - imageUrl: string | null
   - isSelected: boolean
   - onSelect: () => void
   - imagePosition: { x: number; y: number; scale: number }
   - onDragEnd?: (info: { offset: { x: number; y: number } }) => void
   - isLoading?: boolean
   - brandName?: string
   - tagline?: string
   - contactInfo?: { phone?: string; email?: string; website?: string; address?: string }
   - callToAction?: string
   - extraInfo?: string

EXAMPLE FORMAT OF THE COMPONENT (using React.createElement instead of JSX):
\`\`\`typescript
const PostcardDesign = (props) => {
  // Extract props
  const { imageUrl, isSelected, onSelect, imagePosition, onDragEnd } = props;
  
  // Your styling logic here
  
  return React.createElement(
    'div',
    { 
      className: \`relative border-2 \${isSelected ? 'border-blue-500' : 'border-gray-300'}\`,
      onClick: onSelect
    },
    [
      // Child elements using React.createElement
      React.createElement('h1', { className: 'text-xl font-bold' }, props.brandName),
      // More elements...
    ]
  );
};
\`\`\`

Make sure the component implements an image area that supports the drag functionality when isSelected is true. Use motion.div from framer-motion for the image container and apply drag, dragMomentum, onDragEnd, and positioning styles correctly.
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