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
  visualData
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold text-electric-teal mb-6">
        Your Selected Postcard Designs
      </h2>
      
      <div className="space-y-8 mb-8">
        {designs.map((design, index) => {
          if (design.selectedImageIndex === null) return null;
          
          const imageUrl = images[design.selectedImageIndex];
          const designLabel = `${templateStyle.charAt(0).toUpperCase() + templateStyle.slice(1)} - ${getCreativityDescription(design.creativityLevel)}`;
          
          return (
            <div key={design.id} className="space-y-2">
              <h3 className="text-lg font-semibold text-electric-teal">Design {index + 1}: {designLabel}</h3>
              <div className="border border-electric-teal/30 rounded-lg p-4">
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
          );
        })}
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