'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AudienceSegmentation from './AudienceSegmentation';
import BrandIdentity from './BrandIdentity';
import MarketingGoals from './MarketingGoals';
import TargetAudience from './TargetAudience';
import BusinessDetails from './BusinessDetails';

// Import BrandStylePreference type from BrandIdentity
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';

export type WizardStep = 
  | 'segmentation'
  | 'brand'
  | 'marketing'
  | 'audience'
  | 'business'
  | 'visual'
  | 'review';

// Define BrandData type to match the one in BrandIdentity component
interface BrandData {
  hasBrandGuidelines: boolean;
  primaryColor: string;
  accentColor: string;
  stylePreferences: BrandStylePreference[];
  additionalNotes: string;
}

// Define MarketingData type to match the one in MarketingGoals component
interface MarketingData {
  objectives: MarketingObjective[];
  otherObjective: string;
  callToAction: string;
  useAiCta: boolean;
}

// Define AudienceData type to match the one in TargetAudience component
interface AudienceData {
  industry: string;
  targetDescription: string;
  audienceAgeRange: string[];
  incomeLevel: string[];
  interests: string[];
  customAudience: boolean;
  customAudienceDescription: string;
}

// Define BusinessData type to match the one in BusinessDetails component
interface BusinessData {
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
}

interface WizardState {
  currentStep: WizardStep;
  isSegmented: boolean;
  segments: string[];
  currentSegment?: string;
  // Brand data
  brandData?: BrandData;
  // Marketing data
  marketingData?: MarketingData;
  // Audience data
  audienceData?: AudienceData;
  // Business data
  businessData?: BusinessData;
  // ... other state will be added as we build more steps
}

interface AIDesignWizardProps {
  onBack: () => void;
}

const steps: WizardStep[] = [
  'segmentation',
  'brand',
  'marketing',
  'audience',
  'business',
  'visual',
  'review'
];

const stepTitles: Record<WizardStep, string> = {
  segmentation: 'Audience Segmentation',
  brand: 'Brand Identity',
  marketing: 'Marketing Goals',
  audience: 'Target Audience',
  business: 'Business Details',
  visual: 'Visual Elements',
  review: 'Review & Generate'
};

const AIDesignWizard = ({ onBack }: AIDesignWizardProps) => {
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'segmentation',
    isSegmented: false,
    segments: [],
    currentSegment: undefined,
  });

  const handleSegmentationComplete = (isSegmented: boolean, segments?: string[]) => {
    setWizardState(prev => ({
      ...prev,
      isSegmented,
      segments: segments || [],
      currentSegment: segments?.[0],
      currentStep: 'brand'
    }));
  };

  const handleBrandComplete = (brandData: BrandData) => {
    setWizardState(prev => ({
      ...prev,
      brandData,
      currentStep: 'marketing'
    }));
  };

  const handleMarketingComplete = (marketingData: MarketingData) => {
    setWizardState(prev => ({
      ...prev,
      marketingData,
      currentStep: 'audience'
    }));
  };

  const handleAudienceComplete = (audienceData: AudienceData) => {
    setWizardState(prev => ({
      ...prev,
      audienceData,
      currentStep: 'business'
    }));
  };

  const handleBusinessComplete = (businessData: BusinessData) => {
    setWizardState(prev => ({
      ...prev,
      businessData,
      currentStep: 'visual'
    }));
  };

  const handleNextStep = () => {
    const currentIndex = steps.indexOf(wizardState.currentStep);
    if (currentIndex < steps.length - 1) {
      setWizardState(prev => ({
        ...prev,
        currentStep: steps[currentIndex + 1]
      }));
    }
  };

  const handlePrevStep = () => {
    const currentIndex = steps.indexOf(wizardState.currentStep);
    if (currentIndex > 0) {
      setWizardState(prev => ({
        ...prev,
        currentStep: steps[currentIndex - 1]
      }));
    } else {
      // If we're at the first step, go back to the design method selection
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Add back button */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 text-electric-teal hover:text-electric-teal/80"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>

      {/* Only show progress bar after segmentation is complete */}
      {wizardState.currentStep !== 'segmentation' && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-electric-teal/20">
          <motion.div
            className="h-full bg-electric-teal"
            initial={{ width: '0%' }}
            animate={{
              width: `${((steps.indexOf(wizardState.currentStep) + 1) / steps.length) * 100}%`
            }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={wizardState.currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-4"
        >
          {wizardState.currentStep === 'segmentation' ? (
            <AudienceSegmentation onComplete={handleSegmentationComplete} />
          ) : wizardState.currentStep === 'brand' ? (
            <BrandIdentity 
              onComplete={handleBrandComplete} 
              initialData={wizardState.brandData}
            />
          ) : wizardState.currentStep === 'marketing' ? (
            <MarketingGoals
              onComplete={handleMarketingComplete}
              initialData={wizardState.marketingData}
            />
          ) : wizardState.currentStep === 'audience' ? (
            <TargetAudience
              onComplete={handleAudienceComplete}
              initialData={wizardState.audienceData}
              segment={wizardState.currentSegment}
            />
          ) : wizardState.currentStep === 'business' ? (
            <BusinessDetails
              onComplete={handleBusinessComplete}
              initialData={wizardState.businessData}
              segment={wizardState.currentSegment}
            />
          ) : (
            <>
              {/* Step Title - only show for other steps */}
              <div className="pt-8 px-4 mb-8">
                <motion.h1
                  key={wizardState.currentStep}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl text-electric-teal text-center font-bold"
                >
                  {stepTitles[wizardState.currentStep]}
                </motion.h1>
              </div>
              
              {/* We'll add other steps here */}
              <div className="max-w-3xl mx-auto py-12 text-center text-electric-teal">
                <p>This step is under development.</p>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Only show navigation after segmentation */}
      {wizardState.currentStep !== 'segmentation' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-charcoal border-t border-electric-teal/20">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button
              onClick={handlePrevStep}
              className="px-6 py-2 rounded-lg border-2 border-electric-teal text-electric-teal
                hover:bg-electric-teal/10 transition-colors duration-200"
            >
              Previous
            </button>
            <div className="text-electric-teal/60">
              Step {steps.indexOf(wizardState.currentStep)} of {steps.length - 1}
            </div>
            <button
              onClick={handleNextStep}
              disabled={wizardState.currentStep === 'review'}
              className="px-6 py-2 rounded-lg bg-electric-teal text-charcoal
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:bg-electric-teal/90 transition-colors duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIDesignWizard; 