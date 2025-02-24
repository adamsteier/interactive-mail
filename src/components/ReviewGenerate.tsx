'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Define local types to avoid import issues
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';
type ImageStyle = 'photograph' | 'illustration' | 'abstract' | 'minimal';
type LayoutStyle = 'clean' | 'bold' | 'elegant' | 'playful';
type ImageSource = 'ai' | 'stock' | 'upload';

interface BrandData {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  brandValues: string[];
  stylePreferences: BrandStylePreference[];
  useExistingGuidelines: boolean;
  guidelinesNotes: string;
}

interface MarketingData {
  objectives: MarketingObjective[];
  callToAction: string;
  promotionDetails: string;
  eventDate: string;
  offerDetails: string;
  marketingObjectives: string;
}

interface AudienceData {
  industry: string;
  targetDescription: string;
  audienceAgeRange: string[];
  incomeLevel: string[];
  interests: string[];
  customAudience: boolean;
  customAudienceDescription: string;
}

interface BusinessData {
  tagline: string;
  useAiTagline: boolean;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: string;
    includeQR: boolean;
  };
  disclaimer: string;
  includeDisclaimer: boolean;
  extraInfo: string;
}

interface VisualData {
  imageStyle: ImageStyle[];
  imageSource: ImageSource;
  imagePrimarySubject: string;
  useCustomImage: boolean;
  customImageDescription: string;
  layoutStyle: LayoutStyle;
  colorSchemeConfirmed: boolean;
  customColorNotes: string;
}

interface ReviewGenerateProps {
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
  segment?: string;
  onGenerate: () => void;
  onBack: () => void;
}

const objectiveDetails: Record<MarketingObjective, string> = {
  awareness: 'Build brand recognition',
  promotion: 'Promote special offers',
  traffic: 'Drive traffic to website/store',
  event: 'Promote an event',
  other: 'Custom marketing objective'
};

const imageStyleLabels: Record<ImageStyle, string> = {
  photograph: 'Photographic',
  illustration: 'Illustration',
  abstract: 'Abstract',
  minimal: 'Minimal'
};

const layoutStyleLabels: Record<LayoutStyle, string> = {
  clean: 'Clean & Professional',
  bold: 'Bold & Striking',
  elegant: 'Elegant & Sophisticated',
  playful: 'Playful & Fun'
};

const imageSourceLabels: Record<ImageSource, string> = {
  ai: 'AI-generated imagery',
  stock: 'Stock photography',
  upload: 'Custom uploaded imagery'
};

