import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { 
  GeneratePostcardDesignParams,
  generateDesignPrompt
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

  // Key benefits based on design style
  const benefits = [
    "${designStyle === 'professional' ? 'Secure document handling' : designStyle === 'modern' ? 'Lightning-fast delivery' : 'Premium white-glove service'}",
    "${designStyle === 'professional' ? 'Reliable on-time delivery' : designStyle === 'modern' ? 'Real-time tracking' : 'Discrete, confidential service'}",
    "${designStyle === 'professional' ? 'Industry compliance' : designStyle === 'modern' ? '24/7 customer support' : 'Personalized attention'}"
  ];

  return (
    <div 
      className={\`relative border-2 \${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
        rounded-lg overflow-hidden cursor-pointer aspect-[7/5]\`}
      style={{ backgroundColor: colors.bg }}
      onClick={onSelect}
    >
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="mb-2">
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
        
        <div className="flex flex-1 gap-4 mb-3">
          {/* Left content */}
          <div className="w-1/2 flex flex-col justify-between">
            {/* Benefits */}
            <div className="mb-2">
              <ul className="text-sm space-y-1" style={{ color: colors.text }}>
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1 text-xs" style={{ color: colors.primary }}>•</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Call to action */}
            <div 
              className="py-2 px-3 rounded text-center font-medium text-white mt-auto"
              style={{ backgroundColor: colors.primary }}
            >
              {callToAction}
            </div>
          </div>
          
          {/* Right side - Image area */}
          <div className="w-1/2 aspect-square bg-gray-200 relative overflow-hidden rounded">
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
        </div>
        
        {/* Contact info */}
        <div className="text-xs space-y-1 mt-1 border-t pt-2 border-gray-200" style={{ color: colors.text }}>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {contactInfo.phone && <p className="flex items-center"><span className="mr-1">📞</span> {contactInfo.phone}</p>}
            {contactInfo.email && <p className="flex items-center"><span className="mr-1">✉️</span> {contactInfo.email}</p>}
            {contactInfo.website && <p className="flex items-center"><span className="mr-1">🌐</span> {contactInfo.website}</p>}
            {contactInfo.address && <p className="flex items-center"><span className="mr-1">📍</span> {contactInfo.address}</p>}
          </div>
          {extraInfo && <p className="italic text-xs mt-1">{extraInfo}</p>}
        </div>
      </div>
    </div>
  );
};

// No export statement - this will be handled by the function constructor
\`\`\`
`;
};

export async function POST(request: Request) {
  try {
    // For debugging
    console.log("API route called with Claude API Key:", process.env.CLAUDE_API_KEY ? "Key exists" : "Key missing");
    
    const params = await request.json() as GeneratePostcardDesignParams;
    console.log("Requested design style:", params.designStyle);
    
    // Check if we should use the real API or fallback
    if (!process.env.CLAUDE_API_KEY) {
      console.log("Using fallback design - Claude API key not found");
      const completion = getFallbackDesignCode(params.designStyle, params.brandData.brandName);
      return NextResponse.json({ 
        completion, 
        success: true 
      });
    }
    
    // Try to use the real Claude API
    try {
      const prompt = generateDesignPrompt(params);
      
      // Initialize the Anthropic client with API key from environment
      const anthropic = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
      });
      
      console.log("Calling Claude API with model: claude-3-7-sonnet-latest");
      
      // Call Claude API with the SDK
      const response = await anthropic.beta.messages.create({
        model: "claude-3-7-sonnet-latest",
        max_tokens: 4000,
        thinking: {
          type: "enabled",
          budget_tokens: 4000
        },
        messages: [
          { role: "user", content: prompt }
        ]
      });
      
      // Extract completion from the response - handle text content properly
      const textContent = response.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content found in Claude response');
      }
      
      const completion = textContent.text;
      console.log("Claude API responded successfully with content length:", completion.length);
      
      // Check if we need to process the response further
      let processedCompletion = completion;
      
      // If the response contains JSX tags but no React.createElement, add a warning comment
      if (
        (processedCompletion.includes('<div') || processedCompletion.includes('<motion.div')) && 
        !processedCompletion.includes('React.createElement')
      ) {
        console.log("Warning: Response contains JSX but no React.createElement - adding warning comment");
        processedCompletion = `/* WARNING: This code contains JSX syntax which cannot be directly evaluated.
Please modify to use React.createElement syntax instead of JSX tags. Example:
Instead of: <div className="example">Text</div>
Use: React.createElement('div', { className: 'example' }, 'Text')
*/\n\n${processedCompletion}`;
      }
      
      return NextResponse.json({ 
        completion: processedCompletion, 
        success: true 
      });
    } catch (apiError) {
      console.error("Claude API call failed:", apiError);
      
      // Return fallback if API call fails
      console.log("Falling back to static design after API error");
      const completion = getFallbackDesignCode(params.designStyle, params.brandData.brandName);
      
      return NextResponse.json({ 
        completion, 
        success: true,
        usedFallback: true,
        error: apiError instanceof Error ? apiError.message : 'Unknown Claude API error'
      });
    }
  } catch (error) {
    console.error('Error in generate-design API route:', error);
    return NextResponse.json({ 
      completion: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 