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

// Fallback loading component
const LoadingDesign: React.FC<PostcardDesignProps> = ({
  isSelected,
  onSelect
}) => (
  <div 
    className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
      rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-gray-100`}
    onClick={onSelect}
  >
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-pink-400 via-electric-teal to-pink-500"
      animate={{
        x: ['0%', '100%', '0%'],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
      Generating Design...
    </div>
  </div>
);

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

  useEffect(() => {
    const generateDesign = async () => {
      try {
        setLoading(true);
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

        if (!result.success || !result.completion) {
          throw new Error(result.error || 'Failed to generate design');
        }

        // Extract the component code from the response
        const componentCode = extractComponentCode(result.completion);
        
        if (!componentCode) {
          throw new Error('Failed to extract component code from response');
        }

        // Create a component from the code
        try {
          // Use Function constructor to evaluate the component code
          // Note: This is a potential security risk if the API is not trusted
          // In production, you might want to use a different approach
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

    generateDesign();
  }, [designStyle, brandData, marketingData, audienceData, businessData, visualData]);

  if (loading) {
    return <LoadingDesign {...postcardProps} />;
  }

  if (error || !designComponent) {
    return <ErrorDesign {...postcardProps} />;
  }

  const DynamicComponent = designComponent;
  return <DynamicComponent {...postcardProps} />;
};

export default DynamicPostcardDesign; 