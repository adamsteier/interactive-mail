'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';
type ImageStyle = 'photo-realistic' | 'illustration' | 'abstract' | 'none';

// Define data types to match the ones in previous components
interface BrandData {
  hasBrandGuidelines: boolean;
  primaryColor: string;
  accentColor: string;
  stylePreferences: BrandStylePreference[];
  additionalNotes: string;
}

interface MarketingData {
  objectives: MarketingObjective[];
  otherObjective: string;
  callToAction: string;
  useAiCta: boolean;
}

interface AudienceData {
  industry: string;
  targetMarket: string;
  demographicAge: string[];
  demographicIncome: string[];
  painPoints: string;
  interests: string;
}

interface BusinessData {
  tagline: string;
  useAiTagline: boolean;
  phone: string;
  website: string;
  email: string;
  address: string;
  hoursOfOperation: string;
  disclaimer: string;
  includeQrCode: boolean;
  qrCodeUrl: string;
}

interface VisualData {
  imageStyle: ImageStyle;
  useAiGenerated: boolean;
  imagePrompt: string;
  uploadedImage?: File | null;
  includeProductImage: boolean;
  layoutPreference: string;
  colorTheme: string;
}

interface MarketingCopy {
  headline: string;
  subheadline: string;
  bodyText: string;
}

interface ReviewData {
  selectedMarketingCopy: MarketingCopy;
  useAiCopy: boolean;
  notes: string;
}

interface ReviewGenerateProps {
  onComplete: (reviewData: ReviewData) => void;
  initialData?: Partial<ReviewData>;
  currentSegment?: string;
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
}

// Sample AI-generated marketing copy variations
const generateMarketingCopyVariations = (
  industryName: string, 
  objectives: MarketingObjective[], 
  targetMarket: string, 
  callToAction: string,
  tagline: string
): MarketingCopy[] => {
  // Base copy variations that will be customized
  const variations: MarketingCopy[] = [
    {
      headline: `Transform Your ${industryName} Experience`,
      subheadline: `Discover why customers choose us`,
      bodyText: `We understand what ${targetMarket} needs. Our dedicated team provides solutions that make a difference. ${tagline}`
    },
    {
      headline: `Expert ${industryName} Solutions`,
      subheadline: `Tailored for your specific needs`,
      bodyText: `Looking for quality service in ${industryName}? We deliver results that exceed expectations. ${tagline}`
    },
    {
      headline: `${industryName} Done Right`,
      subheadline: `The trusted choice for ${targetMarket}`,
      bodyText: `When it comes to ${industryName}, experience matters. Our approach ensures you get exactly what you need. ${tagline}`
    }
  ];

  // Customize variations based on marketing objectives
  if (objectives.includes('promotion')) {
    variations[0].headline = `Special Offer: ${industryName} Savings`;
    variations[0].subheadline = `Limited time opportunity`;
    variations[0].bodyText = `Don't miss this chance to save on our premium ${industryName} services. Act now before this offer expires! ${tagline}`;
  } else if (objectives.includes('awareness')) {
    variations[1].headline = `Introducing Better ${industryName}`;
    variations[1].subheadline = `See what makes us different`;
    variations[1].bodyText = `New to our ${industryName} services? Discover how we stand out from the competition with our unique approach. ${tagline}`;
  } else if (objectives.includes('event')) {
    variations[2].headline = `Join Our ${industryName} Event`;
    variations[2].subheadline = `An exclusive opportunity`;
    variations[2].bodyText = `Be part of something special. Our upcoming event showcases the best in ${industryName}. Save the date and don't miss out! ${tagline}`;
  }

  // Add call-to-action to each variation
  variations.forEach(variation => {
    variation.bodyText = `${variation.bodyText}\n\n${callToAction}`;
  });

  return variations;
};

