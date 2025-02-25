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
const ErrorDesign: React.FC<PostcardDesignProps> = ({
  isSelected,
  onSelect,
  brandName
}) => (
  <div 
    className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-red-500'} 
      rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-gray-100`}
    onClick={onSelect}
  >
    <div className="p-4">
      <h3 className="text-red-500 font-bold">{brandName || 'Error'}</h3>
      <p className="text-sm text-gray-700">Sorry, we couldn&apos;t generate this design. Please try again.</p>
      <div className="mt-4 p-4 border border-gray-300 rounded bg-gray-50 flex items-center justify-center h-32">
        <p className="text-gray-400">Image area</p>
      </div>
    </div>
  </div>
);

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

        // Debug: Log the first 100 characters of component code to see what we're getting
        console.log('Component code preview:', componentCode.substring(0, 100) + '...');
        
        // Create a component from the code
        try {
          // Attempt to use the Function constructor to evaluate the component code
          console.log('Attempting to create component from dynamic code');
          
          try {
            // Use Function constructor to evaluate the component code
            const ComponentFunction = new Function(
              'React', 'motion', 'postcardProps',
              `
              ${componentCode}
              return React.createElement(PostcardDesign, postcardProps);
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

  // Always show the placeholder while loading
  if (loading) {
    return <PlaceholderDesign {...postcardProps} />;
  }

  if (error || !designComponent) {
    return <ErrorDesign {...postcardProps} />;
  }

  const DynamicComponent = designComponent;
  return <DynamicComponent {...postcardProps} />;
};

export default DynamicPostcardDesign; 