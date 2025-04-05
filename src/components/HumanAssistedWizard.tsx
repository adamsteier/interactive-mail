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
// Firebase Imports
import { collection, addDoc, serverTimestamp, doc, onSnapshot, Unsubscribe, updateDoc } from "firebase/firestore"; 
import { db, storage } from '@/lib/firebase'; // Import storage instance
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Import storage functions
// Auth Context
import { useAuth } from '@/contexts/AuthContext';
// TODO: Import Firebase storage functions
// import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
// import { storage } from '@/lib/firebase';

// Define types locally (some might be adapted/removed)
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';
// Removed DesignMethod type

export type WizardStep = 
  | 'design_choice' // New step to choose single vs multiple designs
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

// --- Define CampaignState Type ---
interface CampaignState {
  businessType: string;
  marketingData: WizardMarketingData;
  audienceData: AudienceData;
  businessData: WizardBusinessData;
  visualData: VisualData;
}
// --- End CampaignState Type ---

interface WizardState {
  currentStep: WizardStep;
  designScope: 'single' | 'multiple' | 'undecided';
  activeDesignType: string | null;
  campaigns: CampaignState[];

  // --- Global/Shared State ---
  globalBrandData: WizardBrandData;
  logoFile: File | null;
  logoUploadProgress: number | null;
  logoUploadError: string | null;
  logoPreviewUrl: string | null;
  uploadedLogoUrl: string | null;

  // --- Submission & Results State ---
  isSubmitting: boolean;
  submitError: string | null;
  submittedRequestId: string | null;
  requestStatus: string | null;
  finalImageUrls: string[] | null;
  processingMessage: string;
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
  const { user } = useAuth(); // Get user from AuthContext
  const selectedBusinessTypes = useMarketingStore(state => state.selectedBusinessTypes); // Read selected types
  