const ReviewGenerate = ({
  brandData,
  marketingData,
  audienceData,
  businessData,
  visualData,
  segment,
  onGenerate,
  onBack
}: ReviewGenerateProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Simulate API call for generating the design
    setTimeout(() => {
      setIsGenerating(false);
      
      // Call the onGenerate callback
      onGenerate();
    }, 3000);
  };

  // Format the phone number for display
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    
    // Simple formatting for US numbers
    if (phone.length === 10) {
      return `(${phone.substring(0, 3)}) ${phone.substring(3, 6)}-${phone.substring(6)}`;
    }
    
    return phone;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-electric-teal mb-2">
          Review & Generate {segment ? `for ${segment}` : ''}
        </h2>
        <p className="text-electric-teal/70">
          Let&apos;s review your selections before we generate your postcard design
        </p>
      </div>

      {/* Brand Data */}
      <section className="mb-8 border border-electric-teal/30 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-electric-teal mb-3">Brand Identity</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-white text-sm mb-1">Brand Name</p>
            <p className="text-electric-teal">{brandData.brandName || 'Not specified'}</p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Brand Style</p>
            <p className="text-electric-teal">
              {brandData.stylePreferences.length > 0 
                ? brandData.stylePreferences.join(', ') 
                : 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Brand Colors</p>
            <div className="flex space-x-2 items-center">
              <div 
                className="w-6 h-6 rounded-full border border-white/20" 
                style={{ backgroundColor: brandData.primaryColor }}
              />
              <div 
                className="w-6 h-6 rounded-full border border-white/20" 
                style={{ backgroundColor: brandData.accentColor }}
              />
              <span className="text-electric-teal">
                {brandData.primaryColor}, {brandData.accentColor}
              </span>
            </div>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Brand Values</p>
            <p className="text-electric-teal">
              {brandData.brandValues.length > 0 
                ? brandData.brandValues.join(', ') 
                : 'Not specified'}
            </p>
          </div>
        </div>
      </section>

      {/* Marketing Data */}
      <section className="mb-8 border border-electric-teal/30 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-electric-teal mb-3">Marketing Goals</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-white text-sm mb-1">Marketing Objectives</p>
            <ul className="text-electric-teal list-disc list-inside">
              {marketingData.objectives.map(objective => (
                <li key={objective}>
                  {objectiveDetails[objective]}
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Call to Action</p>
            <p className="text-electric-teal">
              {marketingData.callToAction || 'Not specified'}
            </p>
          </div>
          
          {marketingData.objectives.includes('promotion') && (
            <div>
              <p className="text-white text-sm mb-1">Promotion Details</p>
              <p className="text-electric-teal">
                {marketingData.promotionDetails || 'Not specified'}
              </p>
            </div>
          )}
          
          {marketingData.objectives.includes('event') && (
            <div>
              <p className="text-white text-sm mb-1">Event Date</p>
              <p className="text-electric-teal">
                {marketingData.eventDate || 'Not specified'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Audience Data */}
      <section className="mb-8 border border-electric-teal/30 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-electric-teal mb-3">Target Audience</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-white text-sm mb-1">Industry</p>
            <p className="text-electric-teal">
              {audienceData.industry || 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Target Description</p>
            <p className="text-electric-teal">
              {audienceData.targetDescription || 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Age Range</p>
            <p className="text-electric-teal">
              {audienceData.audienceAgeRange.length > 0 
                ? audienceData.audienceAgeRange.join(', ') 
                : 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Income Level</p>
            <p className="text-electric-teal">
              {audienceData.incomeLevel.length > 0 
                ? audienceData.incomeLevel.join(', ') 
                : 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Interests</p>
            <p className="text-electric-teal">
              {audienceData.interests.length > 0 
                ? audienceData.interests.join(', ') 
                : 'Not specified'}
            </p>
          </div>
          
          {audienceData.customAudience && (
            <div>
              <p className="text-white text-sm mb-1">Custom Audience</p>
              <p className="text-electric-teal">
                {audienceData.customAudienceDescription || 'Not specified'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Business Data */}
      <section className="mb-8 border border-electric-teal/30 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-electric-teal mb-3">Business Details</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-white text-sm mb-1">Tagline</p>
            <p className="text-electric-teal">
              {businessData.tagline || 'Not specified'}
              {businessData.useAiTagline && ' (AI-generated tagline will be used)'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Contact Information</p>
            <ul className="text-electric-teal">
              {businessData.contactInfo.phone && (
                <li>📞 {formatPhone(businessData.contactInfo.phone)}</li>
              )}
              {businessData.contactInfo.email && (
                <li>✉️ {businessData.contactInfo.email}</li>
              )}
              {businessData.contactInfo.website && (
                <li>🌐 {businessData.contactInfo.website}</li>
              )}
              {businessData.contactInfo.address && (
                <li>📍 {businessData.contactInfo.address}</li>
              )}
            </ul>
            {businessData.contactInfo.includeQR && (
              <p className="text-electric-teal/70 text-sm mt-1">
                QR code will be included
              </p>
            )}
          </div>
          
          {businessData.includeDisclaimer && (
            <div>
              <p className="text-white text-sm mb-1">Disclaimer</p>
              <p className="text-electric-teal">
                {businessData.disclaimer || 'Not specified'}
              </p>
            </div>
          )}
          
          {businessData.extraInfo && (
            <div>
              <p className="text-white text-sm mb-1">Additional Information</p>
              <p className="text-electric-teal">
                {businessData.extraInfo}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Visual Data */}
      <section className="mb-8 border border-electric-teal/30 rounded-lg p-4">
        <h3 className="text-xl font-semibold text-electric-teal mb-3">Visual Elements</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-white text-sm mb-1">Image Style</p>
            <p className="text-electric-teal">
              {visualData.imageStyle.length > 0
                ? visualData.imageStyle.map(style => imageStyleLabels[style]).join(', ')
                : 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Image Source</p>
            <p className="text-electric-teal">
              {imageSourceLabels[visualData.imageSource]}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Primary Subject</p>
            <p className="text-electric-teal">
              {visualData.imagePrimarySubject || 'Not specified'}
            </p>
          </div>
          
          <div>
            <p className="text-white text-sm mb-1">Layout Style</p>
            <p className="text-electric-teal">
              {layoutStyleLabels[visualData.layoutStyle]}
            </p>
          </div>
          
          {visualData.customColorNotes && (
            <div className="col-span-2">
              <p className="text-white text-sm mb-1">Color Notes</p>
              <p className="text-electric-teal">
                {visualData.customColorNotes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-between mt-8">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-6 py-3 border border-electric-teal text-electric-teal rounded-lg"
        >
          Back to Edit
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          disabled={isGenerating}
          className="px-8 py-3 bg-electric-teal text-charcoal font-semibold rounded-lg disabled:opacity-70"
        >
          {isGenerating ? 'Generating...' : 'Generate Postcards'}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ReviewGenerate; 