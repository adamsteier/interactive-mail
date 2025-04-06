'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext'; // To get the logged-in user
import { useLeadsStore } from '@/store/leadsStore'; // Import the new leads store
import { useMarketingStore } from '@/store/marketingStore'; // Import Marketing Store
import { BrandingData, CampaignDesignData } from '@/types/firestoreTypes'; // Types
import { getBrandDataForUser, addBrandData } from '@/lib/brandingService'; // Service functions
import { addCampaignDesign, updateCampaignDesign } from '@/lib/campaignDesignService'; // Import for submit and update

// Firebase Storage imports
import { storage } from '@/lib/firebase'; // Import storage instance
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"; // Removed deleteObject

import Image from 'next/image'; // Import next/image

// --- NEW: Tone & Style Keywords ---
const toneKeywords = [
  "Cheerful", "Bright", "Optimistic", "Energetic", "Joyful", "Vibrant", "Lively", "Enthusiastic", "Uplifting",
  "Welcoming", "Inviting", "Hospitable", "Comforting", "Approachable", "Kindhearted", "Gentle", "Personable",
  "Polished", "Refined", "Sophisticated", "Authoritative", "Conservative", "Serious", "Trustworthy", "Credible",
  "Clean", "Streamlined", "Uncluttered", "Sleek", "Contemporary", "Understated", "Efficient",
  "Opulent", "Lavish", "Upscale", "Sumptuous", "Exclusive", "Premium", "Extravagant", "Elegant",
  "Quirky", "Imaginative", "Fun", "Humorous", "Lighthearted", "Fantastical", "Delightful", "Sprightly",
  "Organic", "Authentic", "Natural", "Down-to-earth", "Cozy", "Handcrafted", "Timeless", "Warm-toned",
  "Striking", "Attention-grabbing", "Daring", "Confident", "Eye-catching", "Dynamic", "Passionate", "Intense",
  "Retro", "Sentimental", "Romantic", "Classic", "Vintage-inspired", "Evocative", "Charming",
  "Cutting-edge", "Forward-thinking", "Progressive", "Experimental", "Tech-driven", "Visionary", "Sci-fi",
  "Urban", "Raw", "Unfiltered", "Bold", "Provocative", "Rebellious", "Grunge", "Dark",
  "Tranquil", "Soothing", "Peaceful", "Quiet", "Relaxing", "Meditative", "Harmonious",
  "Artsy", "Expressive", "Crafted", "Original", "Inventive", "Eclectic", "Inspirational"
];

const visualStyleKeywords = {
  "Historical / Classic": ["Baroque (dramatic, ornate)", "Rococo (ornamental, pastel)", "Victorian (elaborate, floral)", "Edwardian (elegant, refined)", "Neoclassical (Greek/Roman inspired, symmetrical)"],
  "Early-Mid 20th Century": ["Art Nouveau (flowing lines, botanical)", "Art Deco (geometric, luxurious)", "Bauhaus (minimal, functional)", "Mid-Century Modern (clean lines, organic)", "De Stijl (primary colors, abstract geometry)"],
  "Retro / Vintage": ["1950s Diner (bold, chrome, pastel)", "1960s Psychedelic (vibrant, swirling)", "1970s Funk (earth tones, funky shapes)", "1980s Memphis (playful geometry, bright)", "1980s Vaporwave/Synthwave (neon grids, retro future)", "1990s Grunge (distressed, DIY)", "Y2K (futuristic chrome, metallic gradients)"],
  "Contemporary / Postmodern": ["Minimalist (clean, whitespace)", "Brutalism (raw, unpolished)", "Postmodern (eclectic, playful)", "Anti-Design (ironic, unconventional)"],
  "Futuristic / Tech": ["Cyberpunk (high-tech dystopia, neon)", "Tech Noir (cinematic sci-fi, dark)", "Futurism (speed, technology)", "High-Tech (sleek, metallic)"],
  "Fantasy / Thematic": ["Steampunk (Victorian industrial, gears)", "Dieselpunk (early 20th-c industrial)", "Fantasy Medieval (castles, mystical)", "Cottagecore (rustic, pastoral, cozy)", "Hygge / Scandinavian (warm minimalism, comfort)", "Japandi (Japanese/Scandinavian hybrid)", "Tropical / Tiki (exotic, beach)", "Bohemian (eclectic, layered patterns)"],
  "Other Aesthetics": ["Pop Art (bold colors, comic style)", "Surrealism (dream-like, unexpected)", "Graffiti / Street Art (urban, spray-paint)", "Abstract (shapes, forms, colors)", "Zen / Wabi-Sabi (imperfection, natural)"]
};
// --- END: Keywords ---

// Define the steps
type WizardStep = 'design_choice' | 'brand' | 'campaign' | 'review';

// Define design scope options
type DesignScope = 'single' | 'multiple' | 'undecided';

// Initial empty form data for Campaign Design
const initialCampaignFormData: Partial<Omit<CampaignDesignData, 'id' | 'associatedBrandId' | 'createdAt' | 'updatedAt'>> = {
  designName: '',
  primaryGoal: '',
  callToAction: '',
  targetAudience: '',
  targetMarketDescription: '',
  tagline: '',
  offer: '',
  keySellingPoints: [],
  tone: '',
  visualStyle: '',
  additionalInfo: ''
};

// Props expected by the wizard, including the callback to close it
interface AIHumanWizardProps {
  onBack: () => void;
}

const AIHumanWizard: React.FC<AIHumanWizardProps> = ({ onBack }) => {
  const { user } = useAuth(); // Get user authentication status
  const selectedBusinessTypes = useLeadsStore(state => state.selectedBusinessTypes);
  const storeBusinessName = useMarketingStore(state => state.businessInfo.businessName); // Get name from store
  const businessTypesArray = useMemo(() => Array.from(selectedBusinessTypes), [selectedBusinessTypes]);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input
  
  // --- Core Wizard State ---
  const [currentStep, setCurrentStep] = useState<WizardStep>('brand'); 
  const [designScope, setDesignScope] = useState<DesignScope>('single'); 
  const [isLoadingInitial, setIsLoadingInitial] = useState(true); 

  // --- State for Brand Step ---
  const [userBrands, setUserBrands] = useState<BrandingData[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false); 
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [showNewBrandForm, setShowNewBrandForm] = useState(false);
  const initialBrandFormData: Partial<Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>> = {
      businessName: '', // Will be populated by useEffect
      address: '', 
      email: '',
      website: '',
      logoUrl: '', 
      socialMediaHandles: { // Initialize specific keys
          instagram: '',
          facebook: '',
          twitter: '',
          linkedin: ''
      }, 
      brandIdentity: '',
      styleComponents: { 
          primaryColor: '#00c2a8',
          secondaryColor: '#00858a',
      }
  };
  const [newBrandData, setNewBrandData] = useState(initialBrandFormData);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  // --- NEW State for Logo Upload in Brand Step ---
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  // --- End Logo Upload State ---

  // --- State for Campaign Design Step ---
  const [activeCampaignType, setActiveCampaignType] = useState<string | null>(null); // Track active tab/type in multi-mode
  // Store form data for each campaign type if scope is multiple
  const [campaignFormDataMap, setCampaignFormDataMap] = useState<Map<string, Partial<CampaignDesignData>>>(new Map());
  // Store Firestore document IDs for each campaign type (null if not yet saved)
  const [campaignDesignIdsMap, setCampaignDesignIdsMap] = useState<Map<string, string | null>>(new Map());
  // Track which forms are considered complete/processed for navigation
  const [completedCampaignForms, setCompletedCampaignForms] = useState<Set<string>>(new Set());
  // Track if the API call for a specific campaign is running
  const [isProcessingApiCallMap, setIsProcessingApiCallMap] = useState<Map<string, boolean>>(new Map());
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for the Key Selling Points input string (moved from renderStepContent)
  const [keySellingPointsInput, setKeySellingPointsInput] = useState('');
  // --- NEW: State for Info Modal ---
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);
  // --- END: State for Info Modal ---
  const [copySuccessMessage, setCopySuccessMessage] = useState<string | null>(null); // For copy feedback

  // Determine initial step and scope based on selected leads
  useEffect(() => {
    console.log("AIHumanWizard Mounted. Selected Business Types:", selectedBusinessTypes);
    if (selectedBusinessTypes.size > 1) {
      console.log("Multiple business types detected, starting at design_choice.");
      setCurrentStep('design_choice');
      setDesignScope('undecided');
      setActiveCampaignType(businessTypesArray[0] || null); // Set initial active tab
    } else {
      console.log("Single or zero business types detected, starting at brand.");
      setCurrentStep('brand');
      setDesignScope('single');
      setActiveCampaignType(businessTypesArray[0] || '__single__'); // Use special key for single scope
    }
    setIsLoadingInitial(false); // Initial setup complete
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Initialize the campaignFormDataMap when scope/types are known
  useEffect(() => {
      if (!isLoadingInitial) {
          const initialMap = new Map<string, Partial<CampaignDesignData>>();
          const typeKey = activeCampaignType || (designScope === 'single' ? '__single__' : null);
          
          if (designScope === 'single' && typeKey) {
              // *** Auto-populate designName for single scope ***
              const defaultName = typeKey === '__single__' 
                  ? (businessTypesArray.length > 0 ? `${businessTypesArray[0]} - Postcard` : 'General Business - Postcard') 
                  : `${typeKey} - Postcard`;
              initialMap.set(typeKey, { ...initialCampaignFormData, designName: defaultName });
          } else if (designScope === 'multiple') {
              businessTypesArray.forEach(type => {
                  // *** Auto-populate designName for multiple scope ***
                  initialMap.set(type, { ...initialCampaignFormData, designName: `${type} - Postcard` });
              });
          }
          setCampaignFormDataMap(initialMap);
          console.log("Initialized/Updated campaignFormDataMap:", initialMap);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingInitial, designScope, businessTypesArray]); // Added businessTypesArray dependency

  // Fetch existing brands when the component mounts and user is available
  useEffect(() => {
    if (!isLoadingInitial && user && (currentStep === 'brand')) { 
      console.log("Fetching brands for step:", currentStep);
      setIsLoadingBrands(true);
      setBrandError(null);
      getBrandDataForUser(user.uid)
        .then((brands) => {
          setUserBrands(brands);
          if (brands.length === 0) {
            setShowNewBrandForm(true); 
          } else {
            setShowNewBrandForm(false); 
          }
        })
        .catch((err) => {
          console.error("Error fetching brands:", err);
          setBrandError("Could not load your existing brand profiles. Please try again.");
        })
        .finally(() => {
          setIsLoadingBrands(false);
        });
    }
  }, [user, currentStep, isLoadingInitial]); // Re-run if user changes or we enter the brand step

  // Auto-show new brand form if no brands exist
  useEffect(() => {
      if (currentStep === 'brand' && !isLoadingBrands && userBrands.length === 0) {
          setShowNewBrandForm(true);
      } else if (currentStep === 'brand' && userBrands.length > 0) {
          setShowNewBrandForm(false);
      }
  }, [currentStep, isLoadingBrands, userBrands]);

  // Populate business name from store
  useEffect(() => {
      if (storeBusinessName && !newBrandData.businessName) {
          setNewBrandData(prev => ({ ...prev, businessName: storeBusinessName }));
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeBusinessName]); // Run when store name is available

  // --- Cleanup effect for logo preview URL --- 
  useEffect(() => {
    // Revoke the object URL when component unmounts or preview URL changes
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  // Effect to sync local keySellingPointsInput state when tab changes or data loads (moved from renderStepContent)
  useEffect(() => {
    // Derive currentCampaignTypeKey based on component state for this effect
    const currentCampaignTypeKey = activeCampaignType || (designScope === 'single' ? '__single__' : null);
    if (currentCampaignTypeKey) {
      const pointsArray = campaignFormDataMap.get(currentCampaignTypeKey)?.keySellingPoints || [];
      setKeySellingPointsInput(pointsArray.join(', '));
    }
    // If there's no active type (e.g., switching from multi to single with no selection yet),
    // clear the input to avoid showing stale data.
    else if (!activeCampaignType && designScope !== 'multiple') { 
        setKeySellingPointsInput('');
    }
  }, [activeCampaignType, campaignFormDataMap, designScope]); // Added designScope dependency

  // --- NEW: Handlers for Info Modal ---
  const openInfoModal = (type: 'tone' | 'visualStyle') => {
    if (type === 'tone') {
      setInfoModalContent({
        title: "Tone Keyword Suggestions",
        content: (
          <div className="prose prose-invert max-w-none prose-sm text-gray-300">
            <p className="mb-4">Enter keywords describing the feeling or mood of your design. Combine if needed (e.g., {`"Warm and Professional"`}, {`"Playful yet Elegant"`}).</p>
            <p className="text-xs text-gray-400 mb-2">Examples:</p>
            <ul className="list-disc list-inside columns-2 sm:columns-3 gap-x-4">
              {toneKeywords.map(keyword => <li key={keyword}>{keyword}</li>)}
            </ul>
          </div>
        )
      });
    } else {
      setInfoModalContent({
        title: "Visual Style & Aesthetic Suggestions",
        content: (
           <div className="prose prose-invert max-w-none prose-sm text-gray-300">
             <p className="mb-4">Enter keywords describing the look and feel. You can reference eras, movements, or general aesthetics. Combine with Tone keywords for more specific results (e.g., {`"Minimalist and Clean"`}, {`"Vintage Romantic"`}).</p>
             {Object.entries(visualStyleKeywords).map(([category, keywords]) => (
              <div key={category} className="mb-3">
                <h4 className="text-sm font-semibold text-electric-teal/80 mb-1">{category}</h4>
                <ul className="list-disc list-inside">
                  {keywords.map(keyword => <li key={keyword}>{keyword}</li>)}
                </ul>
              </div>
             ))}
           </div>
        )
      });
    }
    setIsInfoModalOpen(true);
  };

  const closeInfoModal = () => {
    setIsInfoModalOpen(false);
    setInfoModalContent(null);
  };
  // --- END: Handlers for Info Modal ---

  // --- Handler for Design Scope Choice (Step 0) ---
  const handleDesignScopeChoice = (scope: 'single' | 'multiple') => {
    setDesignScope(scope);
    // Set active type based on choice
    if (scope === 'single') {
      setActiveCampaignType(businessTypesArray[0] || '__single__');
    } else {
      setActiveCampaignType(businessTypesArray[0] || null);
    }
    setCurrentStep('brand'); // Move to the brand step
  };

  // --- Handlers for Brand Step ---
  const handleSelectBrand = (brandId: string) => {
    setSelectedBrandId(brandId);
    setShowNewBrandForm(false); 
    setBrandError(null);
  };

  const handleShowNewBrandForm = () => {
    setSelectedBrandId(null); 
    setShowNewBrandForm(true);
    setNewBrandData(initialBrandFormData); 
    setBrandError(null);
  };

  // Update handleNewBrandInputChange for nested social handles
  const handleNewBrandInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      if (name === 'logoUrl') return;
      
      if (name === 'primaryColor' || name === 'secondaryColor') {
          setNewBrandData(prev => ({
              ...prev,
              styleComponents: { ...prev.styleComponents, [name]: value }
          }));
      } else if (['instagram', 'facebook', 'twitter', 'linkedin'].includes(name)) {
           setNewBrandData(prev => ({
              ...prev,
              socialMediaHandles: { ...prev.socialMediaHandles, [name]: value }
          }));
      } else {
          setNewBrandData(prev => ({ ...prev, [name]: value }));
      }
  };

  // --- NEW Logo Handling Functions --- 
  const handleLogoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    // Reset state on new selection
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoUploadError(null);
    setLogoUploadProgress(null);
    setIsUploadingLogo(false);
    setNewBrandData(prev => ({...prev, logoUrl: ''})); 

    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Validation
      if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) { // 5MB limit
        setLogoUploadError(!file.type.startsWith('image/') ? 'Please select an image file.' : 'File size must be under 5MB.');
        // Clear the invalid file from the input
        if (fileInputRef.current) fileInputRef.current.value = ""; 
        return;
      }
      
      // Set state immediately for preview and file object
      const previewUrl = URL.createObjectURL(file);
      setLogoFile(file);
      setLogoPreviewUrl(previewUrl);

      // *** Trigger upload immediately after setting file state ***
      // Use a slight delay to ensure state updates before upload starts?
      // Or directly call, assuming state updates are fast enough for handleUploadLogo
      // Let's try direct call first.
      handleUploadLogo(file); // Pass the file directly to avoid state race condition
    }
  };

  // Modify handleUploadLogo to optionally accept the file directly
  const handleUploadLogo = async (fileToUpload?: File) => {
    const currentFile = fileToUpload || logoFile; // Use passed file or state file
    
    if (!currentFile) {
      setLogoUploadError('No file available to upload.');
      return;
    }

    if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl); 
        setLogoPreviewUrl(null);
    }
    setIsUploadingLogo(true);
    setLogoUploadProgress(0);
    setLogoUploadError(null);

    const storageRef = ref(storage, `logos/${user?.uid || 'unknown'}/${Date.now()}_${currentFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, currentFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setLogoUploadProgress(progress);
      },
      (error) => {
        console.error("Logo upload failed:", error);
        setLogoUploadError(`Upload failed: ${error.code}`);
        setIsUploadingLogo(false);
        setLogoUploadProgress(null);
        setLogoFile(null); // Clear the file state on error
        if (fileInputRef.current) fileInputRef.current.value = ""; // Clear input value
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          console.log('File available at', downloadURL);
          setNewBrandData(prev => ({ ...prev, logoUrl: downloadURL }));
          setLogoUploadProgress(100); 
          setIsUploadingLogo(false);
          // Do NOT clear logoFile state here immediately after success,
          // keep it until a new file is selected or save happens?
          // Let's clear it for consistency for now.
          setLogoFile(null); 
          if (fileInputRef.current) fileInputRef.current.value = ""; // Clear input value after success
        }).catch((error) => {
           // ... (error handling for getDownloadURL)
          console.error("Failed to get download URL:", error);
          setLogoUploadError('Upload succeeded but failed to get URL.');
          setIsUploadingLogo(false);
          setLogoUploadProgress(null);
          setLogoFile(null);
          if (fileInputRef.current) fileInputRef.current.value = ""; 
        });
      }
    );
  };
  // --- End Logo Handling Functions ---

  // Update handleSaveNewBrand for structured social handles
  const handleSaveNewBrand = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { setBrandError("You must be logged in..."); return; }
    if (!newBrandData.businessName) { setBrandError("Business Name required."); return; }
    
    setIsSavingBrand(true);
    setBrandError(null);
    setLogoUploadError(null); 
    try {
      const dataToSave: Partial<Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>> = {
        businessName: newBrandData.businessName, 
      };
      if (newBrandData.address) dataToSave.address = newBrandData.address;
      if (newBrandData.email) dataToSave.email = newBrandData.email;
      if (newBrandData.website) dataToSave.website = newBrandData.website;
      if (newBrandData.logoUrl) dataToSave.logoUrl = newBrandData.logoUrl; 
      if (newBrandData.brandIdentity) dataToSave.brandIdentity = newBrandData.brandIdentity;
      
      // Handle styleComponents
      const styleComponentsToSave: { [key: string]: string | undefined } = {};
      if (newBrandData.styleComponents?.primaryColor) styleComponentsToSave.primaryColor = newBrandData.styleComponents.primaryColor;
      if (newBrandData.styleComponents?.secondaryColor) styleComponentsToSave.secondaryColor = newBrandData.styleComponents.secondaryColor;
      if (Object.keys(styleComponentsToSave).length > 0) dataToSave.styleComponents = styleComponentsToSave;

      // Handle socialMediaHandles - Save only non-empty values
      const socialHandlesToSave: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(newBrandData.socialMediaHandles || {})) {
          if (value && typeof value === 'string' && value.trim() !== '') {
              socialHandlesToSave[key] = value.trim();
          }
      }
      if (Object.keys(socialHandlesToSave).length > 0) { 
          dataToSave.socialMediaHandles = socialHandlesToSave;
      }
     
      console.log("Saving Brand Data:", dataToSave);
      const savedBrand = await addBrandData(user.uid, dataToSave as Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>);
      setUserBrands(prev => [...prev, savedBrand]); 
      setSelectedBrandId(savedBrand.id!); 
      setShowNewBrandForm(false); 
      // Reset form, keep business name if pre-populated?
      setNewBrandData(prev => ({...initialBrandFormData, businessName: prev.businessName})); 
      setLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoUploadProgress(null);
      setLogoUploadError(null);
      setIsUploadingLogo(false);
    } catch (error) { 
      console.error("Error saving brand:", error);
      setBrandError("Failed to save brand profile. Please try again.");
    } finally {
      setIsSavingBrand(false);
    }
  };
  // --- End Handlers for Brand Step ---

  // --- NEW: Handler for Copying Campaign Details ---
  const handleCopyCampaignDetails = () => {
      if (!activeCampaignType || designScope !== 'multiple' || businessTypesArray.length <= 1) {
          console.warn("Copy requested in invalid state.");
          return;
      }

      const sourceData = campaignFormDataMap.get(activeCampaignType);
      if (!sourceData) {
          setCampaignError(`Cannot copy: No data found for the current type "${activeCampaignType}".`);
          return;
      }

      setCampaignError(null); // Clear previous errors
      setCopySuccessMessage(null); // Clear previous success message

      // Use functional update for setCampaignFormDataMap
      setCampaignFormDataMap(prevMap => {
          const newMap = new Map(prevMap);
          let copiedCount = 0;

          businessTypesArray.forEach(targetType => {
              if (targetType !== activeCampaignType) {
                  const existingTargetData = newMap.get(targetType) || { ...initialCampaignFormData };
                  // Preserve the target's original design name
                  const preservedDesignName = existingTargetData.designName || `${targetType} - Postcard`;
                  
                  // Create new data object by copying source, then restoring design name
                  const newDataForTarget = {
                      ...sourceData, // Copy all fields from source
                      designName: preservedDesignName // Restore target's design name
                  };
                  
                  newMap.set(targetType, newDataForTarget);
                  copiedCount++;
              }
          });
          console.log(`Copied details from ${activeCampaignType} to ${copiedCount} other types.`);
          return newMap;
      });

      // Mark all *other* forms as incomplete after copying
      setCompletedCampaignForms(prevSet => {
         const newSet = new Set(prevSet);
         businessTypesArray.forEach(targetType => {
             if (targetType !== activeCampaignType) {
                 newSet.delete(targetType);
             }
         });
         // Optionally keep the source type complete if it already was
         // if (!prevSet.has(activeCampaignType)) newSet.delete(activeCampaignType); 
         return newSet;
      });

      // Provide feedback
      setCopySuccessMessage(`Details copied to ${businessTypesArray.length - 1} other designs. Please review and validate each.`);
      // Clear message after a few seconds
       setTimeout(() => setCopySuccessMessage(null), 4000);

       // Also update the local keySellingPointsInput if the active tab's data was just copied *from*
       // This ensures consistency if the user stays on the same tab
       const updatedSourceData = campaignFormDataMap.get(activeCampaignType);
        if (updatedSourceData?.keySellingPoints) {
             setKeySellingPointsInput(updatedSourceData.keySellingPoints.join(', '));
        }

  };
  // --- END: Handler for Copying Campaign Details ---

  // --- Handlers for Campaign Step ---
  const handleCampaignInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    businessType: string
  ) => {
    const { name, value } = event.target;
    setCampaignFormDataMap(prevForms => {
      const updatedForms = new Map(prevForms);
      const currentFormData = updatedForms.get(businessType) || { ...initialCampaignFormData };

      let processedValue: string | string[] = value;
      if (name === 'keySellingPoints') {
        processedValue = value.split(',').map(s => s.trim()).filter(s => s !== '');
      }

      updatedForms.set(businessType, {
        ...currentFormData,
        [name]: processedValue,
      });

      // If user edits, remove from completed set
      setCompletedCampaignForms(prev => {
          const newSet = new Set(prev);
          newSet.delete(businessType);
          return newSet;
      });
      return updatedForms;
    });
  };

  /**
   * Validates the form data for a given campaign type, saves/updates it to Firestore,
   * and triggers the background AI processing API call.
   */
  const handleValidateAndProcessCampaign = async (type: string) => {
      if (!user || !selectedBrandId) {
          setCampaignError("User or Brand ID missing. Cannot process campaign.");
          return false; // Indicate failure
      }

      const formData = campaignFormDataMap.get(type);
      // Basic check: Design Name is required
      if (!formData?.designName || formData.designName.trim() === '') { 
          setCampaignError(`Design Name is required for the ${type} design.`);
          // Ensure this type is NOT in the completed set if validation fails
          setCompletedCampaignForms(prev => {
              const newSet = new Set(prev);
              newSet.delete(type);
              return newSet;
          });
          return false; // Indicate failure
      }

      // Set processing state
      setIsProcessingApiCallMap(prev => new Map(prev).set(type, true));

      try {
          let campaignId = campaignDesignIdsMap.get(type) || null;

          // Prepare data for saving/updating
          const dataToSave: Partial<Omit<CampaignDesignData, 'id' | 'createdAt' | 'updatedAt'>> = {
              associatedBrandId: selectedBrandId,
              designName: formData.designName,
              primaryGoal: formData.primaryGoal || '',
              callToAction: formData.callToAction || '',
              targetAudience: formData.targetAudience || '',
              targetMarketDescription: formData.targetMarketDescription || undefined,
              tagline: formData.tagline || undefined,
              offer: formData.offer || undefined,
              keySellingPoints: formData.keySellingPoints || [],
              tone: formData.tone || '',
              visualStyle: formData.visualStyle || '',
              additionalInfo: formData.additionalInfo || undefined,
              status: 'processing' // Set status to processing for the API call
          };

          if (campaignId) {
              // Update existing document
              console.log(`Updating campaign design ${campaignId} for type ${type}...`);
              await updateCampaignDesign(user.uid, campaignId, dataToSave);
          } else {
              // Add new document
              console.log(`Adding new campaign design for type ${type}...`);
              const savedDesign = await addCampaignDesign(user.uid, dataToSave as Omit<CampaignDesignData, 'id' | 'createdAt' | 'updatedAt'>);
              campaignId = savedDesign.id ?? null; // Get the new ID, ensure it's string | null
              if (!campaignId) throw new Error("Failed to get ID for newly saved campaign.");
              // Store the new ID
              setCampaignDesignIdsMap(prev => new Map(prev).set(type, campaignId!));
              console.log(`Saved new campaign with ID: ${campaignId}`);
          }

          // Now trigger the API endpoint in the background
          console.log(`Triggering API for campaign ID: ${campaignId}`);
          const response = await fetch('/api/generate-design-prompt-campaign', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.uid, campaignDesignId: campaignId })
          });

          if (!response.ok) {
              // API call failed - try to read error message
              let apiErrorMsg = 'API call failed after saving data.';
              try {
                  const errorData = await response.json();
                  apiErrorMsg = errorData.error || errorData.message || apiErrorMsg;
              } catch { /* Ignore if response body isn't JSON */ }
              console.error(`API call failed for ${campaignId}: ${response.status} - ${apiErrorMsg}`);
              // Update status back in Firestore? Or maybe API already set it to 'failed'
              // For now, just show error to user
              throw new Error(apiErrorMsg);
          }

          // API call successful
          console.log(`API call successful for ${campaignId}`);
          // Add to the completed set ONLY after successful save and API trigger
          setCompletedCampaignForms(prevSet => new Set(prevSet).add(type));
          console.log(`Campaign ${type} processing initiated.`);
          return true; // Indicate overall success

      } catch (error) {
          console.error(`Error processing campaign ${type}:`, error);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
          setCampaignError(`Failed to process campaign ${type}: ${errorMsg}`);
          // Ensure form is marked as incomplete on error
          setCompletedCampaignForms(prev => {
              const newSet = new Set(prev);
              newSet.delete(type);
              return newSet;
          });
          return false; // Indicate failure
      } finally {
          // Always turn off processing indicator for this type
          setIsProcessingApiCallMap(prev => new Map(prev).set(type, false));
      }
  };

  const handleTabClick = (type: string) => {
    setActiveCampaignType(type);
    setCampaignError(null); // Clear errors when switching tabs
    // *** Ensure designName exists when switching tabs in multi-mode ***
    if (designScope === 'multiple') {
        setCampaignFormDataMap(prevMap => {
            const currentData = prevMap.get(type);
            if (currentData && !currentData.designName) {
                const newMap = new Map(prevMap);
                newMap.set(type, { ...currentData, designName: `${type} - Postcard` });
                return newMap;
            }
            return prevMap; // No change needed
        });
    }
  };
  // --- End Handlers for Campaign Step ---


  const handleNext = () => {
    // Clear errors on navigation
    setBrandError(null);
    setCampaignError(null);

    if (currentStep === 'brand') {
      if (!selectedBrandId) {
        setBrandError("Please select or create a brand profile to continue.");
        return;
      }
      setCurrentStep('campaign');
    }
    else if (currentStep === 'campaign') {
       let allFormsValid = true;
       if (designScope === 'single' && activeCampaignType) {
           // Just check completion status, don't trigger processing again
           allFormsValid = completedCampaignForms.has(activeCampaignType);
           if (!allFormsValid) setCampaignError("Please validate the current campaign details first.");
       } else if (designScope === 'multiple') {
           // Check if all forms are marked as complete
           if (completedCampaignForms.size !== businessTypesArray.length) {
                setCampaignError("Please ensure all campaign details are saved correctly.");
                allFormsValid = false;
            }
       }
       
       if (allFormsValid) {
           setCurrentStep('review');
       }
    }
  };

  const handlePrevious = () => {
    // Clear errors on navigation
    setBrandError(null);
    setCampaignError(null);

    if (currentStep === 'brand') {
      if (designScope === 'multiple' || designScope === 'undecided') { 
        setCurrentStep('design_choice');
      } else { onBack(); } // Single scope goes back to options
    } else if (currentStep === 'campaign') {
      setCurrentStep('brand');
    } else if (currentStep === 'review') {
      setCurrentStep('campaign');
    } else if (currentStep === 'design_choice') {
        onBack(); // Go back to main options
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedBrandId) {
        // Handle error - user must be logged in and brand selected
        console.error("Cannot submit: User or Brand ID missing.");
        return;
    }
    // Final validation check
     let allFormsValid = true;
       if (designScope === 'single' && activeCampaignType) {
           // Check if the single campaign is complete
           allFormsValid = completedCampaignForms.has(activeCampaignType);
       } else if (designScope === 'multiple') {
           if (completedCampaignForms.size !== businessTypesArray.length) {
                setCampaignError("Please ensure all campaign details are saved/validated before submitting.");
                allFormsValid = false;
           }
       }
      if (!allFormsValid) {
          console.error("Submit validation failed.");
          return; // Stop submission if validation fails
      }

    setIsSubmitting(true); 
    setCampaignError(null);
    
    console.log('Submitting AI + Human Wizard data...');
    console.log('Selected Brand ID:', selectedBrandId);
    console.log('Design Scope:', designScope);
    console.log('Campaign Data Map:', campaignFormDataMap);
    console.log('Campaign Design IDs Map:', campaignDesignIdsMap);

    try {
        // The individual CampaignDesignData documents should already be created/updated
        // by handleValidateAndProcessCampaign. We might just need to create the
        // overarching `design_requests` document if that's still part of the flow,
        // or maybe this step just becomes navigating away.

        // For now, let's assume we just need to finish.
 
        // TODO: Step 2 - Prepare and save the main 'design_requests' document
        // This requires mapping savedDesignData + branding data to the admin page format.
        // Example structure (needs refinement based on admin page types):
        /*
        const designRequestData = {
            userId: user.uid,
            status: 'pending_prompt', // Initial status
            designScope: designScope,
            globalBrandData: { ... }, // Fetch selected brand data
            campaigns: savedDesignData.map(design => ({ 
                 businessType: campaignFormDataMap.keys().find(key => campaignFormDataMap.get(key) === design), // Find original key? Risky
                 userInputData: { ...design }, // Map fields
                 finalDesigns: [],
                 // ... other fields expected by admin page ... 
             })),
            logoUrl: userBrands.find(b => b.id === selectedBrandId)?.logoUrl || '',
            createdAt: timestamp,
            notifiedAdmin: false,
        };
        const docRef = await addDoc(collection(db, "design_requests"), designRequestData);
        console.log("Created design_requests document with ID:", docRef.id);
        */
       
        // TODO: Step 3 - Trigger AI processing API (placeholder)
        console.log("All campaigns processed or submitted.");

        console.log("Submission successful (Data saved to user subcollection)");
        // For now, just show success and go back
         alert("Design request generation initiated for all campaigns! You can monitor progress or navigate away.");
         onBack(); 

    } catch (error) {
        console.error("Submission failed:", error);
        setCampaignError(`Failed to submit design request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Render Logic ---
  const renderStepContent = () => {
    if (isLoadingInitial) {
        return <p className="text-gray-400 text-center p-8">Loading wizard setup...</p>;
    }
    
    switch (currentStep) {
      case 'design_choice':
        const typesArray = Array.from(selectedBusinessTypes);
        return (
          <motion.div
            key="design_choice"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="p-4 sm:p-8 bg-gray-800/50 rounded-lg shadow-lg max-w-3xl mx-auto border border-electric-teal/30"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-electric-teal mb-4">Design Scope</h2>
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
          </motion.div>
        );

      case 'brand':
        // --- Brand Data UI (Now Step 1 or 2) ---
        return (
          <motion.div
             key="brand"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.3 }}
           >
            {isLoadingBrands && <p className="text-gray-400">Loading brand profiles...</p>}
            {brandError && <p className="text-red-400 mb-4">{brandError}</p>}

            {!isLoadingBrands && !brandError && (
              <>
                {userBrands.length > 0 && !showNewBrandForm && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3 text-electric-teal/90">Select an Existing Brand Profile:</h3>
                    <div className="space-y-2">
                      {userBrands.map((brand) => (
                        <div
                          key={brand.id}
                          onClick={() => handleSelectBrand(brand.id!)}
                          className={`p-4 rounded border-2 cursor-pointer transition-colors ${selectedBrandId === brand.id ? 'border-electric-teal bg-gray-700' : 'border-gray-600 hover:border-electric-teal/70 hover:bg-gray-700/50'}`}
                        >
                          <p className="font-medium text-white">{brand.businessName}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleShowNewBrandForm}
                      className="mt-4 text-sm text-electric-teal hover:text-electric-teal/80"
                    >
                      + Add New Brand Profile
                    </button>
                  </div>
                )}

                {showNewBrandForm && (
                  <form onSubmit={handleSaveNewBrand} className="space-y-4 bg-gray-700 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3 text-electric-teal/90">
                      {userBrands.length === 0 
                        ? "Let's start with the foundation! Getting your brand details right ensures your postcard truly represents your business." 
                        : "Add New Brand Profile"}
                    </h3>
                    <div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-gray-300 mb-1">Business Name *</label>
                      <input 
                        type="text" id="businessName" name="businessName"
                        value={newBrandData.businessName || ''} onChange={handleNewBrandInputChange} required
                        className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                      />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                        <textarea 
                            id="address" name="address" rows={2}
                            value={typeof newBrandData.address === 'string' ? newBrandData.address : ''} 
                            onChange={handleNewBrandInputChange}
                            className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Contact Email</label>
                        <input 
                          type="email" id="email" name="email"
                          value={newBrandData.email || ''} onChange={handleNewBrandInputChange}
                          className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                        />
                      </div>
                      <div>
                        <label htmlFor="website" className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                        <input 
                          type="text" id="website" name="website"
                          value={newBrandData.website || ''} onChange={handleNewBrandInputChange}
                          placeholder="example.com"
                          className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-300 mb-1">Primary Brand Color</label>
                           <input 
                                type="color" id="primaryColor" name="primaryColor"
                                value={newBrandData.styleComponents?.primaryColor || '#00c2a8'}
                                onChange={handleNewBrandInputChange}
                                className="w-full h-10 p-1 rounded bg-gray-800 border border-gray-600 cursor-pointer focus:border-electric-teal focus:ring-electric-teal"
                            />
                        </div>
                         <div>
                            <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-300 mb-1">Secondary Brand Color</label>
                            <input 
                                type="color" id="secondaryColor" name="secondaryColor"
                                value={newBrandData.styleComponents?.secondaryColor || '#00858a'}
                                onChange={handleNewBrandInputChange}
                                className="w-full h-10 p-1 rounded bg-gray-800 border border-gray-600 cursor-pointer focus:border-electric-teal focus:ring-electric-teal"
                            />
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Logo (Optional)</label>
                        <div className="mt-1 flex items-center gap-4 flex-wrap">
                            {/* File Input Trigger Button */} 
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className="px-3 py-2 rounded border border-gray-500 text-gray-300 hover:border-electric-teal hover:text-electric-teal text-sm transition-colors disabled:opacity-50 shrink-0"
                            >
                                {newBrandData.logoUrl || logoPreviewUrl || logoFile ? 'Change Logo' : 'Select Logo'}
                            </button>
                            <input 
                                type="file"
                                accept="image/*" 
                                ref={fileInputRef}
                                onChange={handleLogoSelect} 
                                className="hidden" 
                                disabled={isUploadingLogo}
                            />
                            {/* Preview Area */} 
                            {logoPreviewUrl && (
                                // Use next/image for preview - NOTE: May need loader config for blob URLs if issues arise
                                <Image src={logoPreviewUrl} alt="Logo Preview" width={100} height={40} className="h-10 w-auto rounded border border-gray-600 shrink-0" />
                            )}
                            {/* Display Final Uploaded Logo if no preview */} 
                            {!logoPreviewUrl && newBrandData.logoUrl && (
                                 // Use next/image for uploaded URL
                                 <Image src={newBrandData.logoUrl} alt="Uploaded Logo" width={100} height={40} className="h-10 w-auto rounded border border-green-500 shrink-0" />
                            )}
                            {/* Progress Indicator */} 
                            {isUploadingLogo && logoUploadProgress !== null && (
                                <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0">
                                    <span>Uploading...</span>
                                     <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                                         <div className="bg-blue-500 h-full rounded-full" style={{width: `${logoUploadProgress}%`}}></div>
                                     </div>
                                     <span>{(logoUploadProgress).toFixed(0)}%</span>
                                 </div>
                            )}
                            {/* Success Indicator */} 
                            {logoUploadProgress === 100 && !isUploadingLogo && newBrandData.logoUrl && (
                                 <span className="text-sm text-green-400 shrink-0">✓ Upload Successful</span>
                            )}
                        </div>
                         {/* Error Message */} 
                         {logoUploadError && <p className="text-xs text-red-400 mt-1">{logoUploadError}</p>}
                         <p className="text-xs text-gray-400 mt-1">Max 5MB. PNG, JPG, SVG recommended.</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Social Media Handles (Optional)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div>
                              <label htmlFor="instagram" className="block text-xs font-medium text-gray-400 mb-1">Instagram</label>
                              <input type="text" id="instagram" name="instagram" placeholder="your_handle" value={newBrandData.socialMediaHandles?.instagram || ''} onChange={handleNewBrandInputChange} className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm"/>
                           </div>
                           <div>
                              <label htmlFor="facebook" className="block text-xs font-medium text-gray-400 mb-1">Facebook</label>
                              <input type="text" id="facebook" name="facebook" placeholder="YourPageName" value={newBrandData.socialMediaHandles?.facebook || ''} onChange={handleNewBrandInputChange} className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm"/>
                           </div>
                           <div>
                              <label htmlFor="twitter" className="block text-xs font-medium text-gray-400 mb-1">Twitter (X)</label>
                              <input type="text" id="twitter" name="twitter" placeholder="YourHandle" value={newBrandData.socialMediaHandles?.twitter || ''} onChange={handleNewBrandInputChange} className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm"/>
                           </div>
                           <div>
                              <label htmlFor="linkedin" className="block text-xs font-medium text-gray-400 mb-1">LinkedIn</label>
                              <input type="text" id="linkedin" name="linkedin" placeholder="company/your-company" value={newBrandData.socialMediaHandles?.linkedin || ''} onChange={handleNewBrandInputChange} className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-sm"/>
                           </div>
                        </div>
                     </div>
                     <div>
                        <label htmlFor="brandIdentity" className="block text-sm font-medium text-gray-300 mb-1">Brand Identity/Overall Notes</label>
                        <textarea 
                          id="brandIdentity" name="brandIdentity" rows={3}
                          value={newBrandData.brandIdentity || ''} onChange={handleNewBrandInputChange}
                          placeholder="e.g., We are a modern, tech-focused accounting firm targeting startups. Friendly, approachable, and expert tone. Clean and minimalist visual style."
                          className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                        />
                     </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button 
                        type="submit" disabled={isSavingBrand}
                        className="px-4 py-2 rounded bg-electric-teal text-charcoal hover:bg-electric-teal/90 disabled:bg-gray-500 disabled:cursor-not-allowed"
                      >
                        {isSavingBrand ? 'Saving...' : 'Save Brand Profile'}
                      </button>
                      {userBrands.length > 0 && (
                        <button 
                          type="button" onClick={() => setShowNewBrandForm(false)} 
                          className="text-sm text-gray-400 hover:text-gray-200"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}
          </motion.div>
        );
        // --- End Brand Data UI ---

      case 'campaign':
        const currentCampaignTypeKey = activeCampaignType || (designScope === 'single' ? '__single__' : null);
        const currentCampaignData = currentCampaignTypeKey ? campaignFormDataMap.get(currentCampaignTypeKey) || {} : {};
        const selectedBrandName = userBrands.find(b => b.id === selectedBrandId)?.businessName || 'Your Business'; 

        // Local state and handler for Key Selling Points input are defined *outside* the switch now
        // But useEffect to sync it is still needed if it depends on activeCampaignTypeKey
        
        // *** Handler specifically for the Key Selling Points input ***
        const handleKeySellingPointsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const rawValue = event.target.value;
            setKeySellingPointsInput(rawValue); // Update local input state immediately

            // Update the underlying array state in the main map
            const pointsArray = rawValue.split(',').map(s => s.trim()).filter(s => s !== '');
            
            if (currentCampaignTypeKey) {
                 setCampaignFormDataMap(prevForms => {
                    const updatedForms = new Map(prevForms);
                    const currentFormData = updatedForms.get(currentCampaignTypeKey) || { ...initialCampaignFormData };
                    updatedForms.set(currentCampaignTypeKey, {
                        ...currentFormData,
                        keySellingPoints: pointsArray,
                    });
                    // Mark form as incomplete since it was edited
                     setCompletedCampaignForms(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(currentCampaignTypeKey);
                        return newSet;
                    });
                    return updatedForms;
                 });
            }
        };

        return (
          <motion.div
             key="campaign"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.3 }}
             className="space-y-6"
          >
             {/* Conditional Tabs for Multiple Scope */} 
             {designScope === 'multiple' && (
                <div className="flex space-x-1 border-b border-gray-700 mb-4 overflow-x-auto pb-2">
                    {businessTypesArray.map(type => {
                        const isProcessing = isProcessingApiCallMap.get(type);
                        const isComplete = completedCampaignForms.has(type);
                        // Show spinner if actively processing OR if processing is complete (ready state implied)
                        const showSpinner = isProcessing || isComplete;
                        const isActive = activeCampaignType === type;
                        return (
                            <button
                                key={type}
                                onClick={() => handleTabClick(type)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-t-md text-sm font-medium transition-colors whitespace-nowrap ${ 
                                    isActive 
                                    ? 'bg-gray-700 text-electric-teal border-b-2 border-electric-teal' 
                                    : 'text-gray-400 hover:text-electric-teal hover:bg-gray-700/50'
                                }`}
                            >
                                {/* Status Indicator - Show check only if complete and NOT active processing */}
                                {!showSpinner && (
                                    <span className={`w-2 h-2 rounded-full ${ 
                                        isComplete ? 'bg-green-500' : isActive ? 'bg-yellow-500' : 'bg-gray-500' 
                                    }`} /> 
                                )}
                                {type}
                                {/* Processing Spinner for Tab */} 
                                {showSpinner && (
                                    <svg className="animate-spin h-3 w-3 text-blue-400 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
             )}

            {/* Campaign Form Area */} 
            <div>
+                {/* --- NEW: Welcome Text --- */}
+                <div className="mb-6 p-4 bg-gradient-to-r from-gray-700 to-gray-700/80 rounded-lg border border-electric-teal/20 shadow-sm">
+                    <h3 className="text-lg font-semibold text-electric-teal mb-2">
+                        Let&apos;s Craft Your <span className="text-electric-teal/80">{activeCampaignType !== '__single__' ? activeCampaignType : (businessTypesArray[0] || 'Business')}</span> Postcard!
+                    </h3>
+                    <p className="text-sm text-gray-300 mb-2">
+                        Welcome! We&apos;re about to create a tailor-made postcard for your campaign—completely aligned with your brand guidelines. To make sure our AI-driven design captures your unique style and messaging, please fill out the details below.
+                    </p>
+                    <p className="text-xs text-gray-400">
+                        Think of this as your creative brief: you&apos;ll provide the key campaign info (like goals, offers, and the vibe you want) so we can craft a polished, on-brand postcard that resonates with your target audience. The more specifics you share—like your key selling points, tone, or preferred visuals—the easier it is for us to deliver a stunning final design.
+                    </p>
+                </div>
+                {/* --- End Welcome Text --- */}
+
                 <h3 className="text-lg font-semibold mb-3 text-electric-teal/90">
                     Define Campaign Design Details 
                     {designScope === 'multiple' && activeCampaignType && ` for: ${activeCampaignType}`}
                 </h3>
                 <p className="text-sm text-gray-400 mb-4">
                     Using Brand: <span className="text-gray-200">{selectedBrandName}</span>
                 </p>

                  {/* --- NEW: Copy Button (only in multi-mode) --- */}
                  {designScope === 'multiple' && businessTypesArray.length > 1 && activeCampaignType && (
                    <div className="mb-4 text-right">
                         <button
                            type="button"
                            onClick={handleCopyCampaignDetails}
                            className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                         >
                            Copy These Details to Other Designs
                         </button>
                         {copySuccessMessage && <p className="text-xs text-green-400 mt-1">{copySuccessMessage}</p>}
                    </div>
                 )}
                 {/* --- END: Copy Button --- */}

                {campaignError && <p className="text-red-400 mb-4">{campaignError}</p>} 

                <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                    {currentCampaignTypeKey ? (
                       <> 
                        <div>
                            <label htmlFor="designName" className="block text-sm font-medium text-gray-300 mb-1">Design Name *</label>
                            <input type="text" id="designName" name="designName" 
                                value={currentCampaignData.designName || ''}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} required 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="primaryGoal" className="block text-sm font-medium text-gray-300 mb-1">Primary Goal</label>
                            <input type="text" id="primaryGoal" name="primaryGoal" 
                                value={currentCampaignData.primaryGoal || ''}
                                placeholder={`e.g., Get more ${activeCampaignType || 'customers'} to book consultations`}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="callToAction" className="block text-sm font-medium text-gray-300 mb-1">Call To Action</label>
                            <input type="text" id="callToAction" name="callToAction" 
                                value={currentCampaignData.callToAction || ''}
                                placeholder={`e.g., Visit ${selectedBrandName}.com, Call Now for a Quote, Book Your Appointment`}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-300 mb-1">Target Audience Description</label>
                            <textarea id="targetAudience" name="targetAudience" rows={3} 
                                value={currentCampaignData.targetAudience || ''}
                                placeholder={designScope === 'multiple' ? `Describe the ideal ${activeCampaignType || 'customer'} (e.g., homeowners needing tax help, local restaurants seeking bookkeeping).` : 'Describe the ideal customer across all types (e.g., small business owners in St. Albert).'}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="offer" className="block text-sm font-medium text-gray-300 mb-1">Specific Offer / Promotion</label>
                            <input type="text" id="offer" name="offer" value={currentCampaignData.offer || ''} placeholder="e.g., 10% Off First Service, Free Initial Consultation, Mention This Card for..." onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="keySellingPoints" className="block text-sm font-medium text-gray-300 mb-1">Key Selling Points (comma-separated)</label>
                            <input 
                                type="text" 
                                id="keySellingPoints" 
                                name="keySellingPoints" 
                                value={keySellingPointsInput} 
                                onChange={handleKeySellingPointsChange} 
                                placeholder="e.g., Saves Time, Reduces Errors, Expert Advice, Local & Trusted" 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                            />
                        </div>
                        <div>
                            <label htmlFor="targetMarketDescription" className="block text-sm font-medium text-gray-300 mb-1">Target Market Description (Optional)</label>
                            <textarea id="targetMarketDescription" name="targetMarketDescription" rows={2} value={currentCampaignData.targetMarketDescription || ''} placeholder={`e.g., Focus on ${activeCampaignType || 'businesses'} in the downtown core, Target new homeowners in the area`} onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="tagline" className="block text-sm font-medium text-gray-300 mb-1">Tagline (Optional)</label>
                            <input type="text" id="tagline" name="tagline" value={currentCampaignData.tagline || ''} placeholder="Your catchy business slogan" onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-1">Tone (Optional)</label>
                                <p className="text-xs text-gray-400 mb-1">(Keywords help the AI)</p>
                                <input type="text" name="tone" placeholder="e.g., Professional, Friendly, Urgent, Calm, Humorous" value={currentCampaignData.tone || ''} onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className="w-full p-2 rounded bg-gray-800 border border-gray-600"/>
                                {/* NEW: Info Icon */}
                                <button type="button" onClick={() => openInfoModal('tone')} className="absolute top-0 right-0 mt-1 mr-1 text-gray-400 hover:text-electric-teal">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                            </div>
                            <div className="relative">
                                <label htmlFor="visualStyle" className="block text-sm font-medium text-gray-300 mb-1">Visual Style/Aesthetic (Optional)</label>
                                <p className="text-xs text-gray-400 mb-1">(Keywords help the AI)</p>
                                <input type="text" name="visualStyle" placeholder="e.g., Modern, Minimalist, Bold, Vintage, Playful, Elegant" value={currentCampaignData.visualStyle || ''} onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className="w-full p-2 rounded bg-gray-800 border border-gray-600"/>
                                {/* NEW: Info Icon */}
                                <button type="button" onClick={() => openInfoModal('visualStyle')} className="absolute top-0 right-0 mt-1 mr-1 text-gray-400 hover:text-electric-teal">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                   </svg>
                                 </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-300 mb-1">Additional Information (Optional)</label>
                            <textarea id="additionalInfo" name="additionalInfo" rows={3} value={currentCampaignData.additionalInfo || ''} placeholder="Anything else? e.g., Must include our phone number prominently. Use image of happy clients. Avoid red color." onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>

                        {/* Validation Button Area - Updated */} 
                         {(designScope === 'multiple' || designScope === 'single') && currentCampaignTypeKey && (
                            <div className="pt-4 border-t border-gray-600/50 mt-4 flex items-center gap-3">
                                <button 
                                    title={isProcessingApiCallMap.get(currentCampaignTypeKey) ? "Processing AI prompt request..." : (completedCampaignForms.has(currentCampaignTypeKey) ? "AI prompt request sent" : "Save details and request AI prompt")}
                                    type="button" 
                                    onClick={() => handleValidateAndProcessCampaign(currentCampaignTypeKey)}
                                    // Disable if already complete OR currently processing this specific campaign
                                    disabled={completedCampaignForms.has(currentCampaignTypeKey) || isProcessingApiCallMap.get(currentCampaignTypeKey)}
                                    className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:bg-gray-500 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {isProcessingApiCallMap.get(currentCampaignTypeKey) ? (
                                        // Simple processing indicator
                                        <span className="flex items-center gap-1">
                                            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : completedCampaignForms.has(currentCampaignTypeKey) ? (
                                        '✓ Prompt Requested' // Updated text
                                    ) : (
                                        'Save & Request AI Prompt' // Updated text
                                    )}
                                </button>
                                <p className="text-xs text-gray-400">
                                    {completedCampaignForms.has(currentCampaignTypeKey) 
                                        ? 'AI prompt generation initiated. You can move to the next step when ready.'
                                        : 'Click to save details and trigger AI prompt generation.'
                                    } 
                                    {isProcessingApiCallMap.get(currentCampaignTypeKey) && " (This may take a moment...)"}
                                </p>
                            </div>
                         )}
                       </>
                    ) : (
                        <p className="text-center text-gray-500">(Select a campaign type above or check configuration)</p>
                    )}
                </div>
            </div>
          </motion.div>
        );
        // --- End Campaign Design UI ---

      case 'review':
        // --- Review & Submit UI (Final Step) ---
        return (
          <motion.div
             key="review"
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.3 }}
          >
            <h3 className="text-lg font-semibold mb-3 text-electric-teal/90">Review and Submit</h3>
            <p className="text-gray-300 mb-2">
              Review the details below before submitting the request.
            </p>
            {/* Informational Text Added */} 
            <p className="text-xs text-yellow-300 bg-yellow-900/30 p-2 rounded mb-4 border border-yellow-700/50">
                Please ensure you have clicked &quot;Save & Request AI Prompt&quot; for {designScope === 'multiple' ? 'all designs' : 'the current design'} above. Once submitted, our team will work on generating the final designs based on the details provided and the AI-generated prompts. You will be able to view the completed designs later.
            </p>
            <div className="bg-gray-700 p-4 rounded-lg space-y-3">
                <p><span className="font-medium text-gray-300">Selected Brand:</span> {userBrands.find(b => b.id === selectedBrandId)?.businessName || 'N/A'}</p>
                <p><span className="font-medium text-gray-300">Design Scope:</span> {designScope}</p>
                
                {/* Display summary of CampaignDesignData */} 
                <h4 className="text-md font-semibold text-gray-200 pt-2 border-t border-gray-600">Campaign Details:</h4>
                {Array.from(campaignFormDataMap.entries()).map(([type, formData]) => (
                    <div key={type} className="pl-4 border-l-2 border-gray-600">
                        <p className="font-medium text-gray-300">{designScope === 'multiple' ? type : 'General Design'}:</p>
                        <ul className="list-disc list-inside text-sm text-gray-400">
                            <li>Name: {formData.designName || '(Not set)'}</li>
                            <li>Goal: {formData.primaryGoal || '(Not set)'}</li>
                            <li>CTA: {formData.callToAction || '(Not set)'}</li>
                            <li>Offer: {formData.offer || '(Not set)'}</li>
                            <li>Selling Points: {(formData.keySellingPoints || []).join(', ') || '(Not set)'}</li>
                            <li>Audience: {formData.targetAudience || '(Not set)'}</li>
                            <li>Market Notes: {formData.targetMarketDescription || '(Not set)'}</li>
                            <li>Tagline: {formData.tagline || '(Not set)'}</li>
                            <li>Tone: {formData.tone || '(Not set)'}</li>
                            <li>Visual Style: {formData.visualStyle || '(Not set)'}</li>
                            <li>Additional Info: {formData.additionalInfo || '(Not set)'}</li>
                        </ul>
                    </div>
                ))}
                
            </div>
          </motion.div>
        );
       // --- End Review UI ---
       
      default:
        return <p>Unknown step: {currentStep}</p>;
    }
  };
  
  // --- Step Titles Map ---
  const stepTitles: Record<WizardStep, string> = {
    design_choice: 'Design Scope',
    brand: 'Brand Profile',
    campaign: 'Campaign Details',
    review: 'Review & Submit',
  };

  // --- Progress Bar Logic --- 
  const calculateProgress = () => {
      const steps: WizardStep[] = designScope === 'single' 
          ? ['brand', 'campaign', 'review'] 
          : ['design_choice', 'brand', 'campaign', 'review'];
      const currentIndex = steps.indexOf(currentStep);
      if (currentIndex === -1) return 0;
      // Adjust progress calculation slightly - step N is complete when moving TO step N+1
      // So completion % is based on index / total steps
      return (currentIndex / steps.length) * 100; 
  };
  const progress = isLoadingInitial ? 0 : calculateProgress();

  // Check if Next button should be disabled (extracted for clarity)
  const isNextDisabled = useMemo(() => {
     if (currentStep === 'brand' && !selectedBrandId) return true;
     if (currentStep === 'campaign') {
         if (designScope === 'multiple') {
             return completedCampaignForms.size !== businessTypesArray.length;
         }
         if (designScope === 'single') {
             // Ensure activeCampaignType is correctly determined for single mode check
             const singleTypeKey = activeCampaignType || '__single__'; 
             return !completedCampaignForms.has(singleTypeKey);
         }
     }
     return false; // Not disabled on other steps by default
  }, [currentStep, selectedBrandId, designScope, completedCampaignForms, businessTypesArray, activeCampaignType]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-gray-800 rounded-lg shadow-xl text-white">
      {/* Header & Progress (Show only after initial loading) */} 
      {!isLoadingInitial && currentStep !== 'design_choice' && (
         <div className="mb-8">
            <h2 className="text-2xl font-bold text-electric-teal mb-2">
                {stepTitles[currentStep]}
            </h2>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <motion.div
                    className="bg-electric-teal h-2.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                />
            </div>
            {/* Optional: Textual step indicator */} 
         </div>
      )}
      
      {/* Main Step Content */} 
      <motion.div 
          key={currentStep} // Animate when step changes
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
      >
          {renderStepContent()} 
      </motion.div>

      {/* Navigation Buttons (Show only after initial loading) */} 
      {!isLoadingInitial && (
         <div className="flex justify-between items-start mt-8 pt-4 border-t border-gray-700">
             {/* Back Button */} 
             {(currentStep !== 'design_choice') && ( // Always show back unless on first step
               <button 
                 onClick={handlePrevious} 
                 className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 transition-colors">
                 {currentStep === 'brand' && designScope === 'single' ? 'Back to Options' : 'Previous'}
               </button>
             )}
              {(currentStep === 'design_choice') && <div />} {/* Placeholder if needed */}

             <div className="flex flex-col items-end"> {/* Align Next button and potential message */}
                 {/* Next Button */} 
                 {(currentStep !== 'review') && (
                   <button 
                     onClick={handleNext} 
                     disabled={isNextDisabled} // Use the memoized check
                     className={`px-4 py-2 rounded bg-electric-teal text-charcoal hover:bg-electric-teal/90 transition-colors ${
                         isNextDisabled ? 'opacity-50 cursor-not-allowed' : ''
                     }`}
                   >
                     Next
                   </button>
                 )}

                 {/* Submit Button */} 
                 {currentStep === 'review' && (
                   <button 
                     onClick={handleSubmit} 
                     disabled={isSubmitting} 
                     className="px-4 py-2 rounded bg-green-500 hover:bg-green-400 transition-colors disabled:opacity-50">
                     {isSubmitting ? 'Submitting...' : 'Submit Request'}
                   </button>
                 )}

                {/* Validation Reminder Message */}
                {currentStep === 'campaign' && isNextDisabled && (
                     <p className="text-xs text-yellow-400 mt-1 text-right">
                        Please click &quot;Save & Request AI Prompt&quot; for {designScope === 'multiple' ? 'all designs' : 'the current design'} above.
                    </p>
                )}
            </div>

         </div>
      )}

      {/* --- NEW: Info Modal --- */}
      {isInfoModalOpen && infoModalContent && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={closeInfoModal} // Close on overlay click
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto relative border border-electric-teal/30"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <h3 className="text-xl font-semibold text-electric-teal mb-4">{infoModalContent.title}</h3>
            <div className="text-gray-300 mb-6">
              {infoModalContent.content}
            </div>
            <button
              onClick={closeInfoModal}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
             <button
                onClick={closeInfoModal}
                className="mt-4 px-4 py-2 rounded bg-electric-teal text-charcoal hover:bg-electric-teal/90 transition-colors"
              >
                Got it
              </button>
          </motion.div>
        </div>
      )}
      {/* --- END: Info Modal --- */}
    </div>
  );
};

export default AIHumanWizard; 