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
  finalDesigns?: string[]; // Add field for final design URLs specific to this campaign
}
// --- End CampaignState Type ---

interface WizardState {
  currentStep: WizardStep;
  designScope: 'single' | 'multiple' | 'undecided';
  activeDesignType: string | null;
  campaigns: CampaignState[];
  completedCampaigns: Set<string>; // Track businessTypes user finished input for

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
  const { user } = useAuth(); // Get user from AuthContext
  const selectedBusinessTypes = useMarketingStore(state => state.selectedBusinessTypes); // Read selected types
  
  const [wizardState, setWizardState] = useState<WizardState>(() => ({ // Use function form for initial state
    currentStep: 'brand', // Default, potentially overridden
    designScope: 'undecided',
    activeDesignType: null,
    campaigns: [], // Initialize as empty, populated by useEffect
    completedCampaigns: new Set<string>(), // Initialize empty set
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
    setWizardState(prev => ({
        ...prev,
        // Ensure globalBrandData also gets the final logo URL when completing this step
        globalBrandData: { ...prev.globalBrandData, logoUrl: prev.uploadedLogoUrl || prev.globalBrandData.logoUrl }, 
        currentStep: 'marketing' 
    }));
  };

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

  const handleVisualComplete = async (visualData: VisualData) => {
    // 1. Update local visual data state synchronously first
    const currentActiveType = wizardState.activeDesignType;
    updateActiveCampaignData('visualData', visualData);
    
    // 2. Add to completed set (sync state update)
    if (currentActiveType) {
      setWizardState(prev => ({ ...prev, completedCampaigns: new Set(prev.completedCampaigns).add(currentActiveType) }));
    }

    // 3. Perform Async Operations (Firestore/API) based on current state
    // Get necessary state *after* sync updates have likely settled (or read directly)
    const { designScope, submittedRequestId, campaigns, activeDesignType, globalBrandData, uploadedLogoUrl } = wizardState;
    // Create a snapshot of campaigns *with the updated visual data* for Firestore write
     const campaignsForWrite = campaigns.map(c => 
          c.businessType === activeDesignType ? {...c, visualData} : c
      );

    // Check if this is the FIRST campaign completion in MULTIPLE scope
    if (designScope === 'multiple' && !submittedRequestId) {
        console.log("Completing Visual step for the FIRST campaign... Creating doc and notifying...");
        setWizardState(prev => ({ ...prev, isSubmitting: true, submitError: null, processingMessage: 'Saving first campaign & notifying admin...'}));

        let newRequestId: string | null = null;
        try {
            if (!user) throw new Error("User not authenticated.");
            const initialRequestData = {
                userId: user.uid,
                status: 'draft_multiple',
                designScope: 'multiple',
                globalBrandData: globalBrandData,
                campaigns: campaignsForWrite, // Use updated campaigns array
                logoUrl: uploadedLogoUrl || '',
                createdAt: serverTimestamp(),
                notifiedAdmin: false, 
            };
            const docRef = await addDoc(collection(db, "design_requests"), initialRequestData);
            newRequestId = docRef.id;
            console.log("Initial multi-design doc created with ID:", newRequestId);

            // Call API
            await fetch('/api/generate-design-prompt', { 
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ documentId: newRequestId }),
             });
            // TODO: Check API response ok? For now, proceed.
            console.log("Initial notification API call initiated.");

            // Update state AFTER successful async operations
            setWizardState(prev => ({
                ...prev,
                submittedRequestId: newRequestId, 
                requestStatus: 'draft_multiple',
                isSubmitting: false,
                processingMessage: '',
                currentStep: 'review' // Navigate on success
            }));
            return; // Exit function after successful state update

        } catch (error) {
            console.error("Error during first campaign save & notify:", error);
            setWizardState(prev => ({
                ...prev, 
                isSubmitting: false, 
                submitError: `Failed to save first campaign: ${error instanceof Error ? error.message : 'Unknown error'}`,
                processingMessage: '',
                // Don't navigate if save failed
            }));
            return; // Exit function on error
        }
    }
    // If subsequent campaign completion in MULTIPLE scope, update existing doc
    else if (designScope === 'multiple' && submittedRequestId) {
         try {
             const docRef = doc(db, "design_requests", submittedRequestId);
             const campaignIndex = campaignsForWrite.findIndex(c => c.businessType === activeDesignType);
             if (campaignIndex !== -1) {
                 await updateDoc(docRef, { [`campaigns.${campaignIndex}.visualData`]: visualData });
                 console.log("Firestore visual data updated successfully for subsequent campaign.");
             } else {
                 console.warn("Could not find active campaign index to update Firestore visual data.");
             }
         } catch (error) {
             console.error("Failed to update visual data in Firestore for subsequent campaign:", error);
             // Potentially set an error state here?
         }
    }

    // If single scope, or if multi-scope update finished (or failed gracefully),
    // navigate to the next step. Do this outside the async try/catch for first save.
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
  const handleDesignScopeChoice = (scope: 'single' | 'multiple') => { // No longer async
    const typesArray = Array.from(selectedBusinessTypes);
    const firstActiveType = typesArray.length > 0 ? typesArray[0] : null;
    const activeTypeForSingle = typesArray.length === 1 ? typesArray[0] : '__all__';

    // Update local state only - No early submission/API call
    setWizardState(prev => {
        // Prepare initial campaign structure (needed for both paths now)
        const defaultMarketingData: WizardMarketingData = { objectives: [], callToAction: '', promotionDetails: '', eventDate: '', offerDetails: '', marketingObjectives: '' };
        const defaultAudienceData: AudienceData = { industry: '', targetDescription: '' };
        const defaultBusinessData: WizardBusinessData = { tagline: '', useAiTagline: true, contactInfo: { phone: '', email: '', website: '', address: '', includeQR: true }, disclaimer: '', includeDisclaimer: false, extraInfo: '' };
        const defaultVisualData: VisualData = { imageStyle: [], imageSource: 'ai', imagePrimarySubject: '', useCustomImage: false, customImageDescription: '', layoutStyle: 'clean', colorSchemeConfirmed: true, customColorNotes: '' };

        let initialCampaigns: CampaignState[];
        if (scope === 'multiple') {
            initialCampaigns = typesArray.map(type => ({
                businessType: type,
                marketingData: { ...defaultMarketingData },
                audienceData: { ...defaultAudienceData },
                businessData: { ...defaultBusinessData },
                visualData: { ...defaultVisualData },
            }));
        } else {
             const singleCampaignType = typesArray.length === 1 ? typesArray[0] : '__all__';
             initialCampaigns = [{
                businessType: singleCampaignType,
                marketingData: { ...defaultMarketingData },
                audienceData: { ...defaultAudienceData },
                businessData: { ...defaultBusinessData },
                visualData: { ...defaultVisualData },
            }];
        }

        return {
      ...prev,
            designScope: scope,
            currentStep: 'brand', // Always start at brand after choice
            activeDesignType: scope === 'multiple' ? firstActiveType : activeTypeForSingle,
            campaigns: initialCampaigns, // Set the initialized campaigns
            submittedRequestId: null, // Explicitly ensure no ID is set here
            requestStatus: null,
            isSubmitting: false,
            submitError: null,
            processingMessage: '',
        };
    });
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
      // Destructure state needed
      const { designScope, campaigns, uploadedLogoUrl, submittedRequestId, globalBrandData } = wizardState;
      let finalRequestId = submittedRequestId;
      let docNeedsCreation = false;

      if (designScope === 'single') {
        // --- Single Scope: Document needs creation --- 
        if (finalRequestId) {
            console.warn("Unexpected existing document ID found for single scope submission. Overwriting may occur if logic proceeds.");
            // Decide how to handle - overwrite or throw error? Let's proceed but be aware.
        }
        docNeedsCreation = true;

      } else if (designScope === 'multiple' && finalRequestId) {
        // --- Multiple Scope: Document should exist, just update status --- 
        console.log(`Finalizing multi-design request, updating doc ${finalRequestId} status...`);
        const docRef = doc(db, "design_requests", finalRequestId);
        await updateDoc(docRef, {
          status: 'pending_prompt',
          globalBrandData: globalBrandData,
          campaigns: campaigns,
          logoUrl: uploadedLogoUrl || '', // <<< Ensure current logo URL is included
        });
        console.log(`Doc ${finalRequestId} status updated to pending_prompt.`);
        setWizardState(prev => ({ ...prev, requestStatus: 'pending_prompt' })); // Update local status
        // API call will happen below

      } else if (designScope === 'multiple' && !finalRequestId) {
          // This case shouldn't happen if handleVisualComplete worked correctly
          console.error("Multi-design scope submission attempted without a document ID!");
          throw new Error("Cannot finalize multi-design request: document not found.");
      } else {
          throw new Error(`Invalid state for submission: scope=${designScope}, id=${finalRequestId}`);
      }

      // Create document if needed (only for single scope now)
      if (docNeedsCreation) {
          console.log("Creating document for single-design request...");
      const requestData = {
              userId: user.uid,
        status: 'pending_prompt',
              designScope: 'single',
              globalBrandData: globalBrandData, 
              campaigns: campaigns,
              logoUrl: uploadedLogoUrl || '', // <<< Ensure current logo URL is included
        createdAt: serverTimestamp(),
              notifiedAdmin: false,
      };
      const docRef = await addDoc(collection(db, "design_requests"), requestData);
          finalRequestId = docRef.id;
          console.log("Single request document created with ID:", finalRequestId);
          setWizardState(prev => ({ ...prev, submittedRequestId: finalRequestId, requestStatus: 'pending_prompt' }));
      }

      // --- Call the main processing API (for both scopes now) --- 
      if (!finalRequestId) {
         throw new Error("Failed to get document ID for API call.");
      }
      console.log(`Calling main API route /api/generate-design-prompt for document ${finalRequestId}`);
      const response = await fetch('/api/generate-design-prompt', { // Use the main API
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: finalRequestId }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error("Main API call failed:", result);
        // Update status to failed? Let listener handle maybe?
        throw new Error(result.error || 'Failed to trigger prompt generation API.');
      }
      console.log("Main API route call successful:", result);

      // Update local state - Listener will take over
      setWizardState(prev => ({ 
        ...prev, 
        isSubmitting: false,
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
    // Show processing view ONLY if request submitted AND status indicates backend processing 
    // OR if there's a final submission error. Allow UI interaction for 'draft_multiple'.
    const isBackendProcessing = wizardState.submittedRequestId && 
                               (wizardState.requestStatus === 'pending_prompt' || 
                                wizardState.requestStatus === 'pending_review' || 
                                wizardState.requestStatus === 'processing_failed' || // Add failed status
                                wizardState.submitError); // Show on submit error too

    if (isBackendProcessing && wizardState.requestStatus !== 'completed') {
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
            {wizardState.processingMessage || `Processing request (Status: ${wizardState.requestStatus ?? 'Unknown'})...`}
          </p>
          {wizardState.submitError && (
            <p className="text-red-500 text-sm mt-4">Error: {wizardState.submitError}</p>
          )}
          <p className="text-sm text-gray-400">You can leave this page, your request is being processed. We&apos;ll notify you.</p>
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

    // --- Add new case for design_choice ---
    if (wizardState.currentStep === 'design_choice') {
       const typesArray = Array.from(selectedBusinessTypes); // Access from component scope
       return (
          <motion.div
             key="design_choice"
             initial={{ opacity: 0, x: -50 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: 50 }}
             transition={{ duration: 0.3 }}
             className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto"
          >
             <h2 className="text-2xl font-bold text-electric-teal mb-4">Design Scope</h2>
             <p className="text-electric-teal/70 mb-6">
                You&apos;ve selected leads from multiple business types: <strong className="text-electric-teal">{typesArray.join(', ')}</strong>.
             </p>
             <p className="text-electric-teal/70 mb-6">
                How would you like to proceed with the design?
             </p>
             <div className="space-y-4">
                <button
                   onClick={() => handleDesignScopeChoice('single')}
                   className="w-full text-left p-4 rounded-lg border-2 border-electric-teal/50 hover:border-electric-teal hover:bg-electric-teal/10 transition-colors duration-200"
                >
                   <h3 className="text-lg font-medium text-electric-teal">Create ONE Design</h3>
                   <p className="text-sm text-electric-teal/60">Generate a single postcard design suitable for all selected business types.</p>
                </button>
                <button
                   onClick={() => handleDesignScopeChoice('multiple')}
                   className="w-full text-left p-4 rounded-lg border-2 border-electric-teal/50 hover:border-electric-teal hover:bg-electric-teal/10 transition-colors duration-200"
                >
                   <h3 className="text-lg font-medium text-electric-teal">Create MULTIPLE Designs</h3>
                   <p className="text-sm text-electric-teal/60">Generate a separate, tailored postcard design for each selected business type.</p>
                </button>
             </div>
              <div className="flex justify-start mt-8">
                 <button
                    onClick={handleBack} // Use the existing back handler
                    className="text-electric-teal hover:text-electric-teal/80 transition-colors"
                 >
                    &larr; Back
                 </button>
              </div>
          </motion.div>
       );
    }
    // --- End design_choice case ---
    
    // Original switch statement for wizard steps
    switch (wizardState.currentStep) {
      // Removed 'method' case
      // Removed 'segmentation' case
        
      case 'brand':
        return <BrandIdentity 
            onComplete={handleBrandComplete}
          initialData={toComponentBrandData(wizardState.globalBrandData)}
            hideLogoInput={true}
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

            {/* Upload Button & Progress - REMOVED OLD SECTION */}
            {/* {wizardState.logoFile && !wizardState.uploadedLogoUrl && ( ... )} */}
            {/* End Removed Section */}
              
              {wizardState.logoUploadError && (
              <p className="text-red-500 text-sm mt-4">Error: {wizardState.logoUploadError}</p>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8"> {/* Use items-center for vertical alignment */}
              {/* Back Button (remains on the left) */}
              <button onClick={handleBack} className="text-electric-teal hover:text-electric-teal/80 transition-colors">
                 &larr; Back to Brand Identity
              </button>

              {/* Right-side Buttons Container */}
              <div className="flex items-center space-x-3"> {/* Use flex and space-x for side-by-side */}

                {/* Upload Logo Button (Conditional Display & State) */}
                {wizardState.logoFile && !wizardState.uploadedLogoUrl && (
                  <div className="flex flex-col items-end"> {/* Container for button + progress */}
                    <button
                  onClick={handleUploadLogo} 
                      disabled={wizardState.isSubmitting || (wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100)}
                      className="px-6 py-2 rounded-lg bg-electric-teal text-charcoal font-medium hover:bg-electric-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {wizardState.logoUploadProgress === null && 'Upload Logo'}
                      {wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100 && `Uploading ${Math.round(wizardState.logoUploadProgress)}%`}
                      {wizardState.logoUploadProgress === 100 && 'Upload Complete'}
                    </button>
                    {/* Progress Bar (shown below button during upload) */}
                    {wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100 && (
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${wizardState.logoUploadProgress}%` }}></div>
                      </div>
              )}
            </div>
                )}

                {/* Skip / Continue Button */}
                <button
                  onClick={handleLogoStepComplete}
                  // Disable during any submission/upload process
                  disabled={wizardState.isSubmitting || (wizardState.logoUploadProgress !== null && wizardState.logoUploadProgress < 100)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    ${wizardState.uploadedLogoUrl
                      ? 'bg-green-600 text-white hover:bg-green-700' // Style for Continue (logo uploaded)
                      : 'border border-electric-teal/50 text-electric-teal hover:bg-electric-teal/10' // Style for Skip (no logo or not uploaded yet)
                    }
                  `}
                >
                  {wizardState.uploadedLogoUrl ? 'Continue' : 'Skip'}
                </button>
          </div>
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
        return (
          <TargetAudience
            onComplete={handleAudienceComplete}
            initialData={safeActiveCampaign.audienceData} 
            segment={wizardState.designScope === 'multiple' ? (wizardState.activeDesignType ?? undefined) : undefined} 
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
  // Determine if we are in the multi-design flow after initial submission
  const isMultiDesignActive = wizardState.designScope === 'multiple' && wizardState.submittedRequestId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-charcoal to-gray-900 p-4 sm:p-8 text-white">
      {/* Wrap content and potential sidebar */}
      <div className={`max-w-6xl mx-auto ${isMultiDesignActive ? 'md:flex md:gap-8' : ''}`}>
        
        {/* --- Persistent Sidebar/Switcher (Multi-Design Active) --- */} 
        {isMultiDesignActive && (
          <div className="md:w-1/4 lg:w-1/5 mb-6 md:mb-0 md:sticky md:top-8 self-start">
            <h3 className="text-lg font-semibold text-blue-300 mb-3 border-b border-blue-400/30 pb-2">Campaigns</h3>
            <div className="space-y-2">
              {wizardState.campaigns.map(campaign => {
                const isComplete = campaign.finalDesigns && campaign.finalDesigns.length > 0;
                const isActive = wizardState.activeDesignType === campaign.businessType;
                const thumbnail = campaign.finalDesigns?.[0]; // Get first image for thumbnail

                return (
                  <button
                    key={campaign.businessType}
                    onClick={() => handleSetActiveDesignType(campaign.businessType)}
                    className={`w-full text-left p-3 rounded transition-colors duration-150 flex items-center gap-3 
                      ${isActive 
                        ? 'bg-blue-600 shadow-md' 
                        : 'bg-blue-900/50 hover:bg-blue-800/70'}
                      ${isComplete ? 'border-l-4 border-green-500' : 'border-l-4 border-transparent'}
                    `}
                  >
                    {/* Thumbnail or Placeholder */} 
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                      {isComplete && thumbnail ? (
                        <img src={thumbnail} alt={`${campaign.businessType} thumbnail`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-400 text-xs">{isComplete ? 'Done' : 'WIP'}</span> // Simple status indicator
                      )}
                    </div>
                    {/* Campaign Name */} 
                    <span className="flex-grow text-sm font-medium truncate">
                      {campaign.businessType === '__all__' ? 'General Design' : campaign.businessType}
               </span>
                    {/* Optional: More status icons (e.g., loading spinner if status==pending_review) */} 
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* --- End Sidebar --- */} 

        {/* --- Main Content Area --- */} 
        <div className={`${isMultiDesignActive ? 'md:flex-grow' : 'w-full'}`}>
          {/* Back Button Logic (Adjusted - might need rethinking with sidebar) */} 
           {/* ... Existing Back button rendering ... */}
          {/* Maybe hide global back button when sidebar is active? */} 

          {/* Conditional Header (Single Design Only Now) */} 
          {wizardState.designScope === 'single' && wizardState.currentStep !== 'design_choice' && !wizardState.submittedRequestId && (
            <div className="bg-electric-teal/10 border border-electric-teal/30 rounded-lg p-3 mb-6 text-center text-sm">
              <p className="text-electric-teal">
                Designing one postcard for: <strong className="font-medium">{Array.from(selectedBusinessTypes).join(', ') || 'Selected Leads'}</strong>
              </p>
           </div>
            )}

          {/* Removed the simple multi-design header - replaced by sidebar */} 

          {/* Progress Bar & Title (Show if not fully completed) */} 
          {wizardState.requestStatus !== 'completed' && wizardState.currentStep !== 'design_choice' && (
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

          {/* --- Main Step/Status Content --- */} 
        <AnimatePresence mode="wait">
            {(() => {
              // 1. Check for Overall Completion
              if (wizardState.requestStatus === 'completed' && wizardState.campaigns.some(c => c.finalDesigns && c.finalDesigns.length > 0)) {
                // Find designs for the *active* type if possible, or show all?
                const activeCamp = getActiveCampaign();
                const designsToShow = activeCamp?.finalDesigns && activeCamp.finalDesigns.length > 0 
                                      ? activeCamp.finalDesigns 
                                      : wizardState.campaigns.flatMap(c => c.finalDesigns || []); // Fallback: show all
                return (
                  <motion.div key="completed-view" /* ... animations ... */ className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-green-500 mb-4">Design(s) Ready!</h2>
                    {/* ... Render final designs from designsToShow ... */}
                    {designsToShow.map((url, index) => <img key={index} src={url} alt={`Final Design ${index + 1}`} className="mb-4 max-w-full h-auto"/>)}
          </motion.div>
                );
              }
              
              // 2. Check if in Multi-Design and Active Campaign has Final Designs
              const activeCampaignData = getActiveCampaign();
              if (isMultiDesignActive && activeCampaignData?.finalDesigns && activeCampaignData.finalDesigns.length > 0) {
                return (
                  <motion.div key={`${activeCampaignData.businessType}-final`} /* ... animations ... */ className="p-8 bg-charcoal rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold text-green-400 mb-4">Final Design for: {activeCampaignData.businessType}</h2>
                    {/* Render final designs for THIS campaign */}
                    {activeCampaignData.finalDesigns.map((url, index) => <img key={index} src={url} alt={`${activeCampaignData.businessType} Design ${index + 1}`} className="mb-4 max-w-full h-auto"/>)}
                    {/* Add button to switch campaign or proceed? */} 
                  </motion.div>
                );
              }

              // 3. Check if in Multi-Design and Active Campaign is Submitted by User (Awaiting Admin)
              if (isMultiDesignActive && wizardState.completedCampaigns.has(wizardState.activeDesignType || '')) {
                 return (
                    <motion.div key={`${wizardState.activeDesignType}-pending`} /* ... animations ... */ className="p-8 bg-gray-800 rounded-lg shadow-lg text-center">
                      <h2 className="text-xl font-bold text-yellow-400 mb-4">Campaign Submitted: {wizardState.activeDesignType}</h2>
                      <p className="text-gray-300">This campaign&apos;s details have been submitted.</p>
                      <p className="text-gray-300 mt-2">Status: <span className="font-medium">{wizardState.processingMessage || wizardState.requestStatus || 'Awaiting admin review'}</span></p>
                      {/* Spinner? */} 
                      <p className="text-sm text-gray-500 mt-4">You can work on other campaigns using the sidebar.</p>
                    </motion.div>
                 );
              }
              
              // 4. Check for global backend processing or submission error
              const isBackendProcessing = wizardState.submittedRequestId && 
                                        (wizardState.requestStatus === 'pending_prompt' || 
                                         wizardState.requestStatus === 'pending_review' || 
                                         wizardState.requestStatus === 'processing_failed' || 
                                         wizardState.submitError); // Only show full block on FINAL submit error/processing
              if (isBackendProcessing && wizardState.designScope !== 'multiple') { // Only block for single scope now
                 return <motion.div key="processing-view" className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto">{renderStep()}</motion.div>; 
              }
              
              // 5. Otherwise, render the current wizard step using renderStep()
              return <motion.div key={wizardState.currentStep} /* ... animations ... */>{renderStep()}</motion.div>; 

            })()}
        </AnimatePresence>
        </div>
        {/* --- End Main Content Area --- */} 

      </div>
    </div>
  );
};

export default HumanAssistedWizard; 