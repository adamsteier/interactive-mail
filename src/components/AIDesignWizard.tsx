'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AudienceSegmentation from './AudienceSegmentation';
import BrandIdentity from './BrandIdentity';
import MarketingGoals from './MarketingGoals';
import TargetAudience from './TargetAudience';
import BusinessDetails from './BusinessDetails';
import VisualElements from './VisualElements';
import ReviewGenerate from './ReviewGenerate';
import { ImageStyle, ImageSource, LayoutStyle } from './VisualElements';
import { useMarketingStore } from '@/store/marketingStore';

// Define types locally to avoid import issues
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';
type DesignMethod = 'single' | 'multiple';

export type WizardStep = 
  | 'method'
  | 'segmentation'
  | 'brand'
  | 'marketing'
  | 'audience'
  | 'business'
  | 'visual'
  | 'review';

// Create type aliases that match component interfaces
type ComponentBrandData = {
  hasBrandGuidelines: boolean;
  primaryColor: string;
  accentColor: string;
  stylePreferences: BrandStylePreference[];
  additionalNotes: string;
  logoUrl: string;
  brandName: string;
};

type ComponentMarketingData = {
  objectives: MarketingObjective[];
  otherObjective: string;
  callToAction: string;
  useAiCta: boolean;
  objectiveDetails: {
    awareness: string;
    promotion: string;
    traffic: string;
    event: string;
    other: string;
  };
};

type ComponentBusinessData = {
  tagline: string;
  useAiTagline: boolean;
  contactInfo: {
    phone: string;
    website: string;
    email: string;
    address: string;
  };
  disclaimer: string;
  includeDisclaimer: boolean;
  extraInfo: string;
  includeQrCode: boolean;
  qrCodeUrl: string;
};

// Define wizard state interfaces
interface WizardBrandData {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  brandValues: string[];
  stylePreferences: BrandStylePreference[];
  useExistingGuidelines: boolean;
  guidelinesNotes: string;
}

interface WizardMarketingData {
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
}