  const [wizardState, setWizardState] = useState<WizardState>(() => ({ // Use function form for initial state
    currentStep: 'brand', // Default, potentially overridden
    designScope: 'undecided',
    activeDesignType: null,
    campaigns: [], // Initialize as empty, populated by useEffect
    // --- Initialize Global State ---
    globalBrandData: {
        brandName: businessName || '',
        logoUrl: '', // Will be populated by global logo upload
        primaryColor: '#00c2a8',
        accentColor: '#00858a',
        brandValues: [],
        stylePreferences: [],
        useExistingGuidelines: false,
        guidelinesNotes: '',
    },
    logoFile: null,
    logoUploadProgress: null,
    logoUploadError: null,
    logoPreviewUrl: null,
    uploadedLogoUrl: null,
    // --- Initialize Submission State ---
    isSubmitting: false,
    submitError: null,
    submittedRequestId: null,
    requestStatus: null,
    finalImageUrls: null,
    processingMessage: 'Your request is being submitted...',
  }));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null); // Ref for unsubscribe function

  // Update globalBrandData.brandName whenever businessName changes from the store
  useEffect(() => {
    if (businessName && businessName !== wizardState.globalBrandData.brandName) {
      setWizardState(prev => ({
        ...prev,
        globalBrandData: { ...prev.globalBrandData, brandName: businessName }
      }));
    }
  }, [businessName, wizardState.globalBrandData.brandName]);

  // --- Update useEffect to initialize campaigns array (without brandData) ---
  useEffect(() => {
    const typesArray = Array.from(selectedBusinessTypes);
    console.log("Wizard mounted/types changed. Selected Types:", typesArray);

    if (wizardState.designScope === 'undecided') {
      // Default data for non-brand fields
      const defaultMarketingData: WizardMarketingData = { objectives: [], callToAction: '', promotionDetails: '', eventDate: '', offerDetails: '', marketingObjectives: '' };
      const defaultAudienceData: AudienceData = { industry: '', targetDescription: '' };
      const defaultBusinessData: WizardBusinessData = { tagline: '', useAiTagline: true, contactInfo: { phone: '', email: '', website: '', address: '', includeQR: true }, disclaimer: '', includeDisclaimer: false, extraInfo: '' };
      const defaultVisualData: VisualData = { imageStyle: [], imageSource: 'ai', imagePrimarySubject: '', useCustomImage: false, customImageDescription: '', layoutStyle: 'clean', colorSchemeConfirmed: true, customColorNotes: '' };

      if (typesArray.length > 1) {
        console.log("Initializing for MULTIPLE designs (no brandData per campaign).");
        const initialCampaigns: CampaignState[] = typesArray.map(type => ({
          businessType: type,
          marketingData: { ...defaultMarketingData },
          audienceData: { ...defaultAudienceData },
          businessData: { ...defaultBusinessData },
          visualData: { ...defaultVisualData },
        }));
        setWizardState(prev => ({
          ...prev,
          currentStep: 'design_choice',
          designScope: 'undecided',
          campaigns: initialCampaigns,
          activeDesignType: null,
        }));
      } else {
        console.log("Initializing for SINGLE design (no brandData per campaign).");
        const singleCampaignType = typesArray.length === 1 ? typesArray[0] : '__all__';
        const initialCampaigns: CampaignState[] = [{
          businessType: singleCampaignType,
          marketingData: { ...defaultMarketingData },
          audienceData: { ...defaultAudienceData },
          businessData: { ...defaultBusinessData },
          visualData: { ...defaultVisualData },
        }];
        setWizardState(prev => ({
          ...prev,
          currentStep: 'brand', // Skip choice step
          designScope: 'single',
          campaigns: initialCampaigns,
          activeDesignType: singleCampaignType, // Set active type immediately
        }));
      }
    }
    // Depend on selectedBusinessTypes and initial globalBrandName
  }, [selectedBusinessTypes, wizardState.designScope, wizardState.globalBrandData.brandName]);
  // --- End campaign initialization useEffect ---

  // --- Helper Functions for Campaign Data ---
  const getActiveCampaign = (): CampaignState | undefined => {
    return wizardState.campaigns.find(c => c.businessType === wizardState.activeDesignType);
  };

  // Specific helper to update nested data like brandData, marketingData, etc.
  const updateActiveCampaignData = <K extends keyof Omit<CampaignState, 'businessType'>>(
    dataKey: K,
    dataUpdates: Partial<CampaignState[K]>
  ) => {
    setWizardState(prev => {
      const activeType = prev.activeDesignType;
      if (!activeType) return prev;

      return {
        ...prev,
        campaigns: prev.campaigns.map(campaign => {
          if (campaign.businessType === activeType) {
            return {
              ...campaign,
              [dataKey]: {
                ...campaign[dataKey],
                ...dataUpdates,
              },
            };
          }
          return campaign;
        }),
      };
    });
  };
  // --- End Helper Functions ---

  // --- Handler to Switch Active Design Type ---
  const handleSetActiveDesignType = (businessType: string) => {
    // Optional: Add logic here to save any pending changes for the previous type?
    // Optional: Add logic to check if the target type's steps are complete?
    setWizardState(prev => ({
      ...prev,
      activeDesignType: businessType,
      // Potentially reset currentStep if designs are at different stages?
      // currentStep: findStepForType(businessType) // Requires tracking progress per campaign
    }));
  };
  // --- End Handler to Switch Active Design Type ---

  // --- Add useEffect for Firestore Listener ---
  useEffect(() => {
    // Clear previous listener if component re-renders or unmounts
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Only listen if we have a submitted request ID
    if (wizardState.submittedRequestId) {
      const docRef = doc(db, "design_requests", wizardState.submittedRequestId);
      
      console.log(`Listening to Firestore document: ${wizardState.submittedRequestId}`);

      // Set up the real-time listener
      unsubscribeRef.current = onSnapshot(docRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Firestore update received:", data);
            const status = data.status;
            let message = wizardState.processingMessage;
            let finalUrls = wizardState.finalImageUrls;

            switch (status) {
              case 'pending_prompt':
                message = 'Generating initial AI prompt...';
                break;
              case 'pending_review':
                message = 'Your request is awaiting admin review...';
                break;
              case 'completed':
                message = 'Your final designs are ready!';
                finalUrls = data.finalImageUrls || [];
                break;
              case 'failed': // Handle a potential failure status
                 message = 'There was an issue processing your request. Please contact support.';
                 break;
              default:
                message = `Processing request (Status: ${status})...`;
            }

            setWizardState(prev => ({
              ...prev,
              requestStatus: status,
              finalImageUrls: finalUrls,
              processingMessage: message,
            }));

          } else {
            console.error("Listening document no longer exists!");
            setWizardState(prev => ({
              ...prev,
              submitError: 'The request document was unexpectedly deleted.',
              processingMessage: 'Error: Request not found.',
              requestStatus: 'deleted',
            }));
            if (unsubscribeRef.current) unsubscribeRef.current(); // Stop listening
          }
        },
        (error) => {
          console.error("Firestore listener error:", error);
          setWizardState(prev => ({
            ...prev,
            submitError: 'Failed to listen for request updates.',
            processingMessage: 'Error: Could not get updates.',
          }));
        }
      );
    }

    // Cleanup function to unsubscribe when the component unmounts or ID changes
    return () => {
      if (unsubscribeRef.current) {
        console.log(`Unsubscribing from Firestore document: ${wizardState.submittedRequestId}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [wizardState.submittedRequestId]); // Re-run effect if submittedRequestId changes
  // --- End Firestore Listener useEffect ---

  // --- Add useEffect for preview URL cleanup ---
  useEffect(() => {
    // Cleanup function to revoke object URL
    return () => {
      if (wizardState.logoPreviewUrl) {
        URL.revokeObjectURL(wizardState.logoPreviewUrl);
      }
    };
  }, [wizardState.logoPreviewUrl]);
  // --- End preview URL cleanup useEffect ---

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
    design_choice: 'Design Scope', // Title for the new step
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

  // --- Update Step Completion Handlers ---
  const handleBrandComplete = (componentBrandData: ComponentBrandData) => {
    // Update the global brand data
    setWizardState(prev => ({
      ...prev,
      globalBrandData: toWizardBrandData(componentBrandData, prev.globalBrandData),
      currentStep: 'logo_upload'
    }));
  };

  const handleLogoStepComplete = () => {
    // If logo uploaded, its URL is already stored globally in wizardState.logoFile / brandData.logoUrl
    // No campaign-specific data needed here unless logo could differ per campaign
    setWizardState(prev => ({ ...prev, currentStep: 'marketing' }));
  }

  const handleMarketingComplete = async (componentMarketingData: ComponentMarketingData) => { // Make async
    const activeCampaign = getActiveCampaign();
    const updatedData = toWizardMarketingData(componentMarketingData, activeCampaign?.marketingData || {} as WizardMarketingData);

    // 1. Update local state
    updateActiveCampaignData('marketingData', updatedData);

    // 2. If multiple scope and doc exists, update Firestore
    if (wizardState.designScope === 'multiple' && wizardState.submittedRequestId) {
       try {
           console.log(`Updating Firestore doc ${wizardState.submittedRequestId} - Marketing data`);
           const docRef = doc(db, "design_requests", wizardState.submittedRequestId);
           // Find the index of the active campaign to update specific element
           const campaignIndex = wizardState.campaigns.findIndex(c => c.businessType === wizardState.activeDesignType);
           if (campaignIndex !== -1) {
               await updateDoc(docRef, {
                   // Use dot notation to update specific field within the array element
                   [`campaigns.${campaignIndex}.marketingData`]: updatedData
                   // Optionally update a 'lastUpdated' timestamp?
               });
               console.log("Firestore marketing data updated successfully.");
           } else {
               console.warn("Could not find active campaign index to update Firestore marketing data.");
           }
       } catch (error) {
           console.error("Failed to update marketing data in Firestore:", error);
           // Optional: Show error message to user? Maybe a small toast?
           // setWizardState(prev => ({...prev, submitError: "Failed to save progress. Please try again."}))
       }
    }

    // 3. Navigate to next step
    setWizardState(prev => ({ ...prev, currentStep: 'audience' }));
  };

  const handleAudienceComplete = (audienceData: AudienceData) => {
    updateActiveCampaignData('audienceData', audienceData);
    setWizardState(prev => ({ ...prev, currentStep: 'business' }));
  };

  const handleBusinessComplete = (componentBusinessData: ComponentBusinessData) => {
    updateActiveCampaignData('businessData', toWizardBusinessData(componentBusinessData, getActiveCampaign()?.businessData || {} as WizardBusinessData));
    setWizardState(prev => ({ ...prev, currentStep: 'visual' }));
  };

  const handleVisualComplete = (visualData: VisualData) => {
    updateActiveCampaignData('visualData', visualData);
    setWizardState(prev => ({ ...prev, currentStep: 'review' }));
  };
  // --- End Update Step Completion Handlers ---

  // --- Restore Logo Handlers ---
  const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (wizardState.logoPreviewUrl) {
      URL.revokeObjectURL(wizardState.logoPreviewUrl);
    }
    
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
         setWizardState(prev => ({
           ...prev,
           logoFile: null,
           logoPreviewUrl: null,
           uploadedLogoUrl: null, // Clear final URL on error too
           logoUploadError: !file.type.startsWith('image/') 
             ? 'Please select an image file.' 
             : 'File size must be under 5MB.'
         }));
         return;
      }
      
      const previewUrl = URL.createObjectURL(file);
      
      setWizardState(prev => ({
        ...prev,
        logoFile: file,
        logoPreviewUrl: previewUrl,
        uploadedLogoUrl: null, // Clear final URL when new file selected
        logoUploadError: null, 
        logoUploadProgress: null,
      }));
    } else {
       setWizardState(prev => ({ ...prev, logoFile: null, logoPreviewUrl: null, uploadedLogoUrl: null }));
    }
  };

  const handleUploadLogo = async () => {
    if (!wizardState.logoFile) {
      setWizardState(prev => ({ ...prev, logoUploadError: 'No file selected.' }));
      return;
    }
    
    if (wizardState.logoPreviewUrl) {
      URL.revokeObjectURL(wizardState.logoPreviewUrl); // Revoke preview before upload starts
    }
    setWizardState(prev => ({ 
        ...prev, 
        logoUploadProgress: 0, 
        logoUploadError: null, 
        isSubmitting: true, // Use general isSubmitting flag or add a specific one?
        logoPreviewUrl: null, // Clear preview once upload starts
        uploadedLogoUrl: null, // Ensure final URL is null during upload
    }));

    const storageRef = ref(storage, `logos/${Date.now()}_${wizardState.logoFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, wizardState.logoFile);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setWizardState(prev => ({ ...prev, logoUploadProgress: progress }));
      },
      (error) => {
        console.error("Upload failed:", error);
        let errorMessage = 'Upload failed. Please try again.';
        // ... (error handling switch statement) ...
         switch (error.code) {
           case 'storage/unauthorized': errorMessage = 'Permission denied.'; break;
           case 'storage/canceled': errorMessage = 'Upload cancelled.'; break;
           default: errorMessage = 'An unknown error occurred.'; break;
         }
        setWizardState(prev => ({ ...prev, logoUploadError: errorMessage, logoUploadProgress: null, isSubmitting: false }));
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          setWizardState(prev => ({
            ...prev,
            uploadedLogoUrl: downloadURL, // Save the final URL globally
            logoUploadProgress: 100,
            isSubmitting: false, 
            logoFile: null, // Clear the file object after successful upload
          }));
        }).catch((error) => {
            console.error("Failed to get download URL:", error);
            setWizardState(prev => ({
               ...prev, 
               logoUploadError: 'Upload succeeded but failed to get file URL.', 
               logoUploadProgress: null, 
               isSubmitting: false 
            }));
        });
      }
    );
  };
  // --- End Restore Logo Handlers ---

  // --- Update Handler for Design Choice --- 
  const handleDesignScopeChoice = async (scope: 'single' | 'multiple') => {
    // Linter Hint: Explicitly log scope to ensure usage recognition if needed
    // console.log(`Design scope choice made: ${scope}`); 

    const typesArray = Array.from(selectedBusinessTypes);
    const firstActiveType = typesArray.length > 0 ? typesArray[0] : null;
    const activeTypeForSingle = typesArray.length === 1 ? typesArray[0] : '__all__';

    if (scope === 'multiple' && typesArray.length > 0) {
      // --- Early Submission Logic for Multiple --- 
      setWizardState(prev => ({
        ...prev,
        isSubmitting: true,
        submitError: null,
        processingMessage: 'Setting up your design projects & notifying admin...'
      }));

      try {
        if (!user) throw new Error("User not authenticated.");

        // Default data structures (No defaultBrandData needed here)
        const defaultMarketingData: WizardMarketingData = { objectives: [], callToAction: '', promotionDetails: '', eventDate: '', offerDetails: '', marketingObjectives: '' };
        const defaultAudienceData: AudienceData = { industry: '', targetDescription: '' };
        const defaultBusinessData: WizardBusinessData = { tagline: '', useAiTagline: true, contactInfo: { phone: '', email: '', website: '', address: '', includeQR: true }, disclaimer: '', includeDisclaimer: false, extraInfo: '' };
        const defaultVisualData: VisualData = { imageStyle: [], imageSource: 'ai', imagePrimarySubject: '', useCustomImage: false, customImageDescription: '', layoutStyle: 'clean', colorSchemeConfirmed: true, customColorNotes: '' };

        const initialCampaigns: CampaignState[] = typesArray.map(type => ({
          businessType: type,
          marketingData: { ...defaultMarketingData },
          audienceData: { ...defaultAudienceData },
          businessData: { ...defaultBusinessData },
          visualData: { ...defaultVisualData },
        }));

        // 1. Create Firestore document with 'draft_multiple' status
        const initialRequestData = {
          userId: user.uid,
          status: 'draft_multiple', // <<< Use specific draft status
          designScope: 'multiple',
          campaigns: initialCampaigns,
          logoUrl: wizardState.uploadedLogoUrl || '',
          createdAt: serverTimestamp(),
          notifiedAdmin: false, // API will attempt to set this
        };
        console.log("Creating initial Firestore doc for multi-design request...", initialRequestData);
        const docRef = await addDoc(collection(db, "design_requests"), initialRequestData);
        const newRequestId = docRef.id;
        console.log("Initial multi-design doc created with ID:", newRequestId);

        // 2. Immediately call API to trigger early notification
        console.log(`Calling API route /api/generate-design-prompt for initial notification (doc ${newRequestId})`);
        const apiResponse = await fetch('/api/generate-design-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: newRequestId }),
        });
        const apiResult = await apiResponse.json();
        if (!apiResponse.ok) {
            // Log warning but don't necessarily block user
            console.warn("Initial notification API call failed:", apiResult);
            // Optionally update local state to reflect notification failure?
        } else {
            console.log("Initial notification API call successful.");
        }

        // 3. Update local state AFTER setup
        setWizardState(prev => ({
          ...prev,
          designScope: scope,
          currentStep: 'brand',
          activeDesignType: firstActiveType,
          campaigns: initialCampaigns,
          submittedRequestId: newRequestId,
          isSubmitting: false,
          processingMessage: '',
          requestStatus: 'draft_multiple', // Sync status locally
        }));

      } catch (error) {
        console.error("Error during early submission for multiple scope:", error);
        setWizardState(prev => ({
          ...prev,
          isSubmitting: false,
          submitError: `Failed to setup multi-design request: ${error instanceof Error ? error.message : 'Unknown error'}`,
          processingMessage: '',
        }));
        return; // Don't proceed if setup failed
      }

    } else {
      // Single scope - just update local state
      console.log("Setting scope to single, proceeding to brand step.");
      // Default data (No defaultBrandData needed here)
      const defaultMarketingData: WizardMarketingData = { objectives: [], callToAction: '', promotionDetails: '', eventDate: '', offerDetails: '', marketingObjectives: '' };
      const defaultAudienceData: AudienceData = { industry: '', targetDescription: '' };
      const defaultBusinessData: WizardBusinessData = { tagline: '', useAiTagline: true, contactInfo: { phone: '', email: '', website: '', address: '', includeQR: true }, disclaimer: '', includeDisclaimer: false, extraInfo: '' };
      const defaultVisualData: VisualData = { imageStyle: [], imageSource: 'ai', imagePrimarySubject: '', useCustomImage: false, customImageDescription: '', layoutStyle: 'clean', colorSchemeConfirmed: true, customColorNotes: '' };
      const singleCampaignType = typesArray.length === 1 ? typesArray[0] : '__all__';
      const singleCampaign: CampaignState[] = [{
          businessType: singleCampaignType,
          marketingData: { ...defaultMarketingData },
          audienceData: { ...defaultAudienceData },
          businessData: { ...defaultBusinessData },
          visualData: { ...defaultVisualData },
      }];

      setWizardState(prev => ({
        ...prev,
        designScope: scope,
        currentStep: 'brand',
        activeDesignType: activeTypeForSingle,
        campaigns: prev.campaigns.length > 0 && prev.designScope === 'single' ? prev.campaigns : singleCampaign, // Preserve if already single, otherwise init
        submittedRequestId: null, // Ensure no ID is carried over if switched to single
        requestStatus: null,
        isSubmitting: false,
        submitError: null,
        processingMessage: '',
      }));
    }
  };
  // --- End Handler for Design Choice ---

  // --- Modify Final Submission Handler ---
  const handleSubmitRequest = async () => {
    setWizardState(prev => ({
      ...prev,
      isSubmitting: true,
      submitError: null,
      processingMessage: 'Finalizing your request...'
    }));

    if (!user) { /* ... user check ... */ return; }

    try {
      const { designScope, campaigns, uploadedLogoUrl, submittedRequestId, globalBrandData } = wizardState;
      
      // Linter Hint: Conditional log to ensure globalBrandData usage recognition
      if (!globalBrandData) { console.warn("Global Brand Data missing during submit!"); } 

      let finalRequestId = submittedRequestId;
      const needsApiCall = true; // Use const

      if (designScope === 'single') {
        // --- Single Scope: Create document now --- 
        console.log("Submitting single-design request...");
        const requestData = {
          userId: user.uid,
          status: 'pending_prompt',
          designScope: 'single',
          globalBrandData: globalBrandData, // Used here
          campaigns: campaigns, 
          logoUrl: uploadedLogoUrl || '',
          createdAt: serverTimestamp(),
          notifiedAdmin: false,
        };
        console.log("Writing single request data to Firestore...", requestData);
        const docRef = await addDoc(collection(db, "design_requests"), requestData);
        finalRequestId = docRef.id;
        console.log("Single request document written with ID:", finalRequestId);
        setWizardState(prev => ({ ...prev, submittedRequestId: finalRequestId, requestStatus: 'pending_prompt' })); // Store ID and status

      } else if (designScope === 'multiple' && finalRequestId) {
        // --- Multiple Scope: Update existing document status --- 
        console.log(`Finalizing multi-design request, updating doc ${finalRequestId}...`);
        const docRef = doc(db, "design_requests", finalRequestId);
        await updateDoc(docRef, {
          status: 'pending_prompt',
          globalBrandData: globalBrandData, // Used here
          campaigns: campaigns, 
          logoUrl: uploadedLogoUrl || '',
        });
        console.log(`Doc ${finalRequestId} status updated to pending_prompt.`);
        setWizardState(prev => ({ ...prev, requestStatus: 'pending_prompt' })); // Update local status
        // API call will happen below

      } else {
        throw new Error(`Invalid state for submission: scope=${designScope}, id=${finalRequestId}`);
      }

      // --- Call the main processing API --- 
      if (needsApiCall && finalRequestId) {
        console.log(`Calling main API route /api/generate-design-prompt for document ${finalRequestId}`);
        const response = await fetch('/api/generate-design-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId: finalRequestId }),
        });
        const result = await response.json();
        if (!response.ok) {
          // Even if API fails, the doc exists/was updated. Listener might still pick up changes?
          // Log error prominently.
          console.error("Main API call failed after Firestore operation:", result);
          throw new Error(result.error || 'Failed to trigger prompt generation API.');
        }
        console.log("Main API route call successful:", result);
      } else if (!finalRequestId) {
         throw new Error("Failed to get document ID for API call.");
      }

      // Update local state - Listener will take over for status updates
      setWizardState(prev => ({
        ...prev,
        isSubmitting: false,
        // processingMessage is controlled by listener effect
        // requestStatus was set above or will be updated by listener
      }));

    } catch (error) {
      console.error("Error submitting design request:", error);
      setWizardState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: error instanceof Error ? error.message : 'An unknown error occurred.',
        processingMessage: 'Submission failed.',
        // Don't reset submittedRequestId for multiple scope on error here, 
        // as the document might still exist in a draft state.
        submittedRequestId: prev.designScope === 'single' ? null : prev.submittedRequestId, // Use prev.designScope here
      }));
    }
  };
  // --- End Modify Final Submission Handler ---

  // Add a dummy reference if the console.log doesn't work for handleDesignScopeChoice
  if (process.env.NODE_ENV === 'development' && typeof handleDesignScopeChoice !== 'function') {
    console.log('handleDesignScopeChoice is not a function?'); // This should never log
  }

  // Handler to go back (needs adjustment based on current step)
  const handleBack = () => {
     const currentIdx = stepOrder.indexOf(wizardState.currentStep);
     if (currentIdx > 0) {
        // If going back from 'brand' and scope was 'multiple', go back to 'design_choice'
        if (wizardState.currentStep === 'brand' && wizardState.designScope === 'multiple') {
           setWizardState(prev => ({ ...prev, currentStep: 'design_choice', designScope: 'undecided' })); // Reset scope decision
        } else {
           setWizardState(prev => ({ ...prev, currentStep: stepOrder[currentIdx - 1]}));
        }
     } else if (onBack) {
        onBack(); // Call the original onBack if we are at the first step ('design_choice' or 'brand')
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
    const activeCampaign = getActiveCampaign();
    // Default object for campaign-specific data if activeCampaign is undefined
    const safeActiveCampaign: CampaignState = activeCampaign || {
        businessType: '__error__',
        marketingData: { objectives: [], callToAction: '', promotionDetails: '', eventDate: '', offerDetails: '', marketingObjectives: '' } as WizardMarketingData,
        audienceData: { industry: '', targetDescription: '' } as AudienceData,
        businessData: { tagline: '', useAiTagline: true, contactInfo: { phone: '', email: '', website: '', address: '', includeQR: true }, disclaimer: '', includeDisclaimer: false, extraInfo: '' } as WizardBusinessData,
        visualData: { imageStyle: [], imageSource: 'ai', imagePrimarySubject: '', useCustomImage: false, customImageDescription: '', layoutStyle: 'clean', colorSchemeConfirmed: true, customColorNotes: '' } as VisualData,
    };

    // --- Add condition to show processing/results view ---
    if (wizardState.submittedRequestId && wizardState.requestStatus !== 'completed') {
      return (
        <div className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-electric-teal mb-4">Processing Your Request</h2>
          <div className="my-6">
             {/* Optional: Add a spinner or animation */}
             <svg className="animate-spin h-10 w-10 text-electric-teal mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          </div>
          <p className="text-white mb-6">
            {wizardState.processingMessage}
          </p>
          {wizardState.submitError && (
            <p className="text-red-500 text-sm mt-4">Error: {wizardState.submitError}</p>
          )}
          <p className="text-sm text-gray-400">You can leave this page, your request is being processed. We&apos;ll notify you (or implement display on return later).</p>
          {/* Optionally add a button to go back to dashboard or start new? */}
        </div>
      );
    }
    
    if (wizardState.requestStatus === 'completed' && wizardState.finalImageUrls) {
      return (
        <div className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto">
           <h2 className="text-2xl font-bold text-green-500 mb-4">Your Final Designs Are Ready!</h2>
           <p className="text-white mb-6">
             Our design team has completed your request. Please review the final postcard designs below.
           </p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {wizardState.finalImageUrls.map((url, index) => (
                <div key={index} className="border border-gray-600 rounded-lg overflow-hidden">
                  <img src={url} alt={`Final Design ${index + 1}`} className="w-full h-auto object-contain" />
                  <a 
                     href={url} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="block text-center bg-electric-teal text-charcoal py-2 hover:bg-electric-teal/90 text-sm font-medium"
                  >
                     View/Download Design {index + 1}
                   </a>
                </div>
             ))}
           </div>
            {/* TODO: Add buttons for next steps (e.g., Proceed to Order/Payment) */}
           <div className="mt-8 flex justify-end">
              <motion.button
                 whileHover={{ scale: 1.03 }}
                 whileTap={{ scale: 0.98 }}
                 // onClick={handleProceedToOrder} // Example next step 
                 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
               >
                 Proceed to Order (Placeholder)
               </motion.button>
           </div>
        </div>
      );
    }
    // --- End condition --- 
    
    // Original switch statement for wizard steps
    switch (wizardState.currentStep) {
      // Removed 'method' case
      // Removed 'segmentation' case
        
      case 'brand':
        return <BrandIdentity 
          onComplete={handleBrandComplete} 
          initialData={toComponentBrandData(wizardState.globalBrandData)}
        />;
        
      case 'logo_upload':
        // This step uses global state
        return (
          <motion.div
            key="logo_upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-electric-teal mb-4">Upload Your Logo (Optional)</h2>
            <p className="text-electric-teal/70 mb-6">
              Upload your company logo (PNG, JPG, SVG recommended, max 5MB).
            </p>
            
            <div className="mb-4">
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleLogoSelect} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="px-4 py-2 rounded-lg border border-electric-teal/50 bg-electric-teal/10 text-electric-teal hover:bg-electric-teal/20 transition-colors"
              >
                {wizardState.logoFile ? 'Change Logo' : 'Select Logo'}
              </button>
            </div>

            {/* Logo Preview */}
            {wizardState.logoPreviewUrl && (
              <div className="mb-4 p-4 border border-dashed border-electric-teal/30 rounded-lg inline-block">
                <p className="text-sm text-electric-teal/60 mb-2">Preview:</p>
                <img src={wizardState.logoPreviewUrl} alt="Logo Preview" className="max-h-24 max-w-xs rounded" />
              </div>
            )}
            {/* Show final URL if preview is gone but upload succeeded */}
            {!wizardState.logoPreviewUrl && wizardState.uploadedLogoUrl && (
                 <div className="mb-4 p-4 border border-solid border-green-500/50 rounded-lg inline-block">
                    <p className="text-sm text-green-400 mb-2">Logo Uploaded:</p>
                    <img src={wizardState.uploadedLogoUrl} alt="Uploaded Logo" className="max-h-24 max-w-xs rounded" />
                 </div>
            )}

            {/* Upload Button & Progress */}
            {wizardState.logoFile && !wizardState.uploadedLogoUrl && (
              <div className="mt-4">
                <button 
                  onClick={handleUploadLogo} 
                  disabled={wizardState.isSubmitting || wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100}
                  className="px-6 py-2 rounded-lg bg-electric-teal text-charcoal font-medium hover:bg-electric-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {wizardState.logoUploadProgress === null && 'Upload Logo'}
                  {wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100 && `Uploading ${Math.round(wizardState.logoUploadProgress)}%`}
                  {wizardState.logoUploadProgress === 100 && 'Upload Complete'} 
                </button>
                {wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100 && (
                   <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${wizardState.logoUploadProgress}%` }}></div>
                   </div>
                )}
              </div>
            )}
            
            {wizardState.logoUploadError && (
              <p className="text-red-500 text-sm mt-4">Error: {wizardState.logoUploadError}</p>
            )}

            {/* Navigation Buttons */} 
            <div className="flex justify-between mt-8">
              <button onClick={handleBack} className="text-electric-teal hover:text-electric-teal/80 transition-colors">
                 &larr; Back to Brand Identity
              </button>
               {/* Allow proceeding even if logo upload failed or skipped, but indicate success */}
               <button 
                 onClick={handleLogoStepComplete} 
                 disabled={wizardState.isSubmitting && wizardState.logoUploadProgress !== 100} // Disable only during active upload
                 className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 
                    ${wizardState.uploadedLogoUrl 
                       ? 'bg-green-600 text-white hover:bg-green-700' 
                       : 'bg-electric-teal text-charcoal hover:bg-electric-teal/90'} 
                    disabled:opacity-50 disabled:cursor-not-allowed`}
               >
                  {wizardState.uploadedLogoUrl ? 'Logo Saved, Continue' : 'Skip / Continue \&rarr;'}
               </button>
             </div>
          </motion.div>
        );
        
      case 'marketing':
        return (
          <MarketingGoals
            onComplete={handleMarketingComplete}
            initialData={toComponentMarketingData(safeActiveCampaign.marketingData)}
          />
        );
        
      case 'audience':
        const targetDescription = getTargetDescription();
        const audienceInitialData = {
          ...safeActiveCampaign.audienceData,
          targetDescription: targetDescription || safeActiveCampaign.audienceData.targetDescription
        };
        return (
          <TargetAudience
            onComplete={handleAudienceComplete}
            initialData={audienceInitialData}
            segment={wizardState.designScope === 'multiple' ? (wizardState.activeDesignType ?? undefined) : undefined} // Fix type error
          />
        );
        
      case 'business':
        return (
          <BusinessDetails
            onComplete={handleBusinessComplete}
            initialData={toComponentBusinessData(safeActiveCampaign.businessData)}
          />
        );
        
      case 'visual':
        return <VisualElements 
          onComplete={handleVisualComplete} 
          initialData={safeActiveCampaign.visualData}
          // primaryColor and accentColor props removed
        />;
        
      case 'review':
        // Placeholder for Review component - needs significant updates
        return (
          <div className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-electric-teal mb-4">Review & Submit Request</h2>
             {/* TODO: Display summary based on wizardState.campaigns and wizardState.designScope */}
            <p className="text-white mb-4">
              Review your selections below. This will submit a request for our design team.
              (Review summary not implemented yet for campaign structure)
            </p>
            
            {/* Display selected campaigns */}
            <div className="mb-6 space-y-2">
              <h3 className="text-lg font-semibold text-electric-teal">Campaign(s) to be designed:</h3>
              {wizardState.campaigns.map(campaign => (
                <div key={campaign.businessType} className="p-2 bg-gray-800/50 rounded">
                  <p className="text-electric-teal/80">- {campaign.businessType === '__all__' ? 'General Design' : campaign.businessType}</p>
                  {/* Add more detail previews here if needed */}
                </div>
              ))}
            </div>

            {wizardState.submitError && (
              <p className="text-red-500 text-sm mb-4">Error: {wizardState.submitError}</p>
            )}

            <div className="flex justify-between items-center mt-8">
               <button 
                 onClick={handleBackToEdit}
                 disabled={wizardState.isSubmitting}
                 className="text-electric-teal hover:text-electric-teal/80 transition-colors disabled:opacity-50"
               >
                  &larr; Back to Edit
               </button>
               <button 
                  onClick={handleSubmitRequest} 
                  disabled={wizardState.isSubmitting}
                  className="px-6 py-3 rounded-lg bg-electric-teal text-charcoal font-medium 
                    hover:bg-electric-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {wizardState.isSubmitting ? 'Submitting...' : 'Submit Design Request'}
                </button>
             </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // --- Update stepOrder to include design_choice ---
  const stepOrder: WizardStep[] = [
    'design_choice',
    'brand',
    'logo_upload',
    'marketing',
    'audience',
    'business',
    'visual',
    'review'
  ];
  // --- End stepOrder update ---

  // --- Determine current step index for progress bar ---
  const getCurrentStepIndex = () => {
     // Adjust index calculation because 'design_choice' is conditional
     const currentVisibleStep = wizardState.currentStep;
     // If scope is single, treat 'brand' as the first step visually
     if (wizardState.designScope === 'single' && wizardState.currentStep === 'brand') {
       // This logic might need refinement depending on how progress is displayed
     }

     // If the current step is design_choice, index is 0
     if (currentVisibleStep === 'design_choice') return 0;

     // Find index in potentially filtered list
     const baseSteps = stepOrder.filter(step => step !== 'design_choice');
     const indexInBase = baseSteps.indexOf(currentVisibleStep);
     
     // If scope was multiple, the base index is effectively shifted by 1
     return wizardState.designScope === 'multiple' ? indexInBase + 1 : indexInBase;
  };
  const totalSteps = wizardState.designScope !== 'multiple' 
      ? stepOrder.length - 1 // Exclude design_choice
      : stepOrder.length; // Include design_choice
  const currentStepIndex = getCurrentStepIndex();
  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;
  // --- End progress calculation ---

  // --- Main component return ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-charcoal to-gray-900 p-4 sm:p-8 text-white">
      <div className="max-w-6xl mx-auto">
        {/* Back Button (Logic adjusted slightly for clarity) */}
        {wizardState.currentStep !== 'design_choice' && 
         wizardState.currentStep !== 'brand' && 
         !wizardState.submittedRequestId && (
          <button 
            onClick={handleBack} 
            className="mb-4 text-electric-teal hover:text-electric-teal/80 transition-colors"
          >
            &larr; Back to {stepTitles[stepOrder[stepOrder.indexOf(wizardState.currentStep) -1]] ?? 'Previous Step'}
          </button>
        )}
        {/* Back from Brand step */}
        {wizardState.currentStep === 'brand' && !wizardState.submittedRequestId && (
           <button 
            onClick={handleBack} 
            className="mb-4 text-electric-teal hover:text-electric-teal/80 transition-colors"
          >
            &larr; Back to {wizardState.designScope === 'multiple' ? 'Scope Selection' : 'Design Method Choice'}
          </button>
        )}
         {/* Back button specific for design_choice step */}
         {wizardState.currentStep === 'design_choice' && onBack && (
          <button 
            onClick={onBack} 
            className="mb-4 text-electric-teal hover:text-electric-teal/80 transition-colors"
          >
            &larr; Back to Design Options
          </button>
        )}

        {/* Conditional Header/Sidebar (Placeholder Structure) */}
        {wizardState.designScope === 'single' && wizardState.currentStep !== 'design_choice' && !wizardState.submittedRequestId && (
          <div className="bg-electric-teal/10 border border-electric-teal/30 rounded-lg p-3 mb-6 text-center text-sm">
            <p className="text-electric-teal">
              Designing one postcard for: <strong className="font-medium">{Array.from(selectedBusinessTypes).join(', ') || 'Selected Leads'}</strong>
            </p>
          </div>
        )}

        {wizardState.designScope === 'multiple' && wizardState.currentStep !== 'design_choice' && !wizardState.submittedRequestId && (
          // TODO: Replace this with a more robust sidebar/tab structure on wider screens
          <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-3 mb-6 text-sm flex flex-wrap gap-2 justify-center items-center">
             <p className="text-blue-300 font-medium mr-2">
               Designing for:
             </p>
             {Array.from(selectedBusinessTypes).map(type => (
               <button
                 key={type}
                 onClick={() => handleSetActiveDesignType(type)} // Connect handler
                 className={`px-3 py-1 rounded transition-colors ${ 
                   wizardState.activeDesignType === type
                     ? 'bg-blue-500 text-white'
                     : 'bg-blue-900/50 hover:bg-blue-800/70 text-blue-200'
                 }`}
               >
                 {type}
               </button>
             ))}
             {/* Consider adding "Done" indicators per type */}
          </div>
        )}
        {/* End Conditional Header/Sidebar */}


        {/* Progress Bar & Title (only if not submitted and not on choice step) */}
        {!wizardState.submittedRequestId && wizardState.currentStep !== 'design_choice' && (
           <div className="mb-8">
             <h1 className="text-3xl font-bold text-electric-teal mb-2">
                {stepTitles[wizardState.currentStep]}
             </h1>
             <div className="w-full bg-gray-700 rounded-full h-2.5">
                 <motion.div
                   className="bg-electric-teal h-2.5 rounded-full"
                   style={{ width: `${progress}%` }} // Ensure progress is used here
                   initial={{ width: 0 }}
                   animate={{ width: `${progress}%` }}
                   transition={{ duration: 0.5, ease: "easeInOut" }}
                 />
             </div>
             <p className="text-sm text-electric-teal/60 mt-1 text-right">Step {currentStepIndex + 1} of {totalSteps}</p>
           </div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {renderStep()} {/* renderStep includes the design_choice step where handleDesignScopeChoice is used */}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HumanAssistedWizard; 