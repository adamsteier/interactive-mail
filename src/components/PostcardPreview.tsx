'use client';

import React from 'react';
import { motion } from 'framer-motion';
import DynamicPostcardDesign from './DynamicPostcardDesign';
import ZoomablePostcard from './ZoomablePostcard';
import type { BrandData, MarketingData, AudienceData, BusinessData, VisualData } from '../services/claude';

// Type definitions 
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type CreativityLevel = 'template' | 'creative' | 'very_creative';

interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

interface PostcardDesign {
  id: string;
  creativityLevel: CreativityLevel;
  selectedImageIndex: number | null;
  imagePosition: ImagePosition;
}

interface PostcardPreviewProps {
  designs: PostcardDesign[];
  images: string[];
  brandName: string;
  tagline: string;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: string;
  };
  callToAction: string;
  extraInfo: string;
  onBack: () => void;
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
  useFallbackDesigns?: boolean; // New prop to indicate if using fallback designs
}

const PostcardPreview: React.FC<PostcardPreviewProps> = ({
  designs,
  images,
  brandName,
  tagline,
  contactInfo,
  callToAction,
  extraInfo,
  onBack,
  brandData,
  marketingData,
  audienceData,
  businessData,
  visualData,
  useFallbackDesigns = false // Default to false
}) => {
  // Get the template style based on user's brand identity preference
  const templateStyle = brandData.stylePreferences?.[0] || 'professional';
  
  // Helper function to get a description for creativity level
  const getCreativityDescription = (level: CreativityLevel): string => {
    switch (level) {
      case 'template': return 'Standard';
      case 'creative': return 'Creative';
      case 'very_creative': return 'Very Creative';
      default: return 'Standard';
    }
  };

  // Get all the unique images used in the designs
  const uniqueImageIndices = Array.from(new Set(
    designs
      .filter(design => design.selectedImageIndex !== null)
      .map(design => design.selectedImageIndex as number)
  ));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold text-electric-teal mb-4">
        Your Selected Postcard Designs
      </h2>
      
      {/* Warning for fallback designs */}
      {useFallbackDesigns && (
        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-500 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-amber-500 mb-1">Using Fallback Designs</h3>
              <p className="text-electric-teal/80">
                We encountered an issue generating your custom AI designs. We&apos;re showing simplified fallback designs instead.
                Please try again later or contact support if this issue persists.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Description of the workflow */}
      <div className="mb-8 p-4 bg-charcoal-light rounded-lg border border-electric-teal/30">
        <h3 className="text-lg font-semibold text-electric-teal mb-2">Design Process Overview</h3>
        <p className="text-electric-teal/80 mb-3">
          Based on your inputs, we&apos;ve generated custom AI images that match your brand&apos;s style and marketing goals. 
          These images have been integrated into your selected postcard designs below.
        </p>
        <p className="text-electric-teal/80">
          You can review your final postcard designs below. Each design is fully interactive and zoomable to help you examine 
          every detail of your custom postcards.
        </p>
      </div>
      
      {/* AI-Generated Images Section - Sticky at the top */}
      <div className="sticky top-0 z-10 bg-charcoal pt-2 pb-4 border-b border-electric-teal/30 mb-6">
        <h3 className="text-xl font-semibold text-electric-teal mb-4">AI-Generated Images</h3>
        <div className="grid grid-cols-3 gap-4">
          {uniqueImageIndices.map((imageIndex) => (
            <div key={imageIndex} className="border border-electric-teal/30 rounded-lg overflow-hidden aspect-video">
              <img 
                src={images[imageIndex]} 
                alt={`Generated image ${imageIndex + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <div className="mt-2 p-2 bg-charcoal-light rounded-lg text-sm border border-electric-teal/30">
          <p className="text-electric-teal/80 font-medium">
            These images are used in your postcard designs below.
          </p>
        </div>
      </div>
      
      {/* Postcard Designs Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-electric-teal mb-4">Your Postcard Designs</h3>
        <p className="text-electric-teal/80 mb-4">
          Your postcards have been designed at our high-resolution print size (1872×1271 pixels) and feature the Lucide icon set for crisp, professional results.
          Use the zoom controls to examine the details of your design.
        </p>
        
        <div className="space-y-12">
          {designs.map((design, index) => {
            if (design.selectedImageIndex === null) return null;
            
            const imageUrl = images[design.selectedImageIndex];
            const designLabel = `${templateStyle.charAt(0).toUpperCase() + templateStyle.slice(1)} - ${getCreativityDescription(design.creativityLevel)}`;
            
            return (
              <div key={design.id} className="border-t border-electric-teal/30 pt-6 mb-12">
                <h4 className="text-lg font-semibold text-electric-teal mb-4">Design {index + 1}: {designLabel}</h4>
                <div className="flex justify-center">
                  <div className="max-w-5xl w-full border border-electric-teal/30 rounded-lg p-4">
                    <ZoomablePostcard>
                      <DynamicPostcardDesign
                        designStyle={templateStyle as BrandStylePreference}
                        creativityLevel={design.creativityLevel}
                        brandData={brandData}
                        marketingData={marketingData}
                        audienceData={audienceData}
                        businessData={businessData}
                        visualData={visualData}
                        postcardProps={{
                          imageUrl: imageUrl,
                          isSelected: false,
                          onSelect: () => {},
                          imagePosition: design.imagePosition,
                          onDragEnd: () => {},
                          brandName,
                          tagline,
                          contactInfo,
                          callToAction,
                          extraInfo,
                        }}
                      />
                    </ZoomablePostcard>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="text-center">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-6 py-3 bg-electric-teal text-charcoal font-semibold rounded-lg"
        >
          Back to Design Selection
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PostcardPreview; 