const ReviewGenerate = ({ 
  onComplete, 
  initialData = {},
  currentSegment,
  brandData,
  marketingData,
  audienceData,
  businessData,
  visualData
}: ReviewGenerateProps) => {
  // Generate marketing copy variations based on user inputs
  const marketingCopyVariations = generateMarketingCopyVariations(
    audienceData.industry,
    marketingData.objectives,
    audienceData.targetMarket,
    marketingData.callToAction,
    businessData.tagline
  );
  
  const [reviewData, setReviewData] = useState<ReviewData>({
    selectedMarketingCopy: initialData.selectedMarketingCopy ?? marketingCopyVariations[0],
    useAiCopy: initialData.useAiCopy ?? true,
    notes: initialData.notes ?? ''
  });
  
  const [selectedVariation, setSelectedVariation] = useState<number>(0);
  
  const handleSubmit = () => {
    onComplete(reviewData);
  };

  const selectVariation = (index: number) => {
    setSelectedVariation(index);
    setReviewData(prev => ({
      ...prev,
      selectedMarketingCopy: marketingCopyVariations[index],
      useAiCopy: true
    }));
  };

  // If we're focused on a specific business segment, show it
  const segmentHeader = currentSegment && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-3 border-l-4 border-electric-teal bg-electric-teal/5 rounded-r-lg"
    >
      <p className="text-electric-teal text-sm">
        Creating postcard for segment:
      </p>
      <h3 className="text-electric-teal text-lg font-semibold">
        {currentSegment}
      </h3>
    </motion.div>
  );

  const summarySection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Design Summary</h3>
      
      <div className="bg-charcoal/30 border border-electric-teal/20 rounded-lg p-4 space-y-6">
        <div>
          <h4 className="text-lg text-electric-teal mb-2">Brand Elements</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-electric-teal/70 text-sm">Brand Colors:</p>
              <div className="flex items-center gap-3 mt-1">
                <div 
                  className="w-6 h-6 rounded-full border border-white/10"
                  style={{ backgroundColor: brandData.primaryColor }}
                ></div>
                <div 
                  className="w-6 h-6 rounded-full border border-white/10"
                  style={{ backgroundColor: brandData.accentColor }}
                ></div>
              </div>
            </div>
            <div>
              <p className="text-electric-teal/70 text-sm">Style:</p>
              <p className="text-electric-teal">
                {brandData.stylePreferences.map(style => 
                  style.charAt(0).toUpperCase() + style.slice(1)
                ).join(', ')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg text-electric-teal mb-2">Marketing Focus</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-electric-teal/70 text-sm">Objectives:</p>
              <p className="text-electric-teal">
                {marketingData.objectives.map(obj => 
                  obj === 'awareness' ? 'Brand Awareness' :
                  obj === 'promotion' ? 'Promotion/Sale' :
                  obj === 'traffic' ? 'Website Traffic' :
                  obj === 'event' ? 'Event Promotion' :
                  'Custom Objective'
                ).join(', ')}
              </p>
            </div>
            <div>
              <p className="text-electric-teal/70 text-sm">Call to Action:</p>
              <p className="text-electric-teal">{marketingData.callToAction}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg text-electric-teal mb-2">Audience & Business</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-electric-teal/70 text-sm">Industry:</p>
              <p className="text-electric-teal">{audienceData.industry}</p>
            </div>
            <div>
              <p className="text-electric-teal/70 text-sm">Business Tagline:</p>
              <p className="text-electric-teal">{businessData.tagline || '(None provided)'}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-lg text-electric-teal mb-2">Visual Design</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-electric-teal/70 text-sm">Image Style:</p>
              <p className="text-electric-teal">{
                visualData.imageStyle === 'photo-realistic' ? 'Photo-Realistic' :
                visualData.imageStyle === 'illustration' ? 'Illustrated/Vector' :
                visualData.imageStyle === 'abstract' ? 'Abstract/Artistic' :
                'No Image'
              }</p>
            </div>
            <div>
              <p className="text-electric-teal/70 text-sm">Layout:</p>
              <p className="text-electric-teal">{visualData.layoutPreference}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const marketingCopySection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">AI-Generated Marketing Copy</h3>
      <p className="text-electric-teal/70 mb-6">
        Based on your inputs, here are some marketing copy options for your postcard.
        Select the one you prefer.
      </p>
      
      <div className="space-y-4 mb-8">
        {marketingCopyVariations.map((copy, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => selectVariation(index)}
            className={`p-4 rounded-lg border-2 cursor-pointer ${
              selectedVariation === index
                ? 'border-electric-teal bg-electric-teal/10' 
                : 'border-electric-teal/30 hover:border-electric-teal/60'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${selectedVariation === index 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {selectedVariation === index && (
                  <div className="w-3 h-3 rounded-full bg-electric-teal"></div>
                )}
              </div>
              <h4 className="text-lg font-medium text-electric-teal">Option {index + 1}</h4>
            </div>
            
            <div className="pl-7 space-y-2">
              <p className="text-electric-teal font-semibold">{copy.headline}</p>
              <p className="text-electric-teal/80 italic">{copy.subheadline}</p>
              <p className="text-electric-teal/70 text-sm">{copy.bodyText}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div>
        <label className="block text-electric-teal mb-3">
          Additional notes or requests:
        </label>
        <textarea
          value={reviewData.notes}
          onChange={(e) => setReviewData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any additional notes about your design preferences or special requests..."
          className="w-full h-32 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
            text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
            focus:outline-none transition-colors"
        />
      </div>
    </motion.div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-electric-teal mb-2">
            Review & Generate
          </h2>
          <p className="text-electric-teal/70">
            Review your selections and marketing copy before generating your postcard design.
          </p>
        </div>
      </motion.div>

      {segmentHeader}
      {summarySection}
      {marketingCopySection}

      <div className="flex justify-end mt-8">
        <button
          onClick={handleSubmit}
          className="px-8 py-3 rounded-lg font-medium bg-electric-teal text-charcoal hover:bg-electric-teal/90 transition-colors duration-200"
        >
          Generate Postcard Design
        </button>
      </div>
    </div>
  );
};

export default ReviewGenerate; 