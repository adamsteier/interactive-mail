'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PostcardGeneration from './PostcardGeneration';
import PostcardPreview from './PostcardPreview';

// Define local types to avoid import issues
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';
type ImageStyle = 'photograph' | 'illustration' | 'abstract' | 'minimal';
type LayoutStyle = 'clean' | 'bold' | 'elegant' | 'playful';
type ImageSource = 'ai' | 'stock' | 'upload';
type CreativityLevel = 'template' | 'creative' | 'very_creative';

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
  objectiveDetails?: {
    awareness?: string;
    promotion?: string;
    traffic?: string;
    event?: string;
    other?: string;
  };
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

// Modal types to keep track of which section is being edited
type EditModalType = 'brand' | 'marketing' | 'audience' | 'business' | 'visual' | null;

// Generation step tracking
type GenerationStep = 'review' | 'generating' | 'complete';

interface PostcardDesign {
  id: string;
  creativityLevel: CreativityLevel;
  selectedImageIndex: number | null;
  imagePosition: {
    x: number;
    y: number;
    scale: number;
  };
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

// Edit icon component for consistency
const EditIcon = ({ onClick }: { onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="ml-2 p-1 text-electric-teal/70 hover:text-electric-teal hover:bg-electric-teal/10 rounded-full transition-colors"
    aria-label="Edit"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  </button>
);

// Modal component for editing sections
const EditModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode 
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-charcoal/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-charcoal border-2 border-electric-teal rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="sticky top-0 bg-charcoal border-b border-electric-teal/30 p-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-electric-teal">{title}</h3>
            <button 
              onClick={onClose}
              className="text-electric-teal/70 hover:text-electric-teal p-1 rounded-full hover:bg-electric-teal/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
          <div className="border-t border-electric-teal/30 p-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-electric-teal text-charcoal rounded-lg font-medium"
            >
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
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
  const [activeModal, setActiveModal] = useState<EditModalType>(null);
  const [generationStep, setGenerationStep] = useState<GenerationStep>('review');
  const [selectedPostcards, setSelectedPostcards] = useState<PostcardDesign[]>([]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
  // Copies of data for editing in modals
  const [editBrandData, setEditBrandData] = useState<BrandData>(brandData);
  const [editMarketingData, setEditMarketingData] = useState<MarketingData>(marketingData);
  const [editAudienceData, setEditAudienceData] = useState<AudienceData>(audienceData);
  const [editBusinessData, setEditBusinessData] = useState<BusinessData>(businessData);
  const [editVisualData, setEditVisualData] = useState<VisualData>(visualData);

  // Reset edit data when modal opens
  const openModal = (modalType: EditModalType) => {
    // Reset the edit data based on the current data
    switch (modalType) {
      case 'brand':
        setEditBrandData({...brandData});
        break;
      case 'marketing':
        setEditMarketingData({...marketingData});
        break;
      case 'audience':
        setEditAudienceData({...audienceData});
        break;
      case 'business':
        setEditBusinessData({...businessData});
        break;
      case 'visual':
        setEditVisualData({...visualData});
        break;
    }
    setActiveModal(modalType);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const handleGenerate = () => {
    setGenerationStep('generating');
  };
  
  const handleGenerationComplete = (postcards: PostcardDesign[], images: string[]) => {
    setSelectedPostcards(postcards);
    setGeneratedImages(images);
    setGenerationStep('complete');
    onGenerate();
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

  // Section headers with edit icons
  const SectionHeader = ({ title, onEdit }: { title: string; onEdit: () => void }) => (
    <div className="flex items-center mb-3">
      <h3 className="text-xl font-semibold text-electric-teal">{title}</h3>
      <EditIcon onClick={onEdit} />
    </div>
  );

  if (generationStep === 'generating') {
    return (
      <PostcardGeneration 
        brandData={brandData}
        marketingData={marketingData}
        audienceData={audienceData}
        businessData={businessData}
        visualData={visualData}
        onBack={() => setGenerationStep('review')}
        onComplete={handleGenerationComplete}
      />
    );
  }
  
  // If we're in the complete state but still on this page, show the preview
  if (generationStep === 'complete') {
    return (
      <PostcardPreview
        designs={selectedPostcards}
        images={generatedImages}
        brandName={brandData.brandName}
        tagline={businessData.tagline}
        contactInfo={businessData.contactInfo}
        callToAction={marketingData.callToAction}
        extraInfo={businessData.extraInfo || ''}
        onBack={onBack}
        brandData={brandData}
        marketingData={marketingData}
        audienceData={audienceData}
        businessData={businessData}
        visualData={visualData}
      />
    );
  }

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
        <SectionHeader title="Brand Identity" onEdit={() => openModal('brand')} />
        
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

          {brandData.logoUrl && (
            <div>
              <p className="text-white text-sm mb-1">Logo</p>
              <img 
                src={brandData.logoUrl} 
                alt="Brand Logo" 
                className="h-12 object-contain bg-white/10 rounded p-1"
              />
            </div>
          )}
        </div>
      </section>

      {/* Marketing Data */}
      <section className="mb-8 border border-electric-teal/30 rounded-lg p-4">
        <SectionHeader title="Marketing Goals" onEdit={() => openModal('marketing')} />
        
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
          
          {marketingData.objectives.includes('awareness') && (
            <div>
              <p className="text-white text-sm mb-1">Brand Awareness Details</p>
              <p className="text-electric-teal">
                {marketingData.objectiveDetails?.awareness || 'Not specified'}
              </p>
            </div>
          )}
          
          {marketingData.objectives.includes('promotion') && (
            <div>
              <p className="text-white text-sm mb-1">Promotion Details</p>
              <p className="text-electric-teal">
                {marketingData.promotionDetails || marketingData.objectiveDetails?.promotion || 'Not specified'}
              </p>
            </div>
          )}
          
          {marketingData.objectives.includes('traffic') && (
            <div>
              <p className="text-white text-sm mb-1">Website Traffic Details</p>
              <p className="text-electric-teal">
                {marketingData.objectiveDetails?.traffic || 'Not specified'}
              </p>
            </div>
          )}
          
          {marketingData.objectives.includes('event') && (
            <div>
              <p className="text-white text-sm mb-1">Event Details</p>
              <p className="text-electric-teal">
                {marketingData.objectiveDetails?.event || 'Not specified'}
              </p>
            </div>
          )}
          
          {marketingData.objectives.includes('other') && (
            <div>
              <p className="text-white text-sm mb-1">Other Objective Details</p>
              <p className="text-electric-teal">
                {marketingData.objectiveDetails?.other || 'Not specified'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Audience Data */}
      <section className="mb-8 border border-electric-teal/30 rounded-lg p-4">
        <SectionHeader title="Target Audience" onEdit={() => openModal('audience')} />
        
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
        <SectionHeader title="Business Details" onEdit={() => openModal('business')} />
        
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
        <SectionHeader title="Visual Elements" onEdit={() => openModal('visual')} />
        
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

      {/* Edit Modals */}
      {/* Brand Edit Modal */}
      <EditModal 
        isOpen={activeModal === 'brand'} 
        onClose={closeModal} 
        title="Edit Brand Identity"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-electric-teal mb-2">Brand Name</label>
            <input
              type="text"
              value={editBrandData.brandName}
              onChange={(e) => setEditBrandData({...editBrandData, brandName: e.target.value})}
              className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                text-electric-teal focus:border-electric-teal focus:outline-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-electric-teal mb-2">Primary Color</label>
              <input
                type="color"
                value={editBrandData.primaryColor}
                onChange={(e) => setEditBrandData({...editBrandData, primaryColor: e.target.value})}
                className="w-full h-10"
              />
            </div>
            
            <div>
              <label className="block text-electric-teal mb-2">Accent Color</label>
              <input
                type="color"
                value={editBrandData.accentColor}
                onChange={(e) => setEditBrandData({...editBrandData, accentColor: e.target.value})}
                className="w-full h-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-electric-teal mb-2">Style Preferences</label>
            <div className="grid grid-cols-2 gap-2">
              {['playful', 'professional', 'modern', 'traditional'].map((style) => (
                <label key={style} className="flex items-center space-x-2 p-2 rounded hover:bg-charcoal-light">
                  <input
                    type="checkbox"
                    checked={editBrandData.stylePreferences.includes(style as BrandStylePreference)}
                    onChange={(e) => {
                      const newPreferences = e.target.checked
                        ? [...editBrandData.stylePreferences, style as BrandStylePreference]
                        : editBrandData.stylePreferences.filter(s => s !== style);
                      setEditBrandData({...editBrandData, stylePreferences: newPreferences});
                    }}
                    className="text-electric-teal"
                  />
                  <span className="text-electric-teal capitalize">{style}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </EditModal>

      {/* Marketing Edit Modal */}
      <EditModal 
        isOpen={activeModal === 'marketing'} 
        onClose={closeModal} 
        title="Edit Marketing Goals"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-electric-teal mb-2">Marketing Objectives</label>
            <div className="space-y-2">
              {Object.entries(objectiveDetails).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2 p-2 rounded hover:bg-charcoal-light">
                  <input
                    type="checkbox"
                    checked={editMarketingData.objectives.includes(key as MarketingObjective)}
                    onChange={(e) => {
                      const newObjectives = e.target.checked
                        ? [...editMarketingData.objectives, key as MarketingObjective]
                        : editMarketingData.objectives.filter(o => o !== key);
                      setEditMarketingData({...editMarketingData, objectives: newObjectives});
                    }}
                    className="text-electric-teal"
                  />
                  <span className="text-electric-teal">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-electric-teal mb-2">Call to Action</label>
            <input
              type="text"
              value={editMarketingData.callToAction}
              onChange={(e) => setEditMarketingData({...editMarketingData, callToAction: e.target.value})}
              className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                text-electric-teal focus:border-electric-teal focus:outline-none"
              placeholder="e.g., Call today! Visit our website!"
            />
          </div>
          
          {editMarketingData.objectives.includes('awareness') && (
            <div>
              <label className="block text-electric-teal mb-2">Brand Awareness Details</label>
              <textarea
                value={editMarketingData.objectiveDetails?.awareness || ''}
                onChange={(e) => setEditMarketingData({
                  ...editMarketingData, 
                  objectiveDetails: {
                    ...editMarketingData.objectiveDetails,
                    awareness: e.target.value
                  }
                })}
                className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                  text-electric-teal focus:border-electric-teal focus:outline-none min-h-[100px]"
                placeholder="Describe your brand awareness goals"
              />
            </div>
          )}
          
          {editMarketingData.objectives.includes('promotion') && (
            <div>
              <label className="block text-electric-teal mb-2">Promotion Details</label>
              <textarea
                value={editMarketingData.objectiveDetails?.promotion || editMarketingData.promotionDetails || ''}
                onChange={(e) => setEditMarketingData({
                  ...editMarketingData,
                  promotionDetails: e.target.value,
                  objectiveDetails: {
                    ...editMarketingData.objectiveDetails,
                    promotion: e.target.value
                  }
                })}
                className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                  text-electric-teal focus:border-electric-teal focus:outline-none min-h-[100px]"
                placeholder="Describe your promotion or special offer"
              />
            </div>
          )}
          
          {editMarketingData.objectives.includes('traffic') && (
            <div>
              <label className="block text-electric-teal mb-2">Website Traffic Details</label>
              <textarea
                value={editMarketingData.objectiveDetails?.traffic || ''}
                onChange={(e) => setEditMarketingData({
                  ...editMarketingData,
                  objectiveDetails: {
                    ...editMarketingData.objectiveDetails,
                    traffic: e.target.value
                  }
                })}
                className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                  text-electric-teal focus:border-electric-teal focus:outline-none min-h-[100px]"
                placeholder="Describe your website traffic goals"
              />
            </div>
          )}
          
          {editMarketingData.objectives.includes('event') && (
            <div>
              <label className="block text-electric-teal mb-2">Event Details</label>
              <textarea
                value={editMarketingData.objectiveDetails?.event || ''}
                onChange={(e) => setEditMarketingData({
                  ...editMarketingData,
                  objectiveDetails: {
                    ...editMarketingData.objectiveDetails,
                    event: e.target.value
                  }
                })}
                className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                  text-electric-teal focus:border-electric-teal focus:outline-none min-h-[100px]"
                placeholder="Describe your event details"
              />
            </div>
          )}
          
          {editMarketingData.objectives.includes('event') && (
            <div>
              <label className="block text-electric-teal mb-2">Event Date</label>
              <input
                type="text"
                value={editMarketingData.eventDate || ''}
                onChange={(e) => setEditMarketingData({...editMarketingData, eventDate: e.target.value})}
                className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                  text-electric-teal focus:border-electric-teal focus:outline-none"
                placeholder="e.g., January 15, 2024"
              />
            </div>
          )}
          
          {editMarketingData.objectives.includes('other') && (
            <div>
              <label className="block text-electric-teal mb-2">Other Objective Details</label>
              <textarea
                value={editMarketingData.objectiveDetails?.other || ''}
                onChange={(e) => setEditMarketingData({
                  ...editMarketingData,
                  objectiveDetails: {
                    ...editMarketingData.objectiveDetails,
                    other: e.target.value
                  }
                })}
                className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                  text-electric-teal focus:border-electric-teal focus:outline-none min-h-[100px]"
                placeholder="Describe your other marketing objective"
              />
            </div>
          )}
        </div>
      </EditModal>

      {/* Audience Edit Modal */}
      <EditModal 
        isOpen={activeModal === 'audience'} 
        onClose={closeModal} 
        title="Edit Target Audience"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-electric-teal mb-2">Industry</label>
            <input
              type="text"
              value={editAudienceData.industry}
              onChange={(e) => setEditAudienceData({...editAudienceData, industry: e.target.value})}
              className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                text-electric-teal focus:border-electric-teal focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-electric-teal mb-2">Target Description</label>
            <textarea
              value={editAudienceData.targetDescription}
              onChange={(e) => setEditAudienceData({...editAudienceData, targetDescription: e.target.value})}
              className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                text-electric-teal focus:border-electric-teal focus:outline-none min-h-[100px]"
              placeholder="Describe your target audience"
            />
          </div>
          
          <div>
            <label className="block text-electric-teal mb-2">Age Ranges</label>
            <div className="grid grid-cols-3 gap-2">
              {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((range) => (
                <label key={range} className="flex items-center space-x-2 p-2 rounded hover:bg-charcoal-light">
                  <input
                    type="checkbox"
                    checked={editAudienceData.audienceAgeRange.includes(range)}
                    onChange={(e) => {
                      const newRanges = e.target.checked
                        ? [...editAudienceData.audienceAgeRange, range]
                        : editAudienceData.audienceAgeRange.filter(r => r !== range);
                      setEditAudienceData({...editAudienceData, audienceAgeRange: newRanges});
                    }}
                    className="text-electric-teal"
                  />
                  <span className="text-electric-teal">{range}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </EditModal>

      {/* Business Edit Modal */}
      <EditModal 
        isOpen={activeModal === 'business'} 
        onClose={closeModal} 
        title="Edit Business Details"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-electric-teal mb-2">Tagline</label>
            <input
              type="text"
              value={editBusinessData.tagline}
              onChange={(e) => setEditBusinessData({...editBusinessData, tagline: e.target.value})}
              className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                text-electric-teal focus:border-electric-teal focus:outline-none"
            />
            <label className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                checked={editBusinessData.useAiTagline}
                onChange={(e) => setEditBusinessData({...editBusinessData, useAiTagline: e.target.checked})}
                className="text-electric-teal"
              />
              <span className="text-electric-teal text-sm">Use AI-generated tagline</span>
            </label>
          </div>
          
          <div>
            <p className="block text-electric-teal mb-2">Contact Information</p>
            <div className="grid gap-4">
              <div>
                <label className="text-electric-teal/70 text-sm">Phone</label>
                <input
                  type="text"
                  value={editBusinessData.contactInfo.phone}
                  onChange={(e) => setEditBusinessData({
                    ...editBusinessData, 
                    contactInfo: {...editBusinessData.contactInfo, phone: e.target.value}
                  })}
                  className="w-full p-2 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                    text-electric-teal focus:border-electric-teal focus:outline-none"
                />
              </div>
              <div>
                <label className="text-electric-teal/70 text-sm">Email</label>
                <input
                  type="email"
                  value={editBusinessData.contactInfo.email}
                  onChange={(e) => setEditBusinessData({
                    ...editBusinessData, 
                    contactInfo: {...editBusinessData.contactInfo, email: e.target.value}
                  })}
                  className="w-full p-2 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                    text-electric-teal focus:border-electric-teal focus:outline-none"
                />
              </div>
              <div>
                <label className="text-electric-teal/70 text-sm">Website</label>
                <input
                  type="text"
                  value={editBusinessData.contactInfo.website}
                  onChange={(e) => setEditBusinessData({
                    ...editBusinessData, 
                    contactInfo: {...editBusinessData.contactInfo, website: e.target.value}
                  })}
                  className="w-full p-2 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                    text-electric-teal focus:border-electric-teal focus:outline-none"
                />
              </div>
              <div>
                <label className="text-electric-teal/70 text-sm">Address</label>
                <input
                  type="text"
                  value={editBusinessData.contactInfo.address}
                  onChange={(e) => setEditBusinessData({
                    ...editBusinessData, 
                    contactInfo: {...editBusinessData.contactInfo, address: e.target.value}
                  })}
                  className="w-full p-2 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                    text-electric-teal focus:border-electric-teal focus:outline-none"
                />
              </div>
            </div>
            <label className="flex items-center space-x-2 mt-2">
              <input
                type="checkbox"
                checked={editBusinessData.contactInfo.includeQR}
                onChange={(e) => setEditBusinessData({
                  ...editBusinessData, 
                  contactInfo: {...editBusinessData.contactInfo, includeQR: e.target.checked}
                })}
                className="text-electric-teal"
              />
              <span className="text-electric-teal text-sm">Include QR code</span>
            </label>
          </div>
        </div>
      </EditModal>

      {/* Visual Edit Modal */}
      <EditModal 
        isOpen={activeModal === 'visual'} 
        onClose={closeModal} 
        title="Edit Visual Elements"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-electric-teal mb-2">Image Style</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(imageStyleLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2 p-2 rounded hover:bg-charcoal-light">
                  <input
                    type="checkbox"
                    checked={editVisualData.imageStyle.includes(key as ImageStyle)}
                    onChange={(e) => {
                      const newStyles = e.target.checked
                        ? [...editVisualData.imageStyle, key as ImageStyle]
                        : editVisualData.imageStyle.filter(s => s !== key);
                      setEditVisualData({...editVisualData, imageStyle: newStyles});
                    }}
                    className="text-electric-teal"
                  />
                  <span className="text-electric-teal">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-electric-teal mb-2">Image Source</label>
            <div className="space-y-2">
              {Object.entries(imageSourceLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2 p-2 rounded hover:bg-charcoal-light">
                  <input
                    type="radio"
                    checked={editVisualData.imageSource === key as ImageSource}
                    onChange={() => setEditVisualData({...editVisualData, imageSource: key as ImageSource})}
                    className="text-electric-teal"
                  />
                  <span className="text-electric-teal">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-electric-teal mb-2">Primary Subject</label>
            <input
              type="text"
              value={editVisualData.imagePrimarySubject}
              onChange={(e) => setEditVisualData({...editVisualData, imagePrimarySubject: e.target.value})}
              className="w-full p-3 bg-charcoal-light border-2 border-electric-teal/50 rounded-lg
                text-electric-teal focus:border-electric-teal focus:outline-none"
              placeholder="e.g., product, people, landscape"
            />
          </div>
          
          <div>
            <label className="block text-electric-teal mb-2">Layout Style</label>
            <div className="space-y-2">
              {Object.entries(layoutStyleLabels).map(([key, label]) => (
                <label key={key} className="flex items-center space-x-2 p-2 rounded hover:bg-charcoal-light">
                  <input
                    type="radio"
                    checked={editVisualData.layoutStyle === key as LayoutStyle}
                    onChange={() => setEditVisualData({...editVisualData, layoutStyle: key as LayoutStyle})}
                    className="text-electric-teal"
                  />
                  <span className="text-electric-teal">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </EditModal>

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
          className="px-8 py-3 bg-electric-teal text-charcoal font-semibold rounded-lg"
        >
          Generate Postcards
        </motion.button>
      </div>
    </motion.div>
  );
};

export default ReviewGenerate; 