'use client';

import { useState, useEffect, ChangeEvent, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Assuming these components exist and can be reused
// Removed AudienceSegmentation import as it's not used in this flow
import BrandIdentity from './BrandIdentity';
import MarketingGoals from './MarketingGoals';
import TargetAudience from './TargetAudience';
import BusinessDetails from './BusinessDetails';
import VisualElements from './VisualElements';
// We'll need a review step tailored for this flow later
// import ReviewSubmitRequest from './ReviewSubmitRequest'; 
import { ImageStyle, ImageSource, LayoutStyle } from './VisualElements';
import { useMarketingStore } from '@/store/marketingStore';
// TODO: Import Firebase storage functions
// import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { storage } from '@/lib/firebase'; // Assuming firebase config exists

// Define types locally (some might be adapted/removed)
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';
// Removed DesignMethod type

export type WizardStep = 
  // Removed 'method'
  // Removed 'segmentation' for now, assuming single design path for this wizard
  | 'brand'
  | 'logo_upload' // Added logo upload step
  | 'marketing'
  | 'audience'
  | 'business'
  | 'visual'
  | 'review'; // Review step might need adjustments

// Keep existing data structure types for now
type ComponentBrandData = {
  hasBrandGuidelines: boolean;
  primaryColor: string;
  accentColor: string;
  stylePreferences: BrandStylePreference[];
  additionalNotes: string;
  logoUrl: string; // This will store the final URL after upload
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

interface WizardBrandData {
  brandName: string;
  logoUrl: string; // Store final URL
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
  // Removed selectedDesignMethod, segments, currentSegment
  brandData: WizardBrandData;
  marketingData: WizardMarketingData;
  audienceData: AudienceData;
  businessData: WizardBusinessData;
  visualData: VisualData;
  logoFile: File | null; // State for the selected logo file
  logoUploadProgress: number | null; // State for upload progress
  logoUploadError: string | null; // State for upload errors
}

interface HumanAssistedWizardProps {
  onBack?: () => void; // Keep onBack prop
}

// Keep type conversion functions for now
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
  useAiCta: true, // Defaulting, maybe review later
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
  qrCodeUrl: '', // Assuming QR is generated later if needed
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

// Rename component
const HumanAssistedWizard = ({ onBack }: HumanAssistedWizardProps) => {
  const businessName = useMarketingStore((state) => state.businessInfo.businessName);
  const marketingStrategy = useMarketingStore((state) => state.marketingStrategy);
  
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'brand', // Start at brand step
    brandData: {
      brandName: '',
      logoUrl: '', // Will be populated after upload
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
      imageSource: 'ai', // This wizard implies AI source initially
      imagePrimarySubject: '',
      useCustomImage: false, // Logo is separate, maybe remove this?
      customImageDescription: '',
      layoutStyle: 'clean',
      colorSchemeConfirmed: true,
      customColorNotes: '',
    },
    logoFile: null, // Initialize logo file state
    logoUploadProgress: null,
    logoUploadError: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Keep getTargetDescription for now, might be useful
  const getTargetDescription = () => {
    if (!marketingStrategy) return '';
    if (marketingStrategy.method1Analysis.businessTargets.length > 0) {
      const target = marketingStrategy.method1Analysis.businessTargets[0];
      return target.reasoning || '';
    }
    return marketingStrategy.method1Analysis.overallReasoning || '';
  };

  const stepTitles: Record<WizardStep, string> = {
    brand: 'Brand Identity',
    logo_upload: 'Upload Your Logo', // Title for the new step
    marketing: 'Marketing Goals',
    audience: 'Target Audience',
    business: 'Business Details',
    visual: 'Visual Elements',
    review: 'Review & Submit Request' // Updated title
  };

  // Removed handleMethodSelect
  // Removed handleSegmentationComplete

  // Update navigation: Brand -> Logo Upload
  const handleBrandComplete = (componentBrandData: ComponentBrandData) => {
    setWizardState(prev => ({
      ...prev,
      brandData: {
        ...toWizardBrandData(componentBrandData, prev.brandData),
        brandName: componentBrandData.brandName || prev.brandData.brandName,
        // Keep logoUrl potentially from input, but upload overwrites
      },
      currentStep: 'logo_upload' // Go to logo upload next
    }));
  };
  
  // Placeholder handler for logo selection
  const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Basic validation (example: check type and size)
      if (!file.type.startsWith('image/')) {
        setWizardState(prev => ({ ...prev, logoUploadError: 'Please select an image file.', logoFile: null }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit example
        setWizardState(prev => ({ ...prev, logoUploadError: 'File size must be under 5MB.', logoFile: null }));
        return;
      }
      
      setWizardState(prev => ({
        ...prev,
        logoFile: file,
        logoUploadError: null, // Clear previous errors
        logoUploadProgress: null,
        brandData: { ...prev.brandData, logoUrl: '' } // Clear any manually entered URL
      }));
    } else {
       setWizardState(prev => ({ ...prev, logoFile: null }));
    }
  };

  // Placeholder for actual upload logic
  const handleUploadLogo = async () => {
    if (!wizardState.logoFile) {
      setWizardState(prev => ({ ...prev, logoUploadError: 'No file selected.' }));
      return;
    }
    
    setWizardState(prev => ({ ...prev, logoUploadProgress: 0, logoUploadError: null }));

    // --- Firebase Upload Logic --- 
    // const storageRef = ref(storage, `logos/${Date.now()}_${wizardState.logoFile.name}`);
    // const uploadTask = uploadBytesResumable(storageRef, wizardState.logoFile);
    
    // uploadTask.on('state_changed',
    //   (snapshot) => {
    //     const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    //     setWizardState(prev => ({ ...prev, logoUploadProgress: progress }));
    //   },
    //   (error) => {
    //     console.error("Upload failed:", error);
    //     setWizardState(prev => ({ ...prev, logoUploadError: `Upload failed: ${error.message}`, logoUploadProgress: null }));
    //   },
    //   () => {
    //     getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
    //       console.log('File available at', downloadURL);
    //       setWizardState(prev => ({
    //         ...prev,
    //         brandData: { ...prev.brandData, logoUrl: downloadURL }, // Save the URL
    //         logoUploadProgress: 100, // Mark as complete
    //         currentStep: 'marketing' // Move to next step on success
    //       }));
    //     });
    //   }
    // );
    // --- End Firebase Upload Logic ---
    
    // --- Placeholder Success --- 
    console.log("Simulating logo upload for:", wizardState.logoFile.name);
    // Simulate upload delay and success
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    const simulatedUrl = `https://fake-storage.com/logos/${Date.now()}_${wizardState.logoFile.name}`;
    setWizardState(prev => ({
      ...prev,
      brandData: { ...prev.brandData, logoUrl: simulatedUrl }, // Save simulated URL
      logoUploadProgress: 100,
      currentStep: 'marketing' // Navigate on success
    }));
    console.log("Simulated upload complete. URL:", simulatedUrl);
    // --- End Placeholder Success ---
  };

  // Update navigation: Marketing -> Audience
  const handleMarketingComplete = (componentMarketingData: ComponentMarketingData) => {
    setWizardState(prev => ({
      ...prev,
      marketingData: toWizardMarketingData(componentMarketingData, prev.marketingData),
      currentStep: 'audience'
    }));
  };

  // Update navigation: Audience -> Business
  const handleAudienceComplete = (audienceData: AudienceData) => {
    setWizardState(prev => ({
      ...prev,
      audienceData,
      currentStep: 'business'
    }));
  };

  // Update navigation: Business -> Visual
  const handleBusinessComplete = (componentBusinessData: ComponentBusinessData) => {
    setWizardState(prev => ({
      ...prev,
      businessData: toWizardBusinessData(componentBusinessData, prev.businessData),
      currentStep: 'visual'
    }));
  };

  // Update navigation: Visual -> Review
  const handleVisualComplete = (visualData: VisualData) => {
    setWizardState(prev => ({
      ...prev,
      visualData,
      currentStep: 'review'
    }));
  };

  // Renamed from handleGenerate - This is the final submission
  const handleSubmitRequest = () => {
    console.log('Submitting human-assisted design request with data:', wizardState);
    // TODO: Add logic to call the backend Cloud Function (`processHumanAssistedRequest`)
    // Send: wizardState.brandData, wizardState.marketingData, etc., ESPECIALLY wizardState.brandData.logoUrl
  };

  // Handler to go back (needs adjustment based on current step)
  const handleBack = () => {
     const currentIdx = stepOrder.indexOf(wizardState.currentStep);
     if (currentIdx > 0) {
        setWizardState(prev => ({ ...prev, currentStep: stepOrder[currentIdx - 1]}));
     } else if (onBack) {
        onBack(); // Call the original onBack if we are at the first step
     }
  };
  
   // Handler to go back to editing from review step
  const handleBackToEdit = () => {
    setWizardState(prev => ({
      ...prev,
      currentStep: 'visual' // Go back to the last data entry step
    }));
  };

  // Render the current step
  const renderStep = () => {
    switch (wizardState.currentStep) {
      // Removed 'method' case
      // Removed 'segmentation' case
        
      case 'brand':
        const brandInitialData = {
          ...toComponentBrandData(wizardState.brandData),
          brandName: businessName || wizardState.brandData.brandName,
          logoUrl: wizardState.brandData.logoUrl // Pass existing URL if any
        };
        return (
          <BrandIdentity
            onComplete={handleBrandComplete}
            initialData={brandInitialData}
          />
        );
        
      case 'logo_upload': // Render the new logo upload step
        return (
          <div className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-electric-teal mb-4">Upload Your Logo</h2>
            <p className="text-white mb-6">
Please upload your company logo. Recommended formats: PNG, JPG, SVG. Max size: 5MB.
            </p>
            
            <div className="space-y-4">
              <input 
                type="file"
                accept="image/png, image/jpeg, image/svg+xml" 
                onChange={handleLogoSelect}
                ref={fileInputRef}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-electric-teal file:text-charcoal hover:file:bg-electric-teal/90 cursor-pointer"
              />
              
              {wizardState.logoFile && (
                <div className="text-white text-sm">Selected file: {wizardState.logoFile.name}</div>
              )}

              {wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                     className="bg-electric-teal h-2.5 rounded-full transition-all duration-300"
                     style={{ width: `${wizardState.logoUploadProgress}%` }}
                   ></div>
                </div>
              )}
              
              {wizardState.logoUploadError && (
                <p className="text-red-500 text-sm">{wizardState.logoUploadError}</p>
              )}
              
              {wizardState.logoUploadProgress === 100 && wizardState.brandData.logoUrl && (
                 <p className="text-green-500 text-sm">Logo uploaded successfully!</p>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBack}
                className="px-6 py-2 border border-electric-teal/50 text-electric-teal rounded-lg hover:border-electric-teal transition-colors"
              >
                ← Back
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUploadLogo} // Trigger upload OR confirmation to proceed
                disabled={!wizardState.logoFile || (wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100)}
                className={`px-6 py-2 rounded-lg ${!wizardState.logoFile || (wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100) ? 'bg-gray-500 cursor-not-allowed' : 'bg-electric-teal text-charcoal hover:bg-electric-teal/90'} transition-colors`}
              >
                {wizardState.logoUploadProgress === 100 ? 'Next →' : wizardState.logoUploadProgress !== null ? 'Uploading...' : 'Upload & Continue →'}
              </motion.button>
            </div>
          </div>
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
          />
        );
        
      case 'business':
        return (
          <BusinessDetails
            onComplete={handleBusinessComplete}
            initialData={toComponentBusinessData(wizardState.businessData)}
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
          />
        );
        
      case 'review':
        // Needs a dedicated ReviewSubmit component
        return (
           <div className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto text-white">
             <h2 className="text-2xl font-bold text-electric-teal mb-4">Review & Submit Request</h2>
             <p className="mb-4">Placeholder for Review Component. Please review the details below.</p>
             <pre className="bg-charcoal-light p-4 rounded overflow-x-auto text-sm mb-6">
               {JSON.stringify(wizardState, (key, value) => key === 'logoFile' ? value?.name : value, 2)}
             </pre>
             <p className="text-sm text-amber-400 mb-6">Note: This request will be sent to our design team for review and image generation. This process may take up to [Specify Timeframe, e.g., 24 hours].</p>
             <div className="flex justify-between">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBackToEdit} // Use specific back to edit from review
                  className="px-6 py-2 border border-electric-teal/50 text-electric-teal rounded-lg hover:border-electric-teal transition-colors"
                >
                   ← Edit Details
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitRequest} 
                  className="px-6 py-2 bg-electric-teal text-charcoal rounded-lg hover:bg-electric-teal/90 transition-colors"
                >
                  Submit Request
                </motion.button>
             </div>
           </div>
         );
        
      default:
        return null;
    }
  };

  // Progress indicator setup - updated step order
  const stepOrder: WizardStep[] = ['brand', 'logo_upload', 'marketing', 'audience', 'business', 'visual', 'review'];
    
  const currentStepIndex = stepOrder.indexOf(wizardState.currentStep);
  // Ensure index is found before calculating progress
  const progress = currentStepIndex !== -1 ? (currentStepIndex / (stepOrder.length - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-charcoal to-charcoal-dark p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Step title and progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
             <h1 className="text-3xl font-bold text-electric-teal">
               {/* Handle potential undefined step title if stepOrder/currentStep mismatch */}
               {wizardState.currentStep in stepTitles ? stepTitles[wizardState.currentStep] : 'Loading...'}
             </h1>
             {currentStepIndex !== -1 && (
               <span className="text-electric-teal">
                 Step {currentStepIndex + 1} of {stepOrder.length}
               </span>
             )}
           </div>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-charcoal-light rounded-full overflow-hidden">
            <div 
              className="h-full bg-electric-teal rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Back button (global, for first step) - only show if onBack provided and we are on first step */}
        {onBack && currentStepIndex === 0 && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="mb-4 px-4 py-1 border border-electric-teal/50 text-electric-teal rounded-lg hover:border-electric-teal transition-colors text-sm"
          >
            ← Back to Design Options
          </motion.button>
        )}

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

export default HumanAssistedWizard; 