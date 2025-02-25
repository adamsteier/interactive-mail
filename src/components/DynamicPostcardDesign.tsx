'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { generatePostcardDesign, extractComponentCode } from '../services/claude';
// Remove unused import
// import dynamic from 'next/dynamic';

// Import the interface types from Claude service to avoid 'any'
import type { BrandData, MarketingData, AudienceData, BusinessData, VisualData } from '../services/claude';

// Types for props
interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

interface PostcardDesignProps {
  imageUrl: string | null;
  isSelected: boolean;
  onSelect: () => void;
  imagePosition: ImagePosition;
  onDragEnd?: (info: { offset: { x: number; y: number } }) => void;
  isLoading?: boolean;
  brandName?: string;
  tagline?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  callToAction?: string;
  extraInfo?: string;
}

interface GeneratedDesignProps {
  designStyle: 'professional' | 'modern' | 'elegant';
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
  postcardProps: PostcardDesignProps;
}

// Simple fallback component in case of error
// const ErrorDesign: React.FC<PostcardDesignProps> = ({
//   isSelected,
//   onSelect,
//   brandName
// }) => (
//   <div 
//     className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-red-500'} 
//       rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-gray-100`}
//     onClick={onSelect}
//   >
//     <div className="p-4">
//       <h3 className="text-red-500 font-bold">{brandName || 'Error'}</h3>
//       <p className="text-sm text-gray-700">Sorry, we couldn&apos;t generate this design. Please try again.</p>
//       <div className="mt-4 p-4 border border-gray-300 rounded bg-gray-50 flex items-center justify-center h-32">
//         <p className="text-gray-400">Image area</p>
//       </div>
//     </div>
//   </div>
// );

