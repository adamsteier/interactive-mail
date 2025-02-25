import { NextResponse } from 'next/server';
import { 
  GeneratePostcardDesignParams
} from '../../../services/claude';

// Temporary fallback code - will be replaced with actual Claude API responses once working
const getFallbackDesignCode = (designStyle: string, brandName: string = 'Brand Name') => {
  return `
\`\`\`tsx
import React from 'react';
import { motion } from 'framer-motion';

const PostcardDesign = ({ 
  imageUrl, 
  isSelected, 
  onSelect, 
  imagePosition, 
  onDragEnd,
  brandName = "${brandName}",
  tagline = "Your Courier Service",
  contactInfo = {}, 
  callToAction = "Call Us Today!",
  extraInfo = ""
}) => {
  // Define colors based on design style
  const colors = {
    bg: "${designStyle === 'professional' ? '#f8f9fa' : designStyle === 'modern' ? '#2d3748' : '#f7f7f7'}",
    primary: "${designStyle === 'professional' ? '#1a365d' : designStyle === 'modern' ? '#38b2ac' : '#7c3aed'}",
    secondary: "${designStyle === 'professional' ? '#2c5282' : designStyle === 'modern' ? '#234e52' : '#4c1d95'}",
    text: "${designStyle === 'professional' ? '#2d3748' : designStyle === 'modern' ? '#e2e8f0' : '#1e293b'}"
  };

  return (
    <div 
      className={\`relative border-2 \${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
        rounded-lg overflow-hidden cursor-pointer\`}
      style={{ backgroundColor: colors.bg }}
      onClick={onSelect}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="mb-3">
          <h3 
            className="font-bold text-xl mb-1" 
            style={{ color: colors.primary }}
          >
            {brandName}
          </h3>
          <p 
            className="text-sm italic" 
            style={{ color: colors.secondary }}
          >
            {tagline}
          </p>
        </div>
        
        {/* Image area */}
        <div className="w-full aspect-video bg-gray-200 relative overflow-hidden rounded mb-3">
          {imageUrl ? (
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: \`url(\${imageUrl})\`,
                x: imagePosition.x,
                y: imagePosition.y,
                scale: imagePosition.scale,
              }}
              drag={isSelected}
              dragMomentum={false}
              onDragEnd={(_, info) => onDragEnd && onDragEnd({ offset: { x: info.offset.x, y: info.offset.y } })}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Image placeholder
            </div>
          )}
        </div>
        
        {/* Call to action */}
        <div 
          className="py-2 px-4 rounded text-center font-medium text-white mb-3"
          style={{ backgroundColor: colors.primary }}
        >
          {callToAction}
        </div>
        
        {/* Contact info */}
        <div className="mt-auto text-xs space-y-1" style={{ color: colors.text }}>
          {contactInfo.phone && <p>📞 {contactInfo.phone}</p>}
          {contactInfo.email && <p>✉️ {contactInfo.email}</p>}
          {contactInfo.website && <p>🌐 {contactInfo.website}</p>}
          {contactInfo.address && <p>📍 {contactInfo.address}</p>}
          {extraInfo && <p className="italic">{extraInfo}</p>}
        </div>
      </div>
    </div>
  );
};

export default PostcardDesign;
\`\`\`
`;
};

export async function POST(request: Request) {
  try {
    // For debugging
    console.log("API route called with Claude API Key:", process.env.CLAUDE_API_KEY ? "Key exists" : "Key missing");
    
    const params = await request.json() as GeneratePostcardDesignParams;
    console.log("Requested design style:", params.designStyle);
    
    // TEMPORARY: Use fallback code instead of calling Claude API
    // This will be replaced with actual Claude API calls once API issues are fixed
    const completion = getFallbackDesignCode(params.designStyle, params.brandData.brandName);
    console.log("Generated fallback design component with code length:", completion.length);
    
    return NextResponse.json({ 
      completion, 
      success: true 
    });
    
    /*
    // The code below will be used once API issues are resolved
    const prompt = generateDesignPrompt(params);
    
    // Check if API key exists
    if (!process.env.CLAUDE_API_KEY) {
      console.error("Claude API key is missing");
      return NextResponse.json({ 
        completion: '', 
        success: false, 
        error: 'API key is missing in server environment' 
      }, { status: 500 });
    }
    
    try {
      // Call Claude API securely from the server
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: "claude-3-7-sonnet",
          max_tokens: 4000,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01' // Add API version header which might be required
          }
        }
      );
      
      // Extract component code from the Claude response
      const completion = response.data.content[0].text;
      return NextResponse.json({ 
        completion, 
        success: true 
      });
    } catch (apiError) {
      console.error("Claude API call failed:", apiError);
      // Return more detailed error
      return NextResponse.json({ 
        completion: '', 
        success: false, 
        error: apiError instanceof Error ? 
          `Claude API error: ${apiError.message}` : 
          'Unknown Claude API error' 
      }, { status: 500 });
    }
    */
    
  } catch (error) {
    console.error('Error in generate-design API route:', error);
    return NextResponse.json({ 
      completion: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 