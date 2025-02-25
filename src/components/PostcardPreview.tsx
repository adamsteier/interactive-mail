'use client';

import React from 'react';
import { motion } from 'framer-motion';
import DynamicPostcardDesign from './DynamicPostcardDesign';
import type { BrandData, MarketingData, AudienceData, BusinessData, VisualData } from '../services/claude';

interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

interface PostcardDesign {
  id: string;
  layout: 'layout1' | 'layout2' | 'layout3';
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
  const getDesignStyle = (layout: string) => {
    switch (layout) {
      case 'layout1': return 'professional';
      case 'layout2': return 'modern';
      case 'layout3': return 'elegant';
      default: return 'professional';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg"
    >
      <h2 className="text-2xl font-bold text-electric-teal mb-4 text-center">
        Your Postcard Designs
      </h2>
      <p className="text-electric-teal/70 mb-8 text-center">
        Your postcard designs have been generated successfully!
      </p>
      
      <div className="space-y-12 mb-8">
        {designs.map((design, index) => {
          if (design.selectedImageIndex === null) return null;
          
          const imageUrl = images[design.selectedImageIndex];
          const designStyle = getDesignStyle(design.layout);
          const designLabel = designStyle.charAt(0).toUpperCase() + designStyle.slice(1);
          
          return (
            <div key={design.id} className="space-y-2">
              <h3 className="text-lg font-semibold text-electric-teal">Design {index + 1}: {designLabel}</h3>
              <div className="border border-electric-teal/30 rounded-lg p-4">
                <DynamicPostcardDesign
                  designStyle={getDesignStyle(design.layout) as 'professional' | 'modern' | 'elegant'}
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
                    brandName: brandName,
                    tagline: tagline,
                    contactInfo: contactInfo,
                    callToAction: callToAction,
                    extraInfo: extraInfo
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-electric-teal/70">
          <p className="text-sm">Next Steps:</p>
          <p className="text-xs">These designs are ready to be printed and mailed to your target audience.</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-6 py-3 bg-electric-teal text-charcoal font-semibold rounded-lg"
        >
          Return to Dashboard
        </motion.button>
      </div>
    </motion.div>
  );
};

export default PostcardPreview; 