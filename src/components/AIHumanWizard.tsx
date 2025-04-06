'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext'; // To get the logged-in user
import { useLeadsStore } from '@/store/leadsStore'; // Import the new leads store
import { useMarketingStore } from '@/store/marketingStore'; // Import Marketing Store
import { BrandingData, CampaignDesignData } from '@/types/firestoreTypes'; // Types
import { getBrandDataForUser, addBrandData } from '@/lib/brandingService'; // Service functions
import { addCampaignDesign } from '@/lib/campaignDesignService'; // Import for submit

// Firebase Storage imports
import { storage } from '@/lib/firebase'; // Import storage instance
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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
  // Track which forms are considered complete for navigation
  const [completedCampaignForms, setCompletedCampaignForms] = useState<Set<string>>(new Set());
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Changed from isSavingCampaign
  // State for the Key Selling Points input string (moved from renderStepContent)
  const [keySellingPointsInput, setKeySellingPointsInput] = useState('');
  // --- NEW: State for Info Modal ---
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; content: React.ReactNode } | null>(null);
  // --- END: State for Info Modal ---

  // --- NEW: Helper function to find next incomplete design ---
  const findNextIncompleteDesignType = (currentType: string | null): string | null => {
    if (!currentType || designScope !== 'multiple') return null;

    const currentIndex = businessTypesArray.indexOf(currentType);
    if (currentIndex === -1) return null; // Should not happen

    // Start searching from the next index, wrapping around
    for (let i = 1; i < businessTypesArray.length; i++) {
      const nextIndex = (currentIndex + i) % businessTypesArray.length;
      const nextType = businessTypesArray[nextIndex];
      if (!completedCampaignForms.has(nextType)) {
        return nextType; // Found the next incomplete type
      }
    }

    return null; // All others are complete
  };
  // --- END: Helper function ---

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
  }, [isLoadingInitial, designScope, JSON.stringify(businessTypesArray)]); // Depend on stringified array

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

  const handleMarkCampaignFormComplete = (type: string) => {
      const formData = campaignFormDataMap.get(type);
      if (!formData?.designName) { 
          setCampaignError(`Design Name is required for ${type}.`);
          return false; // Indicate failure
      }
      // Add more validation checks here as needed
      
      setCampaignError(null);
      setCompletedCampaignForms(prevSet => new Set(prevSet).add(type));
      console.log(`Marked form for ${type} as complete.`);
      return true; // Indicate success
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

  // --- NEW: Handlers for Next/Copy Design ---
  const handleGoToNextDesign = () => {
    if (activeCampaignType) {
      const nextType = findNextIncompleteDesignType(activeCampaignType);
      if (nextType) {
        handleTabClick(nextType); // Switch to the next incomplete tab
      } else {
        // Optional: Add feedback if all others are complete or no next one found
        console.log("No further incomplete designs found or already on the last one.");
      }
    }
  };

  const handleCopyInfoToNextDesign = () => {
     if (activeCampaignType) {
        const nextType = findNextIncompleteDesignType(activeCampaignType);
        const currentData = campaignFormDataMap.get(activeCampaignType);

        if (nextType && currentData) {
            setCampaignFormDataMap(prevMap => {
                const newMap = new Map(prevMap);
                // Copy data, ensuring keySellingPoints is a new array if it exists
                const dataToCopy = { 
                    ...currentData, 
                    keySellingPoints: currentData.keySellingPoints ? [...currentData.keySellingPoints] : [] 
                };
                newMap.set(nextType, dataToCopy);
                 // DO NOT mark nextType as complete here
                 // Also remove nextType from completed set if it was somehow there
                 setCompletedCampaignForms(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(nextType);
                    return newSet;
                 });
                return newMap;
            });
            // Automatically switch to the tab where data was copied
            handleTabClick(nextType);
        } else {
             // Optional: Add feedback
             console.log("Could not copy data: No next incomplete design found or current data missing.");
        }
     }
  };
  // --- END: Handlers for Next/Copy Design ---

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
           allFormsValid = handleMarkCampaignFormComplete(activeCampaignType);
       } else if (designScope === 'multiple') {
           // Validate all forms before proceeding from the last step
           for (const type of businessTypesArray) {
               if (!completedCampaignForms.has(type)) {
                   // Try to mark it complete (will set error if invalid)
                   if (!handleMarkCampaignFormComplete(type)) {
                       allFormsValid = false;
                       // Focus the tab with the error if possible? (More complex UI logic)
                       setActiveCampaignType(type); // Switch to the tab with the error
                       break; // Stop checking on first error
                   }
               }
           }
           if (allFormsValid && completedCampaignForms.size !== businessTypesArray.length) {
                // This case should ideally be caught by the loop above setting an error
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
           allFormsValid = handleMarkCampaignFormComplete(activeCampaignType);
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

    try {
        const savedDesignData: CampaignDesignData[] = [];
        const designPromises: Promise<CampaignDesignData>[] = [];

        for (const [typeKey, formData] of campaignFormDataMap.entries()) {
            // Ensure all required fields are present and add brand ID
            const dataToSave: Omit<CampaignDesignData, 'id' | 'createdAt' | 'updatedAt'> = {
                associatedBrandId: selectedBrandId,
                designName: formData.designName || `Design for ${typeKey}`,
                primaryGoal: formData.primaryGoal || '',
                callToAction: formData.callToAction || '',
                targetAudience: formData.targetAudience || '',
                targetMarketDescription: formData.targetMarketDescription || undefined,
                tagline: formData.tagline || undefined,
                offer: formData.offer || undefined,
                keySellingPoints: formData.keySellingPoints || [],
                tone: formData.tone || '',
                visualStyle: formData.visualStyle || '',
                imageryDescription: formData.imageryDescription || undefined, // NEW: Include imagery
                additionalInfo: formData.additionalInfo || undefined,
            };
            // Important: Use addCampaignDesign service function
            designPromises.push(addCampaignDesign(user.uid, dataToSave));
        }
        
        savedDesignData.push(...await Promise.all(designPromises));
        console.log("Saved CampaignDesignData documents:", savedDesignData);

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
        console.log("Placeholder: Triggering AI processing...");

        console.log("Submission successful (Data saved to user subcollection)");
        // For now, just log success and go back
         alert("Design request submitted successfully! (Placeholder - AI processing not yet implemented)");
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
                                <img src={logoPreviewUrl} alt="Logo Preview" className="h-10 w-auto rounded border border-gray-600 shrink-0" />
                            )}
                            {/* Display Final Uploaded Logo if no preview */} 
                            {!logoPreviewUrl && newBrandData.logoUrl && (
                                 <img src={newBrandData.logoUrl} alt="Uploaded Logo" className="h-10 w-auto rounded border border-green-500 shrink-0" />
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
        // --- Campaign Design UI (Step 2 or 3) ---
        const currentCampaignTypeKey = activeCampaignType || (designScope === 'single' ? '__single__' : null);
        const currentCampaignData = currentCampaignTypeKey ? campaignFormDataMap.get(currentCampaignTypeKey) || {} : {};

        // *** Handler specifically for the Key Selling Points input ***
        const handleKeySellingPointsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
            const rawValue = event.target.value;
            // 1. Update the local string state for the input field
            setKeySellingPointsInput(rawValue);

            // 2. Update the underlying array state in the main map
            const pointsArray = rawValue.split(',').map(s => s.trim()).filter(s => s !== '');
            
            if (currentCampaignTypeKey) {
                 setCampaignFormDataMap(prevForms => {
                    const updatedForms = new Map(prevForms);
                    const currentFormData = updatedForms.get(currentCampaignTypeKey) || { ...initialCampaignFormData };
                    updatedForms.set(currentCampaignTypeKey, {
                        ...currentFormData,
                        keySellingPoints: pointsArray, // Update the array here
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
                        const isComplete = completedCampaignForms.has(type);
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
                                {/* Status Indicator */} 
                                <span className={`w-2 h-2 rounded-full ${ 
                                    isComplete ? 'bg-green-500' : isActive ? 'bg-yellow-500' : 'bg-gray-500' 
                                }`} /> 
                                {type}
                                {/* Placeholder for thumbnail */} 
                                <div className="w-4 h-4 bg-gray-600 rounded-sm ml-1 hidden"></div> 
                            </button>
                        );
                    })}
                </div>
             )}

            {/* Campaign Form Area */} 
            <div> 
                <h3 className="text-lg font-semibold mb-3 text-electric-teal/90">
                    Define Campaign Design Details 
                    {designScope === 'multiple' && activeCampaignType && ` for: ${activeCampaignType}`}
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    Using Brand: {userBrands.find(b => b.id === selectedBrandId)?.businessName || 'Unknown'}
                </p>
                {campaignError && <p className="text-red-400 mb-4">{campaignError}</p>} 

                {/* Actual Form Fields */} 
                <div className="bg-gray-700 p-4 rounded-lg space-y-4">
                    {/* Render form only if activeCampaignType is valid */} 
                    {activeCampaignType ? (
                       <> 
                        <div>
                            <label htmlFor="designName" className="block text-sm font-medium text-gray-300 mb-1">Design Name *</label>
                            <input type="text" id="designName" name="designName" 
                                value={currentCampaignData.designName || ''}
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} required 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="primaryGoal" className="block text-sm font-medium text-gray-300 mb-1">Primary Goal</label>
                            <input type="text" id="primaryGoal" name="primaryGoal" 
                                value={currentCampaignData.primaryGoal || ''}
                                placeholder={`e.g., Get more ${activeCampaignType || 'customers'} to book consultations`}
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="callToAction" className="block text-sm font-medium text-gray-300 mb-1">Call To Action</label>
                            <input type="text" id="callToAction" name="callToAction" 
                                value={currentCampaignData.callToAction || ''}
                                placeholder={`e.g., Visit ${userBrands.find(b => b.id === selectedBrandId)?.businessName || 'our website'}.com, Call Now for a Quote, Book Your Appointment`}
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-300 mb-1">Target Audience Description</label>
                            <textarea id="targetAudience" name="targetAudience" rows={3} 
                                value={currentCampaignData.targetAudience || ''}
                                placeholder={designScope === 'multiple' ? `Describe the ideal ${activeCampaignType || 'customer'} (e.g., homeowners needing tax help, local restaurants seeking bookkeeping).` : 'Describe the ideal customer across all types (e.g., small business owners in St. Albert).'}
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="offer" className="block text-sm font-medium text-gray-300 mb-1">Specific Offer / Promotion</label>
                            <input type="text" id="offer" name="offer" value={currentCampaignData.offer || ''} placeholder="e.g., 10% Off First Service, Free Initial Consultation, Mention This Card for..." onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="keySellingPoints" className="block text-sm font-medium text-gray-300 mb-1">Key Selling Points (comma-separated)</label>
                            <input 
                                type="text" 
                                id="keySellingPoints" 
                                name="keySellingPoints" 
                                // *** Value bound to local string state ***
                                value={keySellingPointsInput} 
                                // *** Use the specific handler ***
                                onChange={handleKeySellingPointsChange} 
                                placeholder="e.g., Saves Time, Reduces Errors, Expert Advice, Local & Trusted" 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                            />
                        </div>
                        <div>
                            <label htmlFor="targetMarketDescription" className="block text-sm font-medium text-gray-300 mb-1">Target Market Description (Optional)</label>
                            <textarea id="targetMarketDescription" name="targetMarketDescription" rows={2} value={currentCampaignData.targetMarketDescription || ''} placeholder={`e.g., Focus on ${activeCampaignType || 'businesses'} in the downtown core, Target new homeowners in the area`} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="tagline" className="block text-sm font-medium text-gray-300 mb-1">Tagline (Optional)</label>
                            <input type="text" id="tagline" name="tagline" value={currentCampaignData.tagline || ''} placeholder="Your catchy business slogan" onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-1">Tone (Optional)</label>
                                <p className="text-xs text-gray-400 mb-1">(Keywords help the AI)</p>
                                <input type="text" name="tone" placeholder="e.g., Professional, Friendly, Urgent, Calm, Humorous" value={currentCampaignData.tone || ''} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600"/>
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
                                <input type="text" name="visualStyle" placeholder="e.g., Modern, Minimalist, Bold, Vintage, Playful, Elegant" value={currentCampaignData.visualStyle || ''} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600"/>
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
                            <textarea id="additionalInfo" name="additionalInfo" rows={3} value={currentCampaignData.additionalInfo || ''} placeholder="Anything else? e.g., Must include our phone number prominently. Use image of happy clients. Avoid red color." onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        {/* NEW: Imagery Description */}
                        <div>
                            <label htmlFor="imageryDescription" className="block text-sm font-medium text-gray-300 mb-1">Describe Desired Imagery (Optional)</label>
                            <textarea 
                                id="imageryDescription" 
                                name="imageryDescription" 
                                rows={3} 
                                value={currentCampaignData.imageryDescription || ''} 
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} 
                                placeholder="e.g., A friendly photo of our team, a picture of a beautifully renovated kitchen, abstract graphic representing growth, a simple illustration of a house with a sold sign."
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                            />
                        </div>
                        <div>
                            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-300 mb-1">Additional Information (Optional)</label>
                            <textarea id="additionalInfo" name="additionalInfo" rows={3} value={currentCampaignData.additionalInfo || ''} placeholder="Anything else? e.g., Must include our phone number prominently. Use image of happy clients. Avoid red color." onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>

                        {/* Save Button for Multi-Scope or Single Scope Validation */} 
                        {designScope === 'multiple' && activeCampaignType && (
                           <div className="pt-4 border-t border-gray-600/50 mt-4 flex flex-wrap gap-2 justify-between items-center">
                              <button 
                                 onClick={() => handleMarkCampaignFormComplete(activeCampaignType)}
                                 disabled={completedCampaignForms.has(activeCampaignType)}
                                 className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:bg-gray-500 disabled:cursor-not-allowed"
                              >
                                {completedCampaignForms.has(activeCampaignType) ? '✓ Details Saved' : 'Save Details for this Type'}
                               </button>
                               
                               {/* NEW: Next/Copy Buttons */} 
                               <div className="flex gap-2">
                                 <button 
                                    type="button"
                                    onClick={handleCopyInfoToNextDesign}
                                    disabled={!findNextIncompleteDesignType(activeCampaignType)} // Disable if no next incomplete
                                    className="px-3 py-1.5 rounded bg-gray-500 hover:bg-gray-400 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={!findNextIncompleteDesignType(activeCampaignType) ? "All other designs are marked complete" : "Copy current details to the next incomplete design"}
                                 >
                                    Copy to Next
                                 </button>
                                 <button 
                                     type="button"
                                     onClick={handleGoToNextDesign}
                                     disabled={!findNextIncompleteDesignType(activeCampaignType)} // Disable if no next incomplete
                                     className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                     title={!findNextIncompleteDesignType(activeCampaignType) ? "All other designs are marked complete" : "Go to next incomplete design"}
                                 >
                                     Next Design →
                                 </button>
                               </div>
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
            <p className="text-gray-300 mb-4">
              Review the details below before submitting the request.
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
                            <li>Imagery Notes: {formData.imageryDescription || '(Not set)'}</li>
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
         <div className="flex justify-between mt-8 pt-4 border-t border-gray-700">
            {/* Back Button */} 
            {(currentStep !== 'design_choice') && ( // Always show back unless on first step
              <button 
                onClick={handlePrevious} 
                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 transition-colors">
                {currentStep === 'brand' && designScope === 'single' ? 'Back to Options' : 'Previous'}
              </button>
            )}
             {(currentStep === 'design_choice') && <div />} {/* Placeholder if needed */}

            {/* Next Button */} 
            {(currentStep === 'brand' || currentStep === 'campaign') && (
              <button 
                onClick={handleNext} 
                disabled={
                    (currentStep === 'brand' && !selectedBrandId) ||
                    (currentStep === 'campaign' && designScope === 'multiple' && completedCampaignForms.size !== businessTypesArray.length) ||
                    (currentStep === 'campaign' && designScope === 'single' && !completedCampaignForms.has(activeCampaignType || '')) // Add check for single scope completion
                } 
                className={`px-4 py-2 rounded bg-electric-teal text-charcoal hover:bg-electric-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`} 
                // NEW: Tooltip for disabled state in multi-design campaign step
                title={
                  (currentStep === 'campaign' && designScope === 'multiple' && completedCampaignForms.size !== businessTypesArray.length)
                    ? `Please save details for all ${businessTypesArray.length} designs before proceeding.`
                    : (currentStep === 'brand' && !selectedBrandId) 
                    ? 'Please select or create a brand profile first.'
                    : '' // No title needed if enabled
                }
              >
                Next
              </button>
            )}

            {/* Submit Button */} 
            {currentStep === 'review' && (
              <button 
                onClick={handleSubmit} 
                disabled={isSubmitting} // Disable while submitting
                className="px-4 py-2 rounded bg-green-500 hover:bg-green-400 transition-colors disabled:opacity-50">
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            )}
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