interface WizardBusinessData {
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

interface WizardState {
  currentStep: WizardStep;
  selectedDesignMethod: DesignMethod | null;
  segments: string[];
  currentSegment: string | null;
  brandData: WizardBrandData;
  marketingData: WizardMarketingData;
  audienceData: AudienceData;
  businessData: WizardBusinessData;
  visualData: VisualData;
}

interface AIDesignWizardProps {
  onBack?: () => void;
}

// Type conversion functions
const toComponentBrandData = (wizardBrandData: WizardBrandData): ComponentBrandData => ({
  hasBrandGuidelines: wizardBrandData.useExistingGuidelines,
  primaryColor: wizardBrandData.primaryColor,
  accentColor: wizardBrandData.accentColor,
  stylePreferences: wizardBrandData.stylePreferences,
  additionalNotes: wizardBrandData.guidelinesNotes,
  logoUrl: wizardBrandData.logoUrl,
  brandName: wizardBrandData.brandName,
});

const toWizardBrandData = (componentBrandData: ComponentBrandData, current: WizardBrandData): WizardBrandData => ({
  ...current,
  useExistingGuidelines: componentBrandData.hasBrandGuidelines,
  primaryColor: componentBrandData.primaryColor,
  accentColor: componentBrandData.accentColor,
  stylePreferences: componentBrandData.stylePreferences,
  guidelinesNotes: componentBrandData.additionalNotes,
  logoUrl: componentBrandData.logoUrl,
  brandName: componentBrandData.brandName,
});

const toComponentMarketingData = (wizardMarketingData: WizardMarketingData): ComponentMarketingData => ({
  objectives: wizardMarketingData.objectives,
  otherObjective: '',
  callToAction: wizardMarketingData.callToAction,
  useAiCta: true,
  objectiveDetails: {
    awareness: '',
    promotion: wizardMarketingData.promotionDetails,
    traffic: '',
    event: wizardMarketingData.eventDate,
    other: '',
  },
});

const toWizardMarketingData = (componentMarketingData: ComponentMarketingData, current: WizardMarketingData): WizardMarketingData => ({
  ...current,
  objectives: componentMarketingData.objectives,
  callToAction: componentMarketingData.callToAction,
  promotionDetails: componentMarketingData.objectiveDetails.promotion,
  eventDate: componentMarketingData.objectiveDetails.event,
});

const toComponentBusinessData = (wizardBusinessData: WizardBusinessData): ComponentBusinessData => ({
  tagline: wizardBusinessData.tagline,
  useAiTagline: wizardBusinessData.useAiTagline,
  contactInfo: {
    phone: wizardBusinessData.contactInfo.phone,
    website: wizardBusinessData.contactInfo.website,
    email: wizardBusinessData.contactInfo.email,
    address: wizardBusinessData.contactInfo.address,
  },
  disclaimer: wizardBusinessData.disclaimer,
  includeDisclaimer: wizardBusinessData.includeDisclaimer,
  extraInfo: wizardBusinessData.extraInfo,
  includeQrCode: wizardBusinessData.contactInfo.includeQR,
  qrCodeUrl: '',
});

const toWizardBusinessData = (componentBusinessData: ComponentBusinessData, current: WizardBusinessData): WizardBusinessData => ({
  ...current,
  tagline: componentBusinessData.tagline,
  useAiTagline: componentBusinessData.useAiTagline,
  contactInfo: {
    ...current.contactInfo,
    phone: componentBusinessData.contactInfo.phone,
    website: componentBusinessData.contactInfo.website,
    email: componentBusinessData.contactInfo.email,
    address: componentBusinessData.contactInfo.address,
    includeQR: componentBusinessData.includeQrCode,
  },
  disclaimer: componentBusinessData.disclaimer,
  includeDisclaimer: componentBusinessData.includeDisclaimer,
  extraInfo: componentBusinessData.extraInfo,
});

const AIDesignWizard = ({ onBack }: AIDesignWizardProps) => {
  // Import marketing store to access business name and marketing strategy
  const businessName = useMarketingStore((state) => state.businessInfo.businessName);
  const marketingStrategy = useMarketingStore((state) => state.marketingStrategy);
  
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'method',
    selectedDesignMethod: null,
    segments: [],
    currentSegment: null,
    brandData: {
      brandName: '',
      logoUrl: '',
      primaryColor: '#00c2a8',
      accentColor: '#00858a',
      brandValues: [],
      stylePreferences: [],
      useExistingGuidelines: false,
      guidelinesNotes: '',
    },
    marketingData: {
      objectives: [],
      callToAction: '',
      promotionDetails: '',
      eventDate: '',
      offerDetails: '',
      marketingObjectives: '',
    },
    audienceData: {
      industry: '',
      targetDescription: '',
    },
    businessData: {
      tagline: '',
      useAiTagline: true,
      contactInfo: {
        phone: '',
        email: '',
        website: '',
        address: '',
        includeQR: true,
      },
      disclaimer: '',
      includeDisclaimer: false,
      extraInfo: '',
    },
    visualData: {
      imageStyle: [],
      imageSource: 'ai',
      imagePrimarySubject: '',
      useCustomImage: false,
      customImageDescription: '',
      layoutStyle: 'clean',
      colorSchemeConfirmed: true,
      customColorNotes: '',
    },
  });

  // Update brandName whenever businessName changes
  useEffect(() => {
    if (businessName) {
      setWizardState(prev => ({
        ...prev,
        brandData: {
          ...prev.brandData,
          brandName: businessName
        }
      }));
    }
  }, [businessName]);

  // Get target description from marketing strategy
  const getTargetDescription = () => {
    if (!marketingStrategy) return '';
    
    // Look for reasoning in business targets
    if (marketingStrategy.method1Analysis.businessTargets.length > 0) {
      const target = marketingStrategy.method1Analysis.businessTargets[0];
      return target.reasoning || '';
    }
    
    // If not found, return the overall reasoning
    return marketingStrategy.method1Analysis.overallReasoning || '';
  };

  const stepTitles: Record<WizardStep, string> = {
    method: 'Design Method',
    segmentation: 'Audience Segmentation',
    brand: 'Brand Identity',
    marketing: 'Marketing Goals',
    audience: 'Target Audience',
    business: 'Business Details',
    visual: 'Visual Elements',
    review: 'Review & Generate'
  };

  // Handler for method selection
  const handleMethodSelect = (method: DesignMethod) => {
    setWizardState(prev => ({
      ...prev,
      selectedDesignMethod: method,
      currentStep: method === 'multiple' ? 'segmentation' : 'brand'
    }));
  };

  // Handler for segmentation completion
  const handleSegmentationComplete = (isSegmented: boolean, segments?: string[]) => {
    setWizardState(prev => ({
      ...prev,
      segments: segments || [],
      currentSegment: segments && segments.length > 0 ? segments[0] : null,
      currentStep: 'brand'
    }));
  };

  // Handler for brand identity completion
  const handleBrandComplete = (componentBrandData: ComponentBrandData) => {
    setWizardState(prev => ({
      ...prev,
      brandData: {
        ...toWizardBrandData(componentBrandData, prev.brandData),
        brandName: componentBrandData.brandName || prev.brandData.brandName,
        logoUrl: componentBrandData.logoUrl || prev.brandData.logoUrl
      },
      currentStep: 'marketing'
    }));
  };

  // Handler for marketing goals completion
  const handleMarketingComplete = (componentMarketingData: ComponentMarketingData) => {
    setWizardState(prev => ({
      ...prev,
      marketingData: toWizardMarketingData(componentMarketingData, prev.marketingData),
      currentStep: 'audience'
    }));
  };

  // Handler for audience completion
  const handleAudienceComplete = (audienceData: AudienceData) => {
    setWizardState(prev => ({
      ...prev,
      audienceData,
      currentStep: 'business'
    }));
  };

  // Handler for business details completion
  const handleBusinessComplete = (componentBusinessData: ComponentBusinessData) => {
    setWizardState(prev => ({
      ...prev,
      businessData: toWizardBusinessData(componentBusinessData, prev.businessData),
      currentStep: 'visual'
    }));
  };

  // Handler for visual elements completion
  const handleVisualComplete = (visualData: VisualData) => {
    setWizardState(prev => ({
      ...prev,
      visualData,
      currentStep: 'review'
    }));
  };

  // Handler for generate action
  const handleGenerate = () => {
    // Implementation for generating postcards would go here
    console.log('Generating postcards with data:', wizardState);
  };

  // Handler to go back to editing
  const handleBackToEdit = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'visual'
    }));
  };

  // Render the current step
  const renderStep = () => {
    switch (wizardState.currentStep) {
      case 'method':
        return (
          <div className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-electric-teal mb-4">Choose Your Design Method</h2>
            <p className="text-white mb-6">How would you like to approach your postcard campaign?</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleMethodSelect('single')}
                className="p-6 border-2 border-electric-teal rounded-lg text-left hover:bg-charcoal-light transition-colors"
              >
                <h3 className="text-xl font-semibold text-electric-teal mb-2">Single Design</h3>
                <p className="text-electric-teal/80">
                  Create one design for all your audience. Simple and straightforward.
                </p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleMethodSelect('multiple')}
                className="p-6 border-2 border-electric-teal rounded-lg text-left hover:bg-charcoal-light transition-colors"
              >
                <h3 className="text-xl font-semibold text-electric-teal mb-2">Multiple Designs</h3>
                <p className="text-electric-teal/80">
                  Create unique designs for different audience segments. More targeted approach.
                </p>
              </motion.button>
            </div>

            {onBack && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onBack}
                className="mt-8 px-6 py-2 border border-electric-teal/50 text-electric-teal rounded-lg hover:border-electric-teal transition-colors"
              >
                ← Back
              </motion.button>
            )}
          </div>
        );
        
      case 'segmentation':
        return (
          <AudienceSegmentation 
            onComplete={handleSegmentationComplete} 
          />
        );
        
      case 'brand':
        const brandInitialData = {
          ...toComponentBrandData(wizardState.brandData),
          brandName: businessName || wizardState.brandData.brandName,
          logoUrl: wizardState.brandData.logoUrl
        };
        
        return (
          <BrandIdentity
            onComplete={handleBrandComplete}
            initialData={brandInitialData}
          />
        );
        
      case 'marketing':
        return (
          <MarketingGoals
            onComplete={handleMarketingComplete}
            initialData={toComponentMarketingData(wizardState.marketingData)}
          />
        );
        
      case 'audience':
        const targetDescription = getTargetDescription();
        const audienceInitialData = {
          ...wizardState.audienceData,
          targetDescription: targetDescription || wizardState.audienceData.targetDescription
        };
        
        return (
          <TargetAudience
            onComplete={handleAudienceComplete}
            initialData={audienceInitialData}
            segment={wizardState.currentSegment || undefined}
          />
        );
        
      case 'business':
        return (
          <BusinessDetails
            onComplete={handleBusinessComplete}
            initialData={toComponentBusinessData(wizardState.businessData)}
            segment={wizardState.currentSegment || undefined}
          />
        );
        
      case 'visual':
        return (
          <VisualElements
            onComplete={handleVisualComplete}
            initialData={wizardState.visualData}
            brandColors={{
              primaryColor: wizardState.brandData.primaryColor,
              accentColor: wizardState.brandData.accentColor,
            }}
            segment={wizardState.currentSegment || undefined}
          />
        );
        
      case 'review':
        return (
          <ReviewGenerate
            brandData={wizardState.brandData}
            marketingData={wizardState.marketingData}
            audienceData={wizardState.audienceData}
            businessData={wizardState.businessData}
            visualData={wizardState.visualData}
            segment={wizardState.currentSegment || undefined}
            onGenerate={handleGenerate}
            onBack={handleBackToEdit}
          />
        );
        
      default:
        return null;
    }
  };

  // Progress indicator
  const stepOrder: WizardStep[] = wizardState.selectedDesignMethod === 'multiple'
    ? ['method', 'segmentation', 'brand', 'marketing', 'audience', 'business', 'visual', 'review']
    : ['method', 'brand', 'marketing', 'audience', 'business', 'visual', 'review'];
    
  const currentStepIndex = stepOrder.indexOf(wizardState.currentStep);
  const progress = (currentStepIndex / (stepOrder.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-charcoal to-charcoal-dark p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Step title and progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-electric-teal">
              {stepTitles[wizardState.currentStep]}
            </h1>
            <span className="text-electric-teal">
              Step {currentStepIndex + 1} of {stepOrder.length}
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-charcoal-light rounded-full overflow-hidden">
            <div 
              className="h-full bg-electric-teal rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Current step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={wizardState.currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIDesignWizard; 