const DynamicPostcardDesign: React.FC<GeneratedDesignProps> = ({
  designStyle,
  brandData,
  marketingData,
  audienceData,
  businessData,
  visualData,
  postcardProps
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designComponent, setDesignComponent] = useState<React.ComponentType<PostcardDesignProps> | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    codePreview?: string;
    hasJsx?: boolean;
    errorMessage?: string;
  }>({});

  // Create placeholder design immediately
  const PlaceholderDesign: React.FC<PostcardDesignProps> = (props) => (
    <div 
      className={`relative border-2 ${props.isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
        rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-white`}
      onClick={props.onSelect}
    >
      <div className="p-5 flex flex-col h-full">
        {/* Header with brand and tagline */}
        <div className="mb-4">
          <h3 className="text-gray-800 font-bold text-lg">{props.brandName || brandData.brandName}</h3>
          <p className="text-gray-600 text-sm italic">{props.tagline || businessData.tagline}</p>
        </div>
        
        {/* Image placeholder */}
        <div className="flex-grow flex items-center justify-center bg-gray-100 rounded relative mb-4 overflow-hidden">
          {props.imageUrl ? (
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url(${props.imageUrl})`,
                x: props.imagePosition.x,
                y: props.imagePosition.y,
                scale: props.imagePosition.scale,
              }}
              drag={props.isSelected}
              dragMomentum={false}
              onDragEnd={(_, info) => props.onDragEnd && props.onDragEnd({ offset: { x: info.offset.x, y: info.offset.y } })}
            />
          ) : (
            <div className="text-gray-400">Image loading...</div>
          )}
        </div>
        
        {/* Call to action */}
        <div className="bg-gray-800 text-white p-2 rounded text-center text-sm">
          {props.callToAction || marketingData.callToAction}
        </div>
        
        {/* Contact Info */}
        <div className="mt-3 text-xs text-gray-600">
          {props.contactInfo?.phone && <p>{props.contactInfo.phone}</p>}
          {props.contactInfo?.website && <p>{props.contactInfo.website}</p>}
        </div>
      </div>
    </div>
  );

  // Create error component to display debugging information
  const ErrorDesign: React.FC<PostcardDesignProps & { onReload?: () => void }> = (props) => (
  <div 
    className={`relative border-2 border-red-500 
      rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-white`}
    onClick={props.onSelect}
  >
    <div className="p-5 flex flex-col h-full">
      <h3 className="text-red-600 font-bold text-lg">Design Generation Error</h3>
      <p className="text-gray-800 text-sm mb-2">{error || "Failed to generate design"}</p>
      
      {debugInfo.errorMessage && (
        <div className="mb-3 text-xs">
          <p className="font-semibold">Error: {debugInfo.errorMessage}</p>
        </div>
      )}
      
      {debugInfo.codePreview && (
        <div className="mb-3">
          <p className="text-xs font-semibold">Code preview:</p>
          <div className="bg-gray-100 p-2 text-xs font-mono overflow-auto max-h-20 rounded">
            {debugInfo.codePreview.substring(0, 200)}...
          </div>
        </div>
      )}
      
      {props.onReload && (
        <button
          className="mt-auto mb-2 py-2 px-4 bg-electric-teal text-white rounded hover:bg-electric-teal/80 transition-colors"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the parent onClick
            props.onReload?.();
          }}
        >
          Try Again
        </button>
      )}
      
      <p className="text-xs text-gray-600">Using fallback design in the meantime</p>
    </div>
  </div>
);

useEffect(() => {
  const generateDesign = async () => {
    try {
      setError(null);

      console.log(`Generating ${designStyle} design...`);
      
      // Call Claude API to generate the design
      const result = await generatePostcardDesign({
        brandData,
        marketingData,
        audienceData,
        businessData,
        visualData,
        designStyle
      });

      console.log("API response:", {
        success: result.success,
        hasCompletion: !!result.completion,
        error: result.error || 'none',
        completionLength: result.completion?.length || 0
      });

      if (!result.success || !result.completion) {
        throw new Error(result.error || 'Failed to generate design');
      }

      // Extract the component code from the response
      const componentCode = extractComponentCode(result.completion);
      
      if (!componentCode) {
        throw new Error('Failed to extract component code from response');
      }

      // More detailed debugging
      console.log('Component code length:', componentCode.length);
      console.log('Component code preview (first 100 chars):', componentCode.substring(0, 100) + '...');
      console.log('Component code preview (last 100 chars):', componentCode.substring(componentCode.length - 100) + '...');
      console.log('Contains JSX tags:', componentCode.includes('<div'), componentCode.includes('</div>'));
      console.log('Contains React import:', componentCode.includes('import React'));
      
      // Create a component from the code
      try {
        // Attempt to use the Function constructor to evaluate the component code
        console.log('Attempting to create component from dynamic code');
        
        try {
          // Remove import statements from the code before evaluation
          const cleanedCode = componentCode
            .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
            .replace(/import\s+{.*?}\s+from\s+['"].*?['"];?/g, '')
            .trim();
          
          // Enhanced debugging - log more detailed info about the code
          console.log('Cleaned code length:', cleanedCode.length);
          console.log('Cleaned code (first 100 chars):', cleanedCode.substring(0, 100) + '...');
          
          // More robust JSX detection
          const hasJsx = 
            (cleanedCode.includes('<') && (cleanedCode.includes('/>') || cleanedCode.includes('</div>'))) ||
            cleanedCode.includes('React.createElement') ||
            cleanedCode.includes('<>') || // Fragment syntax
            /return\s+</.test(cleanedCode); // JSX in return statement
            
          console.log('Code contains JSX?', hasJsx);
          
          // Additional syntax analysis
          const functionDefCheck = cleanedCode.match(/function\s+(\w+)/);
          const constArrowCheck = cleanedCode.match(/const\s+(\w+)\s*=\s*\(/);
          console.log('Function definition found:', functionDefCheck ? functionDefCheck[0] : 'None');
          console.log('Arrow function definition found:', constArrowCheck ? constArrowCheck[0] : 'None');
          
          // Store debug info
          setDebugInfo({
            codePreview: cleanedCode,
            hasJsx,
            errorMessage: hasJsx ? 'Code contains JSX which cannot be evaluated with Function constructor' : undefined
          });
          
          // Check if code contains JSX before attempting to use Function constructor
          if (hasJsx) {
            console.log('Code likely contains JSX, using fallback component instead');
            throw new Error('Code contains JSX which cannot be evaluated with Function constructor');
          }
          
          // Use Function constructor to evaluate the component code
          const ComponentFunction = new Function(
            'React', 'motion', 'postcardProps',
            `
            try {
              // Find the PostcardDesign component declaration
              ${cleanedCode}
              
              // Safety check - make sure PostcardDesign exists
              if (typeof PostcardDesign !== 'function') {
                console.error('PostcardDesign component not found in generated code');
                return null;
              }
              
              return React.createElement(PostcardDesign, postcardProps);
            } catch (err) {
              console.error("Error in dynamic component:", err);
              return null;
            }
            `
          );
          
          // Create a wrapper component that calls the generated component
          const WrappedComponent = (props: PostcardDesignProps) => {
            try {
              return ComponentFunction(React, motion, props);
            } catch (err) {
              console.error('Error rendering generated component:', err);
              return <ErrorDesign {...props} />;
            }
          };
          
          setDesignComponent(() => WrappedComponent);
        } catch (dynamicError) {
          console.error('Failed to create component dynamically:', dynamicError);
          console.log('Falling back to hardcoded component');
          
          // Store error message in debug info
          setDebugInfo(prev => ({
            ...prev,
            errorMessage: dynamicError instanceof Error ? dynamicError.message : 'Unknown dynamic component error'
          }));
          
          // Fallback to hardcoded component
          const WrappedComponent = (props: PostcardDesignProps) => {
            const colors = {
              bg: designStyle === 'professional' ? '#f8f9fa' : designStyle === 'modern' ? '#2d3748' : '#f7f7f7',
              primary: designStyle === 'professional' ? '#1a365d' : designStyle === 'modern' ? '#38b2ac' : '#7c3aed',
              secondary: designStyle === 'professional' ? '#2c5282' : designStyle === 'modern' ? '#234e52' : '#4c1d95',
              text: designStyle === 'professional' ? '#2d3748' : designStyle === 'modern' ? '#e2e8f0' : '#1e293b'
            };
          
            return (
              <div 
                className={`relative border-2 ${props.isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
                  rounded-lg overflow-hidden cursor-pointer`}
                style={{ backgroundColor: colors.bg }}
                onClick={props.onSelect}
              >
                <div className="p-4 flex flex-col h-full">
                  {/* Header */}
                  <div className="mb-3">
                    <h3 
                      className="font-bold text-xl mb-1" 
                      style={{ color: colors.primary }}
                    >
                      {props.brandName || brandData.brandName}
                    </h3>
                    <p 
                      className="text-sm italic" 
                      style={{ color: colors.secondary }}
                    >
                      {props.tagline || businessData.tagline}
                    </p>
                  </div>
                  
                  {/* Image area */}
                  <div className="w-full aspect-video bg-gray-200 relative overflow-hidden rounded mb-3">
                    {props.imageUrl ? (
                      <motion.div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${props.imageUrl})`,
                          x: props.imagePosition.x,
                          y: props.imagePosition.y,
                          scale: props.imagePosition.scale,
                        }}
                        drag={props.isSelected}
                        dragMomentum={false}
                        onDragEnd={(_, info) => props.onDragEnd && props.onDragEnd({ offset: { x: info.offset.x, y: info.offset.y } })}
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
                    {props.callToAction || marketingData.callToAction}
                  </div>
                  
                  {/* Contact info */}
                  <div className="mt-auto text-xs space-y-1" style={{ color: colors.text }}>
                    {props.contactInfo?.phone && <p>📞 {props.contactInfo.phone}</p>}
                    {props.contactInfo?.email && <p>✉️ {props.contactInfo.email}</p>}
                    {props.contactInfo?.website && <p>🌐 {props.contactInfo.website}</p>}
                    {props.contactInfo?.address && <p>📍 {props.contactInfo.address}</p>}
                    {props.extraInfo && <p className="italic">{props.extraInfo}</p>}
                  </div>
                </div>
              </div>
            );
          };
          
          setDesignComponent(() => WrappedComponent);
        }
      } catch (err) {
        console.error('Error creating component from code:', err);
        throw new Error('Failed to create component from generated code');
      }
    } catch (err) {
      console.error('Error in generateDesign:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Start with showing the placeholder immediately
  setTimeout(() => {
    generateDesign();
  }, 100);
}, [designStyle, brandData, marketingData, audienceData, businessData, visualData]);

// Handle reloading the design
const handleReload = () => {
  setLoading(true);
  setError(null);
  setDebugInfo({});
  
  setTimeout(() => {
    const generateDesign = async () => {
      try {
        setError(null);
        
        console.log(`Regenerating ${designStyle} design...`);
        
        // Call Claude API to generate the design
        const result = await generatePostcardDesign({
          brandData,
          marketingData,
          audienceData,
          businessData,
          visualData,
          designStyle
        });
        
        // Process result...
        // This is just a simplified version - the full implementation would copy all the logic from the useEffect
        if (!result.success || !result.completion) {
          throw new Error(result.error || 'Failed to generate design');
        }
        
        // ... rest of generation logic
        setError('Not implemented yet - please refresh the page');
      } catch (err) {
        console.error('Error in regenerateDesign:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    generateDesign();
  }, 100);
};

// Always show the placeholder while loading
if (loading) {
  return <PlaceholderDesign {...postcardProps} />;
}

if (error || !designComponent) {
  return <ErrorDesign {...postcardProps} onReload={handleReload} />;
}

const DynamicComponent = designComponent;
return <DynamicComponent {...postcardProps} />;
};

export default DynamicPostcardDesign; 