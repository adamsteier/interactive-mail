'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext'; // To get the logged-in user
import { useLeadsStore } from '@/store/leadsStore'; // Import the new leads store
import { useMarketingStore } from '@/store/marketingStore'; // Import Marketing Store
import { BrandingData, CampaignDesignData } from '@/types/firestoreTypes'; // Types
import { getBrandDataForUser, addBrandData } from '@/lib/brandingService'; // Service functions
import { addCampaignDesign, updateCampaignDesign } from '@/lib/campaignDesignService'; // Import for submit and update
import { associateCampaignWithBusinessTypes } from '@/lib/placeStorageService'; // Import for campaign-business type association

// Firebase Storage imports
import { storage } from '@/lib/firebase'; // Import storage instance
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage"; // Removed deleteObject

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
  offer: '', // Keep this field, but handling will make it optional on save
  keySellingPoints: '', // Initialize as string, no assertion needed
  tone: '',
  visualStyle: '',
  additionalInfo: '',
  imageryDescription: '' // Add imagery description field
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
  
  // Function to validate hex color
  const isValidHex = (hex: string): boolean => {
    return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
  };
  
  // --- Core Wizard State ---
  const [currentStep, setCurrentStep] = useState<WizardStep>('brand'); 
  const [designScope, setDesignScope] = useState<DesignScope>('single'); 
  const [isLoadingInitial, setIsLoadingInitial] = useState(true); 

  // Define a consistent style for placeholder text
  const placeholderStyle = "placeholder-muted-pink";

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
  // --- NEW: Imagery State ---
  const [isImageryExpanded, setIsImageryExpanded] = useState<Map<string, boolean>>(new Map()); // Track accordion expansion
  const [campaignImageUploadProgress, setCampaignImageUploadProgress] = useState<Map<string, Map<string, number>>>(new Map()); // Progress for each file
  const [campaignImageUploadError, setCampaignImageUploadError] = useState<Map<string, string>>(new Map());
  const [isUploadingCampaignImage, setIsUploadingCampaignImage] = useState<Map<string, boolean>>(new Map());
  const [uploadedCampaignImageUrls, setUploadedCampaignImageUrls] = useState<Map<string, string[]>>(new Map());
  // --- END: Imagery State ---
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
             // setKeySellingPointsInput(updatedSourceData.keySellingPoints.join(', ')); // REMOVED sync with removed state
        }

  };
  // --- END: Handler for Copying Campaign Details ---

  // --- NEW: Handlers for Campaign Image Upload ---
  const toggleImageryAccordion = (type: string) => {
      setIsImageryExpanded(prev => {
          const newMap = new Map(prev);
          const isCurrentlyExpanded = prev.get(type) || false;
          newMap.set(type, !isCurrentlyExpanded);
          return newMap;
      });
  };
  
  const handleCampaignImageSelect = (event: ChangeEvent<HTMLInputElement>, campaignType: string) => {
      if (!event.target.files || !event.target.files.length || !user) return;
      
      const files = Array.from(event.target.files);
      const validFiles: File[] = [];
      const errors: string[] = [];
      
      // Validate files
      for (const file of files) {
          // Check file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
              errors.push(`File ${file.name} exceeds 5MB limit.`);
              continue;
          }
          
          // Check if it's an image
          if (!file.type.startsWith('image/')) {
              errors.push(`File ${file.name} is not an image.`);
              continue;
          }
          
          validFiles.push(file);
      }
      
      // Set error if any
      if (errors.length > 0) {
          setCampaignImageUploadError(prev => {
              const newMap = new Map(prev);
              newMap.set(campaignType, errors.join(' '));
              return newMap;
          });
      } else {
          setCampaignImageUploadError(prev => {
              const newMap = new Map(prev);
              newMap.delete(campaignType);
              return newMap;
          });
      }
      
      // Upload each valid file
      for (const file of validFiles) {
          handleUploadCampaignImage(campaignType, file);
      }
      
      // Clear file input
      if (event.target) {
          event.target.value = '';
      }
      
      // Mark form as incomplete when files are selected
      setCompletedCampaignForms(prev => {
          const newSet = new Set(prev);
          newSet.delete(campaignType);
          return newSet;
      });
  };
  
  const handleUploadCampaignImage = async (campaignType: string, file: File) => {
      if (!user) return;
      
      // Generate a unique ID for this file
      const fileId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Set uploading state
      setIsUploadingCampaignImage(prev => {
          const newMap = new Map(prev);
          newMap.set(campaignType, true);
          return newMap;
      });
      
      // Initialize progress for this file
      setCampaignImageUploadProgress(prev => {
          const newMap = new Map(prev);
          const campaignProgressMap = newMap.get(campaignType) || new Map();
          campaignProgressMap.set(fileId, 0);
          newMap.set(campaignType, campaignProgressMap);
          return newMap;
      });
      
      try {
          // Create storage reference - ensure folder path is URL safe
          const sanitizedCampaignType = encodeURIComponent(campaignType.replace(/[^a-zA-Z0-9-_]/g, '_'));
          const storageRef = ref(storage, `campaignImages/${user.uid}/${sanitizedCampaignType}/${fileId}_${file.name}`);
          const uploadTask = uploadBytesResumable(storageRef, file);
          
          // Handle upload states
          uploadTask.on('state_changed',
              (snapshot) => {
                  // Track progress
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  setCampaignImageUploadProgress(prev => {
                      const newMap = new Map(prev);
                      const campaignProgressMap = newMap.get(campaignType) || new Map();
                      campaignProgressMap.set(fileId, progress);
                      newMap.set(campaignType, campaignProgressMap);
                      return newMap;
                  });
              },
              (error) => {
                  // Handle error
                  console.error(`Error uploading campaign image for ${campaignType}:`, error);
                  setCampaignImageUploadError(prev => {
                      const newMap = new Map(prev);
                      newMap.set(campaignType, `Upload failed: ${error.code || 'Storage permission error'}`);
                      return newMap;
                  });
                  setIsUploadingCampaignImage(prev => {
                      const newMap = new Map(prev);
                      newMap.set(campaignType, false);
                      return newMap;
                  });
              },
              async () => {
                  try {
                      // Get download URL
                      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                      
                      // Add URL to the list
                      setUploadedCampaignImageUrls(prev => {
                          const newMap = new Map(prev);
                          const currentUrls = newMap.get(campaignType) || [];
                          newMap.set(campaignType, [...currentUrls, downloadURL]);
                          return newMap;
                      });
                      
                      // Update campaign form data to include the uploaded image - but don't set undefined values
                      setCampaignFormDataMap(prev => {
                          const newMap = new Map(prev);
                          const formData = newMap.get(campaignType) || { ...initialCampaignFormData };
                          
                          const updatedData = {
                              ...formData,
                              uploadedImageUrls: [...(formData.uploadedImageUrls || []), downloadURL],
                          };
                          
                          // Only set imageryType if we have uploads
                          if (downloadURL) {
                              updatedData.imageryType = 'upload';
                          }
                          
                          newMap.set(campaignType, updatedData);
                          return newMap;
                      });
                      
                      console.log(`Campaign image uploaded successfully for ${campaignType}:`, downloadURL);
                      
                      // Check if all uploads are complete
                      const progressMap = campaignImageUploadProgress.get(campaignType) || new Map();
                      const allComplete = Array.from(progressMap.values()).every(p => p === 100);
                      if (allComplete) {
                          setIsUploadingCampaignImage(prev => {
                              const newMap = new Map(prev);
                              newMap.set(campaignType, false);
                              return newMap;
                          });
                      }
                      
                      // Mark form as incomplete when uploads complete
                      setCompletedCampaignForms(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(campaignType);
                          return newSet;
                      });
                  } catch (error) {
                      console.error(`Error getting download URL for ${campaignType}:`, error);
                      setCampaignImageUploadError(prev => {
                          const newMap = new Map(prev);
                          newMap.set(campaignType, 'Upload completed but failed to get download URL.');
                          return newMap;
                      });
                      
                      setIsUploadingCampaignImage(prev => {
                          const newMap = new Map(prev);
                          newMap.set(campaignType, false);
                          return newMap;
                      });
                  }
              }
          );
      } catch (error) {
          console.error(`Error setting up upload for ${campaignType}:`, error);
          setCampaignImageUploadError(prev => {
              const newMap = new Map(prev);
              newMap.set(campaignType, `Upload setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              return newMap;
          });
          
          setIsUploadingCampaignImage(prev => {
              const newMap = new Map(prev);
              newMap.set(campaignType, false);
              return newMap;
          });
      }
  };
  
  const handleRemoveCampaignImage = (campaignType: string, imageUrl: string) => {
      if (!user) return;
      
      // Remove from uploaded URLs
      setUploadedCampaignImageUrls(prev => {
          const newMap = new Map(prev);
          const currentUrls = newMap.get(campaignType) || [];
          newMap.set(campaignType, currentUrls.filter(url => url !== imageUrl));
          return newMap;
      });
      
      // Remove from form data
      setCampaignFormDataMap(prev => {
          const newMap = new Map(prev);
          const formData = newMap.get(campaignType) || { ...initialCampaignFormData };
          const updatedUrls = (formData.uploadedImageUrls || []).filter(url => url !== imageUrl);
          
          // Create updated data without directly setting 'undefined' values
          const updatedData = {
              ...formData,
              uploadedImageUrls: updatedUrls
          };
          
          // If no more images remain, decide what to do with imageryType
          if (updatedUrls.length === 0) {
              // If there's an imagery description, keep 'describe' type
              if (formData.imageryDescription?.trim()) {
                  updatedData.imageryType = 'describe';
              } else {
                  // Otherwise, delete the property entirely instead of setting to undefined
                  delete updatedData.imageryType;
              }
          } else {
              // Still have images, keep 'upload' type
              updatedData.imageryType = 'upload';
          }
          
          newMap.set(campaignType, updatedData);
          return newMap;
      });
      
      // Try to delete from Firebase Storage
      try {
          const storageRef = ref(storage, imageUrl);
          deleteObject(storageRef).catch(error => {
              console.error(`Error deleting image from storage: ${error.message}`);
              // Don't block the UI flow if deletion fails
          });
      } catch (error) {
          console.error('Error creating reference to delete image:', error);
      }
      
      // Mark form as incomplete
      setCompletedCampaignForms(prev => {
          const newSet = new Set(prev);
          newSet.delete(campaignType);
          return newSet;
      });
  };
  // --- END: Handlers for Campaign Image Upload ---

  // --- Handlers for Campaign Step ---
  const handleCampaignInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    businessType: string
  ) => {
    const { name, value } = event.target;
    setCampaignFormDataMap(prevForms => {
      const updatedForms = new Map(prevForms);
      const currentFormData = updatedForms.get(businessType) || { ...initialCampaignFormData };

      updatedForms.set(businessType, {
        ...currentFormData,
        [name]: value, // Directly assign the value (will be string for keySellingPoints from textarea)
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
      
      // Required fields validation
      if (!formData?.designName || formData.designName.trim() === '') { 
          setCampaignError(`Design Name is required for the ${type} design.`);
          setCompletedCampaignForms(prev => {
              const newSet = new Set(prev);
              newSet.delete(type);
              return newSet;
          });
          return false; // Indicate failure
      }
      
      if (!formData?.primaryGoal || formData.primaryGoal.trim() === '') { 
          setCampaignError(`Primary Goal is required for the ${type} design.`);
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
          // Check if there are any images being uploaded for this campaign
          const isCurrentlyUploading = isUploadingCampaignImage.get(type);
          if (isCurrentlyUploading) {
              setCampaignError(`Please wait for image uploads to complete for the ${type} design.`);
              setIsProcessingApiCallMap(prev => new Map(prev).set(type, false));
              return false;
          }

          let campaignId = campaignDesignIdsMap.get(type) || null;

          // Prepare data for saving/updating with proper defaults for optional fields
          const dataToSave: Omit<CampaignDesignData, 'id' | 'createdAt' | 'updatedAt'> = {
              associatedBrandId: selectedBrandId,
              designName: formData.designName.trim(),
              primaryGoal: formData.primaryGoal.trim(),
              callToAction: formData.callToAction?.trim() || '',
              targetAudience: formData.targetAudience?.trim() || '',
              targetMarketDescription: formData.targetMarketDescription?.trim() || '',
              tagline: formData.tagline?.trim() || '',
              offer: formData.offer?.trim() || '',
              keySellingPoints: formData.keySellingPoints?.trim() || '', // Remove assertion, should be string now
              tone: formData.tone?.trim() || '',
              visualStyle: formData.visualStyle?.trim() || '',
              additionalInfo: formData.additionalInfo?.trim() || '',
              imageryDescription: formData.imageryDescription?.trim() || '',
              uploadedImageUrls: uploadedCampaignImageUrls.get(type) || [],
              status: 'processing'
          };
          
          // Conditionally add imageryType only when needed (Firestore doesn't accept undefined values)
          if (uploadedCampaignImageUrls.get(type)?.length) {
              // If we have uploaded images, set type to 'upload'
              dataToSave.imageryType = 'upload';
          } else if (formData.imageryDescription?.trim()) {
              // If we have a description but no uploads, set type to 'describe'
              dataToSave.imageryType = 'describe';
          }
          // If neither condition is met, we don't include the field at all

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

              // NEW: Associate campaign with business type in the background
              try {
                  // For single scope, associate with all business types (since it's one campaign for all types)
                  // For multiple scope, associate with just the current type
                  const typesToAssociate = designScope === 'single' ? businessTypesArray : [type];
                  
                  // Call the associateCampaignWithBusinessTypes function (don't await to keep it in background)
                  if (typesToAssociate.length > 0) {
                      console.log(`Associating campaign ${campaignId} with business types: ${typesToAssociate.join(', ')}`);
                      associateCampaignWithBusinessTypes(user.uid, campaignId, typesToAssociate)
                          .then(() => console.log(`Successfully associated campaign ${campaignId} with business types`))
                          .catch(error => console.error(`Error associating campaign ${campaignId} with business types:`, error));
                  }
              } catch (associationError) {
                  // Log error but continue with API call
                  console.error(`Error during campaign-business type association:`, associationError);
                  // Don't fail the whole operation just because of association error
              }
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
          
          // If we're in multiple design scope, automatically move to the next tab
          if (designScope === 'multiple' && businessTypesArray.length > 1) {
              // Find the current index in the business types array
              const currentIndex = businessTypesArray.findIndex(t => t === type);
              
              // Only proceed if we found the current type in the array
              if (currentIndex !== -1) {
                  // Calculate the next index, wrapping around to the beginning if needed
                  const nextIndex = (currentIndex + 1) % businessTypesArray.length;
                  const nextType = businessTypesArray[nextIndex];
                  
                  // Look for the first incomplete type, starting from the next one
                  let targetType = nextType;
                  let searchCount = 0;
                  
                  // Loop through at most once through all types to find one that's not completed
                  while (searchCount < businessTypesArray.length) {
                      // If we find a type that's not completed, use that
                      if (!completedCampaignForms.has(targetType)) {
                          break;
                      }
                      
                      // Otherwise, move to the next one
                      const targetIndex = (businessTypesArray.findIndex(t => t === targetType) + 1) % businessTypesArray.length;
                      targetType = businessTypesArray[targetIndex];
                      searchCount++;
                  }
                  
                  // If we found a type that's not completed, switch to it
                  if (targetType !== type) {
                      console.log(`Auto-switching to next tab: ${targetType}`);
                      setActiveCampaignType(targetType);
                  }
              }
          }
          
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
            className="p-4 sm:p-8 bg-charcoal/80 rounded-lg shadow-glow max-w-3xl mx-auto border border-electric-teal/30 backdrop-blur-sm"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-electric-teal mb-4">Design Scope</h2>
            <p className="text-gray-300 mb-6">
              You&apos;ve selected leads from multiple business types: <strong className="text-electric-teal">{typesArray.join(', ')}</strong>.
            </p>
            <p className="text-gray-300 mb-6">
              How would you like to proceed with the design?
            </p>
            <div className="space-y-4">
              <button
                onClick={() => handleDesignScopeChoice('single')}
                className="w-full text-left p-4 rounded-lg border-2 border-electric-teal/50 hover:border-electric-teal hover:bg-electric-teal/10 hover:shadow-glow transition-all duration-200"
              >
                <h3 className="text-lg font-medium text-electric-teal">Create ONE Design</h3>
                <p className="text-sm text-gray-300">Generate a single postcard design suitable for all selected business types.</p>
              </button>
              <button
                onClick={() => handleDesignScopeChoice('multiple')}
                className="w-full text-left p-4 rounded-lg border-2 border-electric-teal/50 hover:border-electric-teal hover:bg-electric-teal/10 hover:shadow-glow transition-all duration-200"
              >
                <h3 className="text-lg font-medium text-electric-teal">Create MULTIPLE Designs</h3>
                <p className="text-sm text-gray-300">Generate a separate, tailored postcard design for each selected business type.</p>
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
                    <h3 className="text-xl font-semibold mb-4 text-electric-teal">Select an Existing Brand Profile</h3>
                    <div className="space-y-2">
                      {userBrands.map((brand) => (
                        <div
                          key={brand.id}
                          onClick={() => handleSelectBrand(brand.id!)}
                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                            selectedBrandId === brand.id 
                              ? 'border-electric-teal bg-charcoal/70 shadow-glow-sm' 
                              : 'border-gray-600 hover:border-electric-teal/70 hover:bg-charcoal/50 hover:shadow-glow-sm'
                          }`}
                        >
                          <p className="font-medium text-white">{brand.businessName}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleShowNewBrandForm}
                      className="mt-4 text-sm text-electric-teal hover:text-electric-teal/80 hover:underline transition-colors"
                    >
                      + Add New Brand Profile
                    </button>
                  </div>
                )}

                {showNewBrandForm && (
                  <form onSubmit={handleSaveNewBrand} className="space-y-5 bg-charcoal/60 backdrop-blur-sm p-6 rounded-lg border border-electric-teal/20 shadow-glow-sm">
                    <h3 className="text-xl font-semibold mb-4 text-electric-teal">
                      {userBrands.length === 0 
                        ? "Let's start with the foundation!" 
                        : "Add New Brand Profile"}
                    </h3>
                    <p className="text-gray-300 mb-4">
                      {userBrands.length === 0 && "Getting your brand details right ensures your postcard truly represents your business."}
                    </p>
                    <div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-electric-teal mb-1">Business Name *</label>
                      <input 
                        type="text" id="businessName" name="businessName"
                        value={newBrandData.businessName || ''} onChange={handleNewBrandInputChange} required
                        className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                      />
                    </div>
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-electric-teal mb-1">Address</label>
                        <textarea 
                            id="address" name="address" rows={2}
                            value={typeof newBrandData.address === 'string' ? newBrandData.address : ''} 
                            onChange={handleNewBrandInputChange}
                            className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-electric-teal mb-1">Contact Email</label>
                        <input 
                          type="email" id="email" name="email"
                          value={newBrandData.email || ''} onChange={handleNewBrandInputChange}
                          className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                        />
                      </div>
                      <div>
                        <label htmlFor="website" className="block text-sm font-medium text-electric-teal mb-1">Website</label>
                        <input 
                          type="text" id="website" name="website"
                          value={newBrandData.website || ''} onChange={handleNewBrandInputChange}
                          placeholder="example.com"
                          className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="primaryColor" className="block text-sm font-medium text-electric-teal mb-1">Primary Brand Color</label>
                           <div className="flex items-center gap-2">
                               <input 
                                    type="text" 
                                    id="primaryColorHex" 
                                    name="primaryColorHex"
                                    value={newBrandData.styleComponents?.primaryColor || '#00c2a8'}
                                    onChange={(e) => {
                                        const hexValue = e.target.value;
                                        // Update state even if invalid for smooth typing experience
                                        setNewBrandData(prev => ({
                                            ...prev,
                                            styleComponents: { ...prev.styleComponents, primaryColor: hexValue }
                                        }));
                                    }}
                                    onBlur={(e) => {
                                        const hexValue = e.target.value;
                                        // Validate and correct on blur if needed
                                        if (!isValidHex(hexValue)) {
                                            setNewBrandData(prev => ({
                                                ...prev, 
                                                styleComponents: { ...prev.styleComponents, primaryColor: '#00c2a8' }
                                            }));
                                        }
                                    }}
                                    className="flex-grow p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                />
                                <input 
                                    type="color" 
                                    id="primaryColor" 
                                    name="primaryColor"
                                    value={newBrandData.styleComponents?.primaryColor || '#00c2a8'}
                                    onChange={handleNewBrandInputChange}
                                    className="h-10 w-10 p-1 rounded-md bg-charcoal/80 border border-gray-600 cursor-pointer focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="secondaryColor" className="block text-sm font-medium text-electric-teal mb-1">Secondary Brand Color</label>
                            <div className="flex items-center gap-2">
                               <input 
                                    type="text" 
                                    id="secondaryColorHex" 
                                    name="secondaryColorHex"
                                    value={newBrandData.styleComponents?.secondaryColor || '#00858a'}
                                    onChange={(e) => {
                                        const hexValue = e.target.value;
                                        // Update state even if invalid for smooth typing experience
                                        setNewBrandData(prev => ({
                                            ...prev,
                                            styleComponents: { ...prev.styleComponents, secondaryColor: hexValue }
                                        }));
                                    }}
                                    onBlur={(e) => {
                                        const hexValue = e.target.value;
                                        // Validate and correct on blur if needed
                                        if (!isValidHex(hexValue)) {
                                            setNewBrandData(prev => ({
                                                ...prev, 
                                                styleComponents: { ...prev.styleComponents, secondaryColor: '#00858a' }
                                            }));
                                        }
                                    }}
                                    className="flex-grow p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                />
                                <input 
                                    type="color" 
                                    id="secondaryColor" 
                                    name="secondaryColor"
                                    value={newBrandData.styleComponents?.secondaryColor || '#00858a'}
                                    onChange={handleNewBrandInputChange}
                                    className="h-10 w-10 p-1 rounded-md bg-charcoal/80 border border-gray-600 cursor-pointer focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200"
                                />
                            </div>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-electric-teal mb-1">Logo (Optional)</label>
                        <div className="mt-1 flex items-center gap-4 flex-wrap">
                            {/* File Input Trigger Button */} 
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className="px-3 py-2 rounded-md border-2 border-electric-teal/60 text-electric-teal hover:border-electric-teal hover:bg-electric-teal/10 hover:shadow-glow-sm text-sm transition-all disabled:opacity-50 shrink-0"
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
                                // Use regular img instead of next/image for preview
                                <img src={logoPreviewUrl} alt="Logo Preview" className="h-10 w-auto rounded-md border border-gray-600 shrink-0" />
                            )}
                            {/* Display Final Uploaded Logo if no preview */} 
                            {!logoPreviewUrl && newBrandData.logoUrl && (
                                 // Use regular img instead of next/image for uploaded URL
                                 <img src={newBrandData.logoUrl} alt="Uploaded Logo" className="h-10 w-auto rounded-md border border-green-500 shrink-0" />
                            )}
                            {/* Progress Indicator */} 
                            {isUploadingLogo && logoUploadProgress !== null && (
                                <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0">
                                    <span>Uploading...</span>
                                     <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                                         <div className="bg-electric-teal h-full rounded-full" style={{width: `${logoUploadProgress}%`}}></div>
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
                        <label className="block text-sm font-medium text-electric-teal mb-2">Social Media Handles (Optional)</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div>
                              <label htmlFor="instagram" className="block text-xs font-medium text-gray-300 mb-1">Instagram</label>
                              <input type="text" id="instagram" name="instagram" placeholder="your_handle" value={newBrandData.socialMediaHandles?.instagram || ''} onChange={handleNewBrandInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                           </div>
                           <div>
                              <label htmlFor="facebook" className="block text-xs font-medium text-gray-300 mb-1">Facebook</label>
                              <label htmlFor="facebook" className="block text-xs font-medium text-gray-400 mb-1">Facebook</label>
                              <input type="text" id="facebook" name="facebook" placeholder="YourPageName" value={newBrandData.socialMediaHandles?.facebook || ''} onChange={handleNewBrandInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                           </div>
                           <div>
                              <label htmlFor="twitter" className="block text-xs font-medium text-gray-400 mb-1">Twitter (X)</label>
                              <input type="text" id="twitter" name="twitter" placeholder="YourHandle" value={newBrandData.socialMediaHandles?.twitter || ''} onChange={handleNewBrandInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                           </div>
                           <div>
                              <label htmlFor="linkedin" className="block text-xs font-medium text-gray-400 mb-1">LinkedIn</label>
                              <input type="text" id="linkedin" name="linkedin" placeholder="company/your-company" value={newBrandData.socialMediaHandles?.linkedin || ''} onChange={handleNewBrandInputChange} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 text-sm focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                           </div>
                        </div>
                     </div>
                     <div>
                        <label htmlFor="brandIdentity" className="block text-sm font-medium text-gray-300 mb-1">Brand Identity/Overall Notes</label>
                        <textarea 
                          id="brandIdentity" name="brandIdentity" rows={3}
                          value={newBrandData.brandIdentity || ''} onChange={handleNewBrandInputChange}
                          placeholder="e.g., We are a modern, tech-focused accounting firm targeting startups. Friendly, approachable, and expert tone. Clean and minimalist visual style."
                          className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                        />
                     </div>

                    <div className="flex items-center gap-4 pt-2">
                      <button 
                        type="submit" disabled={isSavingBrand}
                        className="px-4 py-2 rounded-md bg-electric-teal text-charcoal shadow-glow hover:shadow-glow-strong disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        {isSavingBrand ? 'Saving...' : 'Save Brand Profile'}
                      </button>
                      {userBrands.length > 0 && (
                        <button 
                          type="button" onClick={() => setShowNewBrandForm(false)} 
                          className="text-sm text-gray-400 hover:text-gray-200 hover:underline transition-colors"
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
                <div className="flex space-x-1 border-b border-gray-700 mb-6 pt-3 px-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-electric-teal/20 scrollbar-track-transparent">
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
                                className={`flex items-center gap-2 px-4 py-2 mb-0.5 rounded-t-md text-sm font-medium transition-all duration-200 whitespace-nowrap ${ 
                                    isActive 
                                    ? 'bg-charcoal text-electric-teal border-b-2 border-electric-teal tab-glow z-10 relative' 
                                    : 'text-gray-400 hover:text-electric-teal hover:bg-charcoal/50'
                                }`}
                            >
                                {/* Status Indicator - Show check only if complete and NOT active processing */}
                                {!showSpinner && (
                                    <span className={`w-2 h-2 rounded-full ${ 
                                        isComplete ? 'bg-green-500' : isActive ? 'bg-electric-teal' : 'bg-gray-500' 
                                    }`} /> 
                                )}
                                {type}
                                {/* Processing Spinner for Tab */} 
                                {showSpinner && (
                                    <svg className="animate-spin h-3 w-3 text-electric-teal ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                {/* --- NEW: Welcome Text --- */}
                <div className="mb-6 p-6 bg-gradient-to-r from-charcoal/70 to-charcoal/50 backdrop-blur-sm rounded-lg border border-electric-teal/20 shadow-glow-sm">
                    <h3 className="text-lg font-semibold text-electric-teal mb-2">
                        Let&apos;s Craft Your <span className="text-electric-teal">{activeCampaignType !== '__single__' ? activeCampaignType : (businessTypesArray[0] || 'Business')}</span> Postcard!
                    </h3>
                    <p className="text-sm text-gray-300 mb-2">
                        Welcome! We&apos;re about to create a tailor-made postcard for your campaign—completely aligned with your brand guidelines. To make sure our AI-driven design captures your unique style and messaging, please fill out the details below.
                    </p>
                    <p className="text-xs text-gray-400">
                        Think of this as your creative brief: you&apos;ll provide the key campaign info (like goals, offers, and the vibe you want) so we can craft a polished, on-brand postcard that resonates with your target audience. The more specifics you share—like your key selling points, tone, or preferred visuals—the easier it is for us to deliver a stunning final design.
                    </p>
                </div>
                {/* --- End Welcome Text --- */}

                 <h3 className="text-xl font-semibold mb-3 text-electric-teal">
                     Define Campaign Design Details 
                     {designScope === 'multiple' && activeCampaignType && ` for: ${activeCampaignType}`}
                 </h3>
                 <p className="text-sm text-gray-300 mb-4">
                     Using Brand: <span className="text-electric-teal">{selectedBrandName}</span>
                 </p>

                  {/* --- NEW: Copy Button (only in multi-mode) --- */}
                  {designScope === 'multiple' && businessTypesArray.length > 1 && activeCampaignType && (
                    <div className="mb-4 text-right">
                         <button
                            type="button"
                            onClick={handleCopyCampaignDetails}
                            className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 hover:shadow-glow-blue text-white text-sm transition-all duration-200"
                         >
                            Copy These Details to Other Designs
                         </button>
                         {copySuccessMessage && <p className="text-xs text-green-400 mt-1">{copySuccessMessage}</p>}
                    </div>
                 )}
                 {/* --- END: Copy Button --- */}

                {campaignError && <p className="text-red-400 mb-4">{campaignError}</p>} 

                <div className="bg-charcoal/60 backdrop-blur-sm p-6 rounded-lg border border-electric-teal/20 space-y-4 shadow-glow-sm">
                    {currentCampaignTypeKey ? (
                       <> 
                        <div>
                            <label htmlFor="designName" className="block text-sm font-medium text-electric-teal mb-1">Design Name *</label>
                            <input type="text" id="designName" name="designName" 
                                value={currentCampaignData.designName || ''}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} required 
                                className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="primaryGoal" className="block text-sm font-medium text-electric-teal mb-1">Primary Goal *</label>
                            <input type="text" id="primaryGoal" name="primaryGoal" 
                                value={currentCampaignData.primaryGoal || ''}
                                placeholder={`e.g., Get more ${activeCampaignType || 'customers'} to book consultations`}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} required
                                className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="callToAction" className="block text-sm font-medium text-electric-teal mb-1">Call To Action</label>
                            <input type="text" id="callToAction" name="callToAction" 
                                value={currentCampaignData.callToAction || ''}
                                placeholder={`e.g., Visit ${selectedBrandName}.com, Call Now for a Quote, Book Your Appointment`}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} 
                                className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="targetAudience" className="block text-sm font-medium text-electric-teal mb-1">Target Audience Description</label>
                            <textarea id="targetAudience" name="targetAudience" rows={3} 
                                value={currentCampaignData.targetAudience || ''}
                                placeholder={designScope === 'multiple' ? `Describe the ideal ${activeCampaignType || 'customer'} (Why do they need you or your service? e.g., homeowners needing tax help, local restaurants seeking bookkeeping).` : 'Describe the ideal customer across all types (e.g., small business owners in St. Albert).'}
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} 
                                className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                            />
                        </div>
                        <div>
                            <label htmlFor="offer" className="block text-sm font-medium text-electric-teal mb-1">Specific Offer / Promotion</label>
                            <input type="text" id="offer" name="offer" value={currentCampaignData.offer || ''} placeholder="e.g., 10% Off First Service, Free Initial Consultation, Mention This Card for..." onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                        </div>
                        <div>
                            <label htmlFor="keySellingPoints" className="block text-sm font-medium text-electric-teal mb-1">Key Selling Points</label>
                            <textarea
                                id="keySellingPoints"
                                name="keySellingPoints"
                                rows={3}
                                value={currentCampaignData.keySellingPoints || ''} // Use string value directly
                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} // Use general handler
                                placeholder="e.g., Saves Time, Reduces Errors, Expert Advice, Local & Trusted"
                                className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}
                            />
                            <p className="text-xs text-gray-400 mt-1">Enter your key benefits or selling points here.</p> {/* Updated helper text */}
                        </div>
                        <div>
                            <label htmlFor="targetMarketDescription" className="block text-sm font-medium text-electric-teal mb-1">Target Market Description (Optional)</label>
                            <textarea id="targetMarketDescription" name="targetMarketDescription" rows={2} value={currentCampaignData.targetMarketDescription || ''} placeholder={`e.g., Focus on ${activeCampaignType || 'businesses'} in the downtown core, Target new homeowners in the area`} onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                        </div>
                        <div>
                            <label htmlFor="tagline" className="block text-sm font-medium text-electric-teal mb-1">Tagline (Optional)</label>
                            <input type="text" id="tagline" name="tagline" value={currentCampaignData.tagline || ''} placeholder="Your catchy business slogan" onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label htmlFor="tone" className="block text-sm font-medium text-electric-teal mb-1">Tone (Optional)</label>
                                <p className="text-xs text-gray-400 mb-1">(Keywords help the AI)</p>
                                <input type="text" name="tone" placeholder="e.g., Professional, Friendly, Urgent, Calm, Humorous" value={currentCampaignData.tone || ''} onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                                {/* NEW: Info Icon */}
                                <button type="button" onClick={() => openInfoModal('tone')} className="absolute top-0 right-0 mt-1 mr-1 text-gray-400 hover:text-electric-teal transition-colors">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                            </div>
                            <div className="relative">
                                <label htmlFor="visualStyle" className="block text-sm font-medium text-electric-teal mb-1">Visual Style/Aesthetic (Optional)</label>
                                <p className="text-xs text-gray-400 mb-1">(Keywords help the AI)</p>
                                <input type="text" name="visualStyle" placeholder="e.g., Modern, Minimalist, Bold, Vintage, Playful, Elegant" value={currentCampaignData.visualStyle || ''} onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                                {/* NEW: Info Icon */}
                                <button type="button" onClick={() => openInfoModal('visualStyle')} className="absolute top-0 right-0 mt-1 mr-1 text-gray-400 hover:text-electric-teal transition-colors">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                   </svg>
                                 </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="additionalInfo" className="block text-sm font-medium text-electric-teal mb-1">Additional Information (Optional)</label>
                            <textarea id="additionalInfo" name="additionalInfo" rows={3} value={currentCampaignData.additionalInfo || ''} placeholder="Anything else? e.g., Must include our phone number prominently. Use image of happy clients. Avoid red color." onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 ${placeholderStyle}`}/>
                        </div>
                        {/* Imagery Accordion Section */}
                        <div className="pt-4 border-t border-gray-600/50 mt-4">
                            <div className="flex items-center justify-between cursor-pointer group p-2 rounded-md hover:bg-electric-teal/5 transition-all duration-200" 
                                 onClick={() => currentCampaignTypeKey && toggleImageryAccordion(currentCampaignTypeKey)}>
                                <h4 className="text-sm font-medium text-electric-teal group-hover:text-electric-teal">Imagery Options (Optional)</h4>
                                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-charcoal/80 text-electric-teal border border-electric-teal/30 group-hover:border-electric-teal group-hover:shadow-glow-sm transition-all duration-200">
                                    {isImageryExpanded.get(currentCampaignTypeKey) ? '−' : '+'}
                                </span>
                            </div>
                            
                            {/* Accordion Content */}
                            {currentCampaignTypeKey && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ 
                                        height: isImageryExpanded.get(currentCampaignTypeKey) ? 'auto' : 0,
                                        opacity: isImageryExpanded.get(currentCampaignTypeKey) ? 1 : 0
                                    }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-3 space-y-4 bg-charcoal/40 p-4 rounded-md border border-electric-teal/10">
                                        {/* Description Option */}
                                        <div>
                                            <label htmlFor="imageryDescription" className="block text-sm font-medium text-electric-teal mb-1">Imagery Description</label>
                                            <textarea 
                                                id="imageryDescription" 
                                                name="imageryDescription" 
                                                rows={3} 
                                                value={currentCampaignData.imageryDescription || ''} 
                                                placeholder="Describe the imagery you want in your postcard. e.g., Happy clients, modern office, product showcase." 
                                                onChange={(e) => { if (currentCampaignTypeKey) handleCampaignInputChange(e, currentCampaignTypeKey)}} 
                                                className={`w-full p-2 rounded-md bg-charcoal/80 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal focus:shadow-glow-input transition-shadow duration-200 text-sm ${placeholderStyle}`}
                                            />
                                        </div>
                                        
                                        {/* Upload Option */}
                                        <div>
                                            <label className="block text-sm font-medium text-electric-teal mb-1">Image Upload</label>
                                            <div className="space-y-3">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => handleCampaignImageSelect(e, currentCampaignTypeKey)}
                                                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-electric-teal/20 file:text-electric-teal hover:file:bg-electric-teal/30 file:transition-colors file:cursor-pointer"
                                                />
                                                <p className="text-xs text-gray-400 mt-1">Upload images to use in your postcard design (Max 5MB per image)</p>
                                                
                                                {/* Display Uploaded Images */}
                                                {(uploadedCampaignImageUrls.get(currentCampaignTypeKey)?.length ?? 0) > 0 && (
                                                    <div className="mt-2">
                                                        <p className="text-xs text-gray-300 mb-2">Uploaded Images:</p>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                            {(uploadedCampaignImageUrls.get(currentCampaignTypeKey) || []).map((url, index) => (
                                                                <div key={`img-${index}`} className="relative aspect-square group overflow-hidden rounded-md border border-gray-600">
                                                                    {/* Replace Next.js Image with regular img for Firebase URLs */}
                                                                    <img 
                                                                        src={url} 
                                                                        alt={`Uploaded ${index+1}`}
                                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveCampaignImage(currentCampaignTypeKey, url);
                                                                        }}
                                                                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Upload Progress */}
                                                {isUploadingCampaignImage.get(currentCampaignTypeKey) && (
                                                    <div className="mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-4 h-4 rounded-full border-2 border-electric-teal border-t-transparent animate-spin"></div>
                                                            <p className="text-xs text-gray-300">Uploading images...</p>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Error Message */}
                                                {campaignImageUploadError.get(currentCampaignTypeKey) && (
                                                    <p className="text-xs text-red-400 mt-1">
                                                        {campaignImageUploadError.get(currentCampaignTypeKey)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
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
                                    className="px-4 py-2 rounded-md bg-electric-teal/90 hover:bg-electric-teal text-charcoal text-sm shadow-glow hover:shadow-glow-strong disabled:bg-gray-500 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300"
                                >
                                    {isProcessingApiCallMap.get(currentCampaignTypeKey) ? (
                                        // Simple processing indicator
                                        <span className="flex items-center gap-1">
                                            <svg className="animate-spin h-3 w-3 text-charcoal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : completedCampaignForms.has(currentCampaignTypeKey) ? (
                                        '✓ Prompt Requested' // Updated text
                                    ) : (
                                        'Save & Request Design' // Updated text
                                    )}
                                </button>
                                <div className="text-xs text-gray-400">
                                    {completedCampaignForms.has(currentCampaignTypeKey) 
                                        ? 'AI design generation initiated. We\'ll automatically move to the next design.'
                                        : (
                                          <div>
                                            <p>Only Design Name and Primary Goal are required.</p>
                                            <p>Click to save details and trigger AI design generation.</p>
                                          </div>
                                        )
                                    } 
                                    {isProcessingApiCallMap.get(currentCampaignTypeKey) && " (This may take a moment...)"}
                                </div>
                            </div>
                         )}
                       </>
                    ) : (
                        <p className="text-center text-gray-400">(Select a campaign type above or check configuration)</p>
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
            <h3 className="text-xl font-semibold mb-4 text-electric-teal">Review and Submit</h3>
            <p className="text-gray-300 mb-4">
              Review the details below before submitting your design request.
            </p>
            {/* Informational Text Added */} 
            <p className="text-yellow-300 bg-yellow-900/30 p-4 rounded-md mb-6 border border-yellow-700/50 text-sm">
                Please ensure you have clicked &quot;Save & Request AI Prompt&quot; for {designScope === 'multiple' ? 'all designs' : 'the current design'} above. Once submitted, our team will work on generating the final designs based on the details provided and the AI-generated prompts. You will be able to view the completed designs later.
            </p>
            <div className="bg-charcoal/60 backdrop-blur-sm p-6 rounded-lg border border-electric-teal/20 space-y-5 shadow-glow-sm">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 border-b border-gray-700 pb-4">
                    <div>
                        <p className="text-sm text-gray-400">Selected Brand:</p>
                        <p className="text-lg text-electric-teal">{userBrands.find(b => b.id === selectedBrandId)?.businessName || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Design Scope:</p>
                        <p className="text-lg text-electric-teal capitalize">{designScope}</p>
                    </div>
                </div>
                
                {/* Display summary of CampaignDesignData */} 
                <h4 className="text-md font-semibold text-gray-200 pt-2">Campaign Details:</h4>
                <div className="space-y-6">
                    {Array.from(campaignFormDataMap.entries()).map(([type, formData]) => (
                        <div key={type} className="pl-4 border-l-2 border-electric-teal/40 hover:border-electric-teal transition-colors">
                            <h5 className="font-medium text-electric-teal text-lg mb-2">{designScope === 'multiple' ? type : 'General Design'}:</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                                <div>
                                    <p className="text-gray-400">Name:</p>
                                    <p className="text-gray-200">{formData.designName || '(Not set)'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Goal:</p>
                                    <p className="text-gray-200">{formData.primaryGoal || '(Not set)'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Call to Action:</p>
                                    <p className="text-gray-200">{formData.callToAction || '(Not set)'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Offer:</p>
                                    <p className="text-gray-200">{formData.offer || '(Not set)'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-400">Selling Points:</p>
                                    <p className="text-gray-200">{formData.keySellingPoints || '(Not set)'}</p> {/* Display string directly */}
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-400">Target Audience:</p>
                                    <p className="text-gray-200">{formData.targetAudience || '(Not set)'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Market Description:</p>
                                    <p className="text-gray-200">{formData.targetMarketDescription || '(Not set)'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Tagline:</p>
                                    <p className="text-gray-200">{formData.tagline || '(Not set)'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Tone:</p>
                                    <p className="text-gray-200">{formData.tone || '(Not set)'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Visual Style:</p>
                                    <p className="text-gray-200">{formData.visualStyle || '(Not set)'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-400">Additional Info:</p>
                                    <p className="text-gray-200">{formData.additionalInfo || '(Not set)'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-400">Imagery Description:</p>
                                    <p className="text-gray-200">{formData.imageryDescription || '(Not set)'}</p>
                                </div>
                                {/* Display uploaded images if any */}
                                {(uploadedCampaignImageUrls.get(type)?.length ?? 0) > 0 && (
                                    <div className="col-span-2 mt-2">
                                        <p className="text-gray-400 mb-2">Uploaded Images:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(uploadedCampaignImageUrls.get(type) || []).map((url, i) => (
                                                <div key={i} className="w-16 h-16 relative rounded-md overflow-hidden border border-gray-600">
                                                    {/* Use regular img instead of Next.js Image for Firebase URLs */}
                                                    <img 
                                                        src={url} 
                                                        alt={`Image ${i+1}`} 
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="pt-4 border-t border-gray-700 mt-4 text-center">
                    <p className="text-electric-teal mb-3">Ready to create your amazing postcard designs?</p>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting} 
                        className="px-6 py-3 rounded-md bg-green-500 hover:bg-green-400 text-white shadow-glow hover:shadow-glow-strong transition-all duration-300 disabled:opacity-50 disabled:shadow-none text-lg font-medium"
                    >
                        {isSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Submitting...
                            </span>
                        ) : 'Submit Request'}
                    </button>
                </div>
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-charcoal rounded-lg shadow-xl text-white">
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
                 className="px-4 py-2 rounded bg-charcoal border-2 border-electric-teal text-electric-teal shadow-glow hover:shadow-glow-strong hover:bg-electric-teal/10 transition-all duration-300">
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
                     className={`px-4 py-2 rounded bg-electric-teal shadow-glow text-charcoal hover:shadow-glow-strong hover:bg-electric-teal/90 transition-all duration-300 ${
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
                     className="px-4 py-2 rounded bg-green-500 hover:bg-green-400 shadow-glow hover:shadow-glow-strong transition-all duration-300 disabled:opacity-50">
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
            className="bg-charcoal rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto relative border border-electric-teal/30 shadow-glow"
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
                className="mt-4 px-4 py-2 rounded bg-electric-teal text-charcoal shadow-glow hover:shadow-glow-strong hover:bg-electric-teal/90 transition-all duration-300"
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