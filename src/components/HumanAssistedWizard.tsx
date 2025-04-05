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
import { collection, addDoc, serverTimestamp, doc, onSnapshot, Unsubscribe } from "firebase/firestore"; 
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
  isSubmitting: boolean; // Added for submission state
  submitError: string | null; // Added for submission error state
  // --- New state for results ---
  submittedRequestId: string | null; // Store the ID after submission
  requestStatus: string | null; // Track status from Firestore
  finalImageUrls: string[] | null; // Store final images from Firestore
  processingMessage: string; // Message to show while waiting
  // --- End new state ---
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
    isSubmitting: false, // Initialize submitting state
    submitError: null, // Initialize error state
    // --- Initialize new state ---
    submittedRequestId: null,
    requestStatus: null,
    finalImageUrls: null,
    processingMessage: 'Your request is being submitted...',
    // --- End initialize new state ---
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null); // Ref for unsubscribe function

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
    
    setWizardState(prev => ({ ...prev, logoUploadProgress: 0, logoUploadError: null, isSubmitting: true })); // Indicate upload start

    // --- Firebase Upload Logic --- 
    const storageRef = ref(storage, `logos/${Date.now()}_${wizardState.logoFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, wizardState.logoFile);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
        setWizardState(prev => ({ ...prev, logoUploadProgress: progress }));
      },
      (error) => {
        console.error("Upload failed:", error);
        let errorMessage = 'Upload failed. Please try again.';
        switch (error.code) {
          case 'storage/unauthorized':
            errorMessage = 'Permission denied. Please check storage rules.';
            break;
          case 'storage/canceled':
            errorMessage = 'Upload cancelled.';
            break;
          case 'storage/unknown':
            errorMessage = 'An unknown error occurred during upload.';
            break;
        }
        setWizardState(prev => ({ ...prev, logoUploadError: errorMessage, logoUploadProgress: null, isSubmitting: false }));
      },
      () => {
        // Upload completed successfully, now get the download URL
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          setWizardState(prev => ({
            ...prev,
            brandData: { ...prev.brandData, logoUrl: downloadURL }, // Save the REAL URL
            logoUploadProgress: 100, // Mark as complete
            isSubmitting: false, // Upload finished
            // Keep currentStep as 'logo_upload' - user clicks Next to proceed
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
    // --- End Firebase Upload Logic ---
    
    // --- Placeholder Success Removed --- 
    // console.log("Simulating logo upload for:", wizardState.logoFile.name);
    // await new Promise(resolve => setTimeout(resolve, 1500)); 
    // const simulatedUrl = `https://fake-storage.com/logos/${Date.now()}_${wizardState.logoFile.name}`;
    // setWizardState(prev => ({
    //   ...prev,
    //   brandData: { ...prev.brandData, logoUrl: simulatedUrl }, // Save simulated URL
    //   logoUploadProgress: 100,
    //   currentStep: 'marketing' // Navigate on success
    // }));
    // console.log("Simulated upload complete. URL:", simulatedUrl);
    // --- End Placeholder Success ---
  };

  // Navigate to next step AFTER successful upload and URL retrieval
  const handleLogoStepComplete = () => {
    if (wizardState.brandData.logoUrl) { 
       setWizardState(prev => ({ ...prev, currentStep: 'marketing' }));
    } else {
       // This case should ideally be prevented by disabling the button
       setWizardState(prev => ({ ...prev, logoUploadError: 'Please upload a logo successfully before continuing.'}));
    }
  }

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
  const handleSubmitRequest = async () => {
    setWizardState(prev => ({ 
      ...prev, 
      isSubmitting: true, 
      submitError: null, 
      processingMessage: 'Submitting your request...' // Initial message
    }));

    // --- Add check for authenticated user --- 
    if (!user) {
      setWizardState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: 'You must be logged in to submit a design request.'
      }));
      console.error("User is not authenticated. Cannot submit request.");
      return;
    }
    // --- End user check ---

    console.log('Submitting human-assisted design request with data for user:', user.uid, wizardState);

    // Ensure logo is uploaded
    if (!wizardState.brandData.logoUrl) {
      setWizardState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: 'Logo URL is missing. Please ensure the logo was uploaded successfully.'
      }));
      return;
    }

    try {
      // 1. Prepare data for Firestore
      const requestData = {
        userId: user.uid, // Use the authenticated user's ID
        status: 'pending_prompt',
        userInputData: {
          brandData: wizardState.brandData,
          marketingData: wizardState.marketingData,
          audienceData: wizardState.audienceData,
          businessData: wizardState.businessData,
          visualData: wizardState.visualData,
        },
        logoUrl: wizardState.brandData.logoUrl,
        createdAt: serverTimestamp(),
        notifiedAdmin: false, // Initialize notification status
      };
      
      console.log("Writing initial data to Firestore...", requestData);

      // 2. Write initial data to Firestore
      const docRef = await addDoc(collection(db, "design_requests"), requestData);
      const newRequestId = docRef.id;
      console.log("Initial document written with ID: ", newRequestId);
      
      // --- Set the submittedRequestId to trigger the listener --- 
      setWizardState(prev => ({
        ...prev,
        submittedRequestId: newRequestId,
        processingMessage: 'Request submitted. Triggering AI processing...',
      }));
      // --- End set ID ---

      // 3. Call the backend API route
      console.log(`Calling API route /api/generate-design-prompt for document ${newRequestId}`);
      const response = await fetch('/api/generate-design-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: newRequestId }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("API route call failed:", result);
        // Update Firestore status to failed if API call fails?
        // Or just show error to user
        throw new Error(result.error || 'Failed to trigger prompt generation.');
      }

      console.log("API route call successful:", result);
      // API success doesn't mean completion, the listener will handle status updates
      // The isSubmitting state can be set to false here, but the UI should show the processing message
      setWizardState(prev => ({ 
        ...prev, 
        isSubmitting: false, // API call finished, now waiting on Firestore updates
        processingMessage: 'AI processing initiated. Waiting for admin review...' // Update message
      }));
      
    } catch (error) {
      console.error("Error submitting design request:", error);
      setWizardState(prev => ({
        ...prev,
        isSubmitting: false,
        submitError: error instanceof Error ? error.message : 'An unknown error occurred.',
        processingMessage: 'Submission failed.', // Update message on error
        submittedRequestId: null, // Reset ID on failure
      }));
    }
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
Please upload your company logo. This will be shared with our designer. Recommended formats: PNG, JPG, SVG. Max size: 5MB.
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
                onClick={handleBack} // Go back to Brand step
                disabled={wizardState.isSubmitting} // Disable if uploading
                className={`px-6 py-2 border border-electric-teal/50 text-electric-teal rounded-lg hover:border-electric-teal transition-colors ${wizardState.isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ← Back
              </motion.button>
              
              {/* Button logic: Show Upload or Next depending on state */} 
              {!wizardState.brandData.logoUrl ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUploadLogo} // Trigger upload 
                  disabled={!wizardState.logoFile || wizardState.isSubmitting}
                  className={`px-6 py-2 rounded-lg ${!wizardState.logoFile || wizardState.isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-electric-teal text-charcoal hover:bg-electric-teal/90'} transition-colors`}
                >
                  {wizardState.isSubmitting ? 'Uploading...' : 'Upload Logo'}
                </motion.button>
              ) : (
                 <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogoStepComplete} // Navigate to next step
                  disabled={wizardState.isSubmitting} // Still disable if somehow submitting state is true
                  className={`px-6 py-2 rounded-lg ${wizardState.isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'} transition-colors`}
                >
                  Next →
                </motion.button>
              )}
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
        // Simplified Review step - assumes user just submits from here
        return (
           <div className="p-8 bg-charcoal rounded-lg shadow-lg max-w-3xl mx-auto text-white">
             <h2 className="text-2xl font-bold text-electric-teal mb-4">Review & Submit Request</h2>
             {/* Consider showing a summary here instead of full JSON */}
             <p className="text-sm text-gray-300 mb-4">Summary of your request:</p>
             <ul className="list-disc list-inside mb-6 text-sm space-y-1">
                <li>Brand Name: {wizardState.brandData.brandName}</li>
                <li>Logo: {wizardState.brandData.logoUrl ? 'Uploaded' : 'Missing'}</li>
                <li>Marketing Objective: {wizardState.marketingData.objectives.join(', ') || 'Not specified'}</li>
                {/* Add more key details */} 
             </ul>
             
             <p className="text-sm text-amber-400 mb-6">Note: This request involves human review and image generation. This process may take some time. You&apos;ll be shown progress updates after submission.</p>
             
             {wizardState.submitError && (
               <p className="text-red-500 mb-4">Error: {wizardState.submitError}</p>
             )}
             
             <div className="flex justify-between">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBackToEdit} // Use specific back to edit from review
                  disabled={wizardState.isSubmitting} // Disable if submitting
                  className={`px-6 py-2 border border-electric-teal/50 text-electric-teal rounded-lg hover:border-electric-teal transition-colors ${wizardState.isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                   ← Edit Details
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmitRequest}
                  disabled={wizardState.isSubmitting}
                  className={`px-6 py-2 rounded-lg ${wizardState.isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'} transition-colors`}
                >
                   {wizardState.isSubmitting ? 'Submitting...' : 'Submit Request'}
                </motion.button>
              </div>
           </div>
        );
        
      default:
        return null;
    }
  };

  // Calculate step order dynamically (only includes steps up to review)
  const stepOrder: WizardStep[] = ['brand', 'logo_upload', 'marketing', 'audience', 'business', 'visual', 'review'];
  const currentStepIndex = stepOrder.indexOf(wizardState.currentStep);

  // Conditionally render steps or processing/results view
  const shouldShowWizardSteps = !wizardState.submittedRequestId || (wizardState.requestStatus === 'completed' && wizardState.finalImageUrls !== null); // Show steps initially OR when completed

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
          {shouldShowWizardSteps && currentStepIndex !== -1 && (
            <div className="w-full h-2 bg-charcoal-light rounded-full overflow-hidden">
              <div 
                className="h-full bg-electric-teal rounded-full transition-all duration-300"
                style={{ width: `${(currentStepIndex / (stepOrder.length - 1)) * 100}%` }}
              />
            </div>
          )}
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
            key={wizardState.submittedRequestId ? (wizardState.requestStatus === 'completed' ? 'results' : 'processing') : wizardState.currentStep} // Key changes for processing/results
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