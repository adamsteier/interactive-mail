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
 * Generate a prompt for Claude to create a postcard design
 */
export const generateDesignPrompt = (
  brandData: BrandData,
  marketingData: MarketingData, 
  audienceData: AudienceData,
  businessData: BusinessData,
  designStyle: 'playful' | 'professional' | 'modern' | 'traditional',
  creativityLevel: 'template' | 'creative' | 'very_creative' = 'creative'
): string => {
  // Template prompt component for the design style
  const templateComponents = {
    playful: `Create a FUN, PLAYFUL postcard design with vibrant colors, friendly illustrations or imagery, and energetic layouts. 
Use rounded corners, playful typography, and a lighthearted approach that conveys joy and approachability.
Consider using a combination of bold color blocks, playful patterns, or quirky design elements that would appeal to your audience.
Make it visually engaging without being overwhelming.`,

    professional: `Create a PROFESSIONAL, SOPHISTICATED postcard design with clean layouts, elegant typography, and refined color use.
Focus on negative space, structured grid layouts, and professional imagery that conveys competence and trustworthiness.
Incorporate subtle textures or gradients if appropriate, maintain balanced proportions, and ensure impeccable alignment.
The design should be business-appropriate while still being visually interesting.`,

    modern: `Create a MODERN, BOLD postcard design with contemporary aesthetics, dramatic layouts, and high contrast elements.
Consider using a split layout, dynamic typography arrangements, minimalist approaches, or unexpected composition techniques.
Incorporate negative space strategically, use typography as a graphic element, and create visual tension through contrast.
The design should feel current, fresh, and visually surprising while remaining purposeful and cohesive.`,

    traditional: `Create a TRADITIONAL, TIMELESS postcard design with classic elements, symmetrical layouts, and familiar design patterns.
Use serif typography, traditional color palettes, bordered layouts, or classic imagery appropriate for established businesses.
Focus on convention rather than innovation, with clear hierarchy, centered compositions, and balanced proportions.
The design should feel established, trustworthy, and timeless.`
  };

  // Creativity level guidance
  const creativityGuidance = {
    template: `For creativity level, take a VERY CONSERVATIVE approach. 
Create a standard, conventional design that follows established design patterns in this industry.
Use predictable layouts, standard typography choices, and expected visual treatments.
The result should feel familiar and safe, with no experimental elements.`,

    creative: `For creativity level, take a BALANCED approach between convention and originality.
Create a design that feels fresh and interesting while remaining appropriate and effective.
You can introduce a few unexpected elements or treatments while keeping the overall structure familiar.
Find creative ways to highlight the key information while maintaining clarity and purpose.`,

    very_creative: `For creativity level, take a BOLD, INNOVATIVE approach that pushes boundaries.
Create a design that feels unique, surprising, and memorable while still functioning effectively as a postcard.
Experiment with unconventional layouts, unexpected color combinations, or innovative visual treatments.
Challenge design conventions while ensuring the design remains cohesive and purposeful.`
  };

  // Audience tailoring - NEW SECTION
  let audienceTailoring = ``;
  
  if (audienceData.targetDescription) {
    audienceTailoring = `
AUDIENCE TAILORING:
Your design should specifically appeal to ${audienceData.targetDescription} in the ${audienceData.industry || 'relevant'} industry.
Consider the visual preferences, communication style, and expectations of this specific audience.
Adjust your design choices (colors, typography, layout, visual elements) to resonate with this audience specifically.
Use design elements that would catch their attention and feel relevant to their professional context.`;
  }

  // Brand differentiation - NEW SECTION
  const brandDifferentiation = `
DESIGN DIFFERENTIATION:
Your design should feel distinct and unique to ${brandData.brandName}, not generic or template-like.
Find creative ways to express the brand's unique value proposition visually.
Consider how this design could stand out from competitors in the ${audienceData.industry || ''} industry.
Make thoughtful design choices that visually communicate what makes this brand special.`;

  // Full prompt assembly
  const fullPrompt = `You are an expert graphic designer creating a direct mail postcard design for ${brandData.brandName}. 
The design should effectively market their products/services to their target audience.

DESIGN STYLE:
${templateComponents[designStyle]}

CREATIVITY LEVEL:
${creativityGuidance[creativityLevel]}
${audienceTailoring}
${brandDifferentiation}

BRAND INFORMATION:
- Brand name: ${brandData.brandName}
- Industry: ${audienceData.industry || 'Not specified'}
- Brand colors: Primary - ${brandData.primaryColor || '#3B82F6'}, Accent - ${brandData.accentColor || '#10B981'}
- Brand style preferences: ${brandData.stylePreferences?.join(', ') || 'Professional, modern'}

MARKETING OBJECTIVE:
- Objectives: ${marketingData.objectives?.join(', ') || 'Not specified'}
- Call to action: ${marketingData.callToAction || 'Contact us today'}
- Promotion details: ${marketingData.promotionDetails || 'High quality product/service'}

TARGET AUDIENCE:
- Industry: ${audienceData.industry || 'General'}
- Description: ${audienceData.targetDescription || 'Business professionals'}

BUSINESS INFORMATION TO INCLUDE:
- Business name: ${brandData.brandName}
- Tagline: ${businessData.tagline || 'Your brand tagline'}
- Contact information:
  ${businessData.contactInfo.phone ? `- Phone: ${businessData.contactInfo.phone}` : ''}
  ${businessData.contactInfo.email ? `- Email: ${businessData.contactInfo.email}` : ''}
  ${businessData.contactInfo.website ? `- Website: ${businessData.contactInfo.website}` : ''}
  ${businessData.contactInfo.address ? `- Address: ${businessData.contactInfo.address}` : ''}
${businessData.extraInfo ? `- Additional information: ${businessData.extraInfo}` : ''}

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
6. SIZE SPECIFICATIONS:
   - Create the postcard at EXACTLY 1872x1271 pixels
   - The component will be displayed inside a scaling container that uses CSS transform
   - Elements should be sized proportionally to this large canvas (e.g., larger fonts, padding, etc.)
7. ICON USAGE:
   - Instead of emojis, use Lucide React icons library for all icons
   - You can use ANY icon from the Lucide icon library (see https://lucide.dev/icons/ for available icons)
   - Specify the icon name as a string in your code, like 'Phone', 'Mail', 'MapPin', 'Globe', 'Heart', etc.
   - Create icon components by referencing the icon name with size and className
   - Maintain a consistent icon style throughout the design
   - For addresses use 'MapPin', for phone numbers use 'Phone', for email use 'Mail', for websites use 'Globe'
8. FONT USAGE:
   - Use Google Fonts to enhance your design's typography
   - Select fonts that match the design style (${designStyle}) and target audience
   - For each font you use, include a fontFamily property in your style object
   - IMPORTANT: At the beginning of your component, include a fontInfo object that lists all Google Fonts used:
     
     const fontInfo = {
       fonts: [
         { name: 'Font Name', weights: [400, 700] },  // Include only the weights you're using
         { name: 'Another Font', weights: [300, 500, 900] }
       ]
     };
     
   - Use semantic font pairings (e.g., different fonts for headings vs body text)
   - Some suggested font pairings based on style:
     * Professional: 'Playfair Display' with 'Source Sans Pro', 'Libre Baskerville' with 'Montserrat'
     * Modern: 'Roboto' with 'Roboto Slab', 'Work Sans' with 'Crimson Text'
     * Playful: 'Pacifico' with 'Quicksand', 'Fredoka One' with 'Nunito'
     * Traditional: 'Merriweather' with 'Lora', 'Libre Baskerville' with 'Source Serif Pro'
   - Feel free to use ANY Google Font that fits your design (not limited to the suggestions)

Here's an example structure using React.createElement to inspire you:

\`\`\`
// Specify the icon names you want to use
const iconNames = {
  phone: 'Phone',
  email: 'Mail',
  address: 'MapPin',
  website: 'Globe',
  benefits: 'CheckCircle',
  // Add any other Lucide icon names you want to use
};

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
  
  // Example of creating a Lucide React icon reference
  const phoneIconProps = { 
    iconName: iconNames.phone,
    size: 18, 
    className: 'text-blue-500 mr-2',
    strokeWidth: 2 
  };
  
  // Create your component with React.createElement
  return React.createElement(
    'div',
    {
      className: \`relative overflow-hidden rounded-lg cursor-pointer transition-shadow \${
        isSelected ? 'ring-2 ring-electric-teal shadow-lg' : 'ring-1 ring-electric-teal/30'
      }\`,
      style: { 
        width: '1872px', 
        height: '1271px',
        // Your container styles 
      },
      onClick: onSelect
    },
    [
      // Your creative design structure goes here, using React.createElement for each element
      // Incorporate Lucide React icons for contact information
      contactInfo.phone && React.createElement('div', { className: 'flex items-center' }, [
        React.createElement('div', { 
          className: 'icon',
          'data-icon': phoneIconProps.iconName,
          'data-size': phoneIconProps.size,
          'data-class': phoneIconProps.className,
          'data-stroke-width': phoneIconProps.strokeWidth
        }),
        React.createElement('span', { className: 'text-gray-700' }, contactInfo.phone)
      ])
      // Add more elements as needed
    ]
  );
};
\`\`\`

Remember to create a design that would realistically work well as a physical postcard. Focus on making the key elements (brand name, call to action, image) stand out while ensuring all text is legible.

DO NOT explain your design choices or include any comments outside the code block. 
DO NOT include language identifiers like "javascript" or "jsx" in your code - just provide the raw code.
Respond ONLY with the complete React component code using React.createElement syntax.
`;

  return fullPrompt;
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