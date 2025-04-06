'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext'; // To get the logged-in user
import { useLeadsStore } from '@/store/leadsStore'; // Import the new leads store
import { BrandingData, CampaignDesignData } from '@/types/firestoreTypes'; // Types
import { getBrandDataForUser, addBrandData } from '@/lib/brandingService'; // Service functions
import { addCampaignDesign } from '@/lib/campaignDesignService'; // Import for submit


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
  tone: [],
  visualStyle: [],
  additionalInfo: ''
};

// Props expected by the wizard, including the callback to close it
interface AIHumanWizardProps {
  onBack: () => void;
}

const AIHumanWizard: React.FC<AIHumanWizardProps> = ({ onBack }) => {
  const { user } = useAuth(); // Get user authentication status
  const selectedBusinessTypes = useLeadsStore(state => state.selectedBusinessTypes);
  const businessTypesArray = useMemo(() => Array.from(selectedBusinessTypes), [selectedBusinessTypes]);
  
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
      businessName: '',
      address: '', 
      email: '',
      website: '',
      logoUrl: '', 
      socialMediaHandles: {},
      brandIdentity: '',
      styleComponents: {}
  };
  const [newBrandData, setNewBrandData] = useState(initialBrandFormData);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  // --- End State for Brand Step ---

  // --- State for Campaign Design Step ---
  const [activeCampaignType, setActiveCampaignType] = useState<string | null>(null); // Track active tab/type in multi-mode
  // Store form data for each campaign type if scope is multiple
  const [campaignFormDataMap, setCampaignFormDataMap] = useState<Map<string, Partial<CampaignDesignData>>>(new Map());
  // Track which forms are considered complete for navigation
  const [completedCampaignForms, setCompletedCampaignForms] = useState<Set<string>>(new Set());
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // Changed from isSavingCampaign
  // --- End State for Campaign Design Step ---

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
              initialMap.set(typeKey, { ...initialCampaignFormData });
          } else if (designScope === 'multiple') {
              businessTypesArray.forEach(type => {
                  initialMap.set(type, { ...initialCampaignFormData });
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

  const handleNewBrandInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewBrandData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveNewBrand = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { setBrandError("You must be logged in..."); return; }
    if (!newBrandData.businessName) { setBrandError("Business Name required."); return; }
    setIsSavingBrand(true);
    setBrandError(null);
    try {
      const dataToSave: Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'> = {
        businessName: newBrandData.businessName,
        address: newBrandData.address || undefined, 
        email: newBrandData.email || undefined,
        website: newBrandData.website || undefined,
        logoUrl: newBrandData.logoUrl || undefined,
        socialMediaHandles: newBrandData.socialMediaHandles || undefined,
        brandIdentity: newBrandData.brandIdentity || undefined,
        styleComponents: newBrandData.styleComponents || undefined,
      };
      const savedBrand = await addBrandData(user.uid, dataToSave);
      setUserBrands(prev => [...prev, savedBrand]); 
      setSelectedBrandId(savedBrand.id!); 
      setShowNewBrandForm(false); 
      setNewBrandData(initialBrandFormData); 
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
                tone: formData.tone || [],
                visualStyle: formData.visualStyle || [],
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
                        type="url" id="website" name="website"
                        value={newBrandData.website || ''} onChange={handleNewBrandInputChange}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                      />
                    </div>
                    <div>
                      <label htmlFor="brandIdentity" className="block text-sm font-medium text-gray-300 mb-1">Brand Identity/Notes</label>
                      <textarea 
                        id="brandIdentity" name="brandIdentity" rows={3}
                        value={newBrandData.brandIdentity || ''} onChange={handleNewBrandInputChange}
                        className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"
                      />
                    </div>
                    {/* TODO: Add inputs for address, socialMediaHandles, styleComponents */} 

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
        const currentCampaignData = campaignFormDataMap.get(activeCampaignType || '') || {};
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
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="callToAction" className="block text-sm font-medium text-gray-300 mb-1">Call To Action</label>
                            <input type="text" id="callToAction" name="callToAction" 
                                value={currentCampaignData.callToAction || ''}
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-300 mb-1">Target Audience Description</label>
                            <textarea id="targetAudience" name="targetAudience" rows={3} 
                                value={currentCampaignData.targetAudience || ''}
                                onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} 
                                className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="offer" className="block text-sm font-medium text-gray-300 mb-1">Specific Offer / Promotion</label>
                            <input type="text" id="offer" name="offer" value={currentCampaignData.offer || ''} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="keySellingPoints" className="block text-sm font-medium text-gray-300 mb-1">Key Selling Points (comma-separated)</label>
                            <input type="text" id="keySellingPoints" name="keySellingPoints" value={(currentCampaignData.keySellingPoints || []).join(', ')} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="targetMarketDescription" className="block text-sm font-medium text-gray-300 mb-1">Target Market Description (Optional)</label>
                            <textarea id="targetMarketDescription" name="targetMarketDescription" rows={2} value={currentCampaignData.targetMarketDescription || ''} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div>
                            <label htmlFor="tagline" className="block text-sm font-medium text-gray-300 mb-1">Tagline (Optional)</label>
                            <input type="text" id="tagline" name="tagline" value={currentCampaignData.tagline || ''} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="tone" className="block text-sm font-medium text-gray-300 mb-1">Tone (Optional)</label>
                                <p className="text-xs text-gray-400">(Multi-select placeholder)</p>
                                <input type="text" name="tone" readOnly value={(currentCampaignData.tone || []).join(', ')} className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-gray-400 italic"/>
                            </div>
                            <div>
                                <label htmlFor="visualStyle" className="block text-sm font-medium text-gray-300 mb-1">Visual Style/Aesthetic (Optional)</label>
                                <p className="text-xs text-gray-400">(Multi-select placeholder)</p>
                                <input type="text" name="visualStyle" readOnly value={(currentCampaignData.visualStyle || []).join(', ')} className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-gray-400 italic"/>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-300 mb-1">Additional Information (Optional)</label>
                            <textarea id="additionalInfo" name="additionalInfo" rows={3} value={currentCampaignData.additionalInfo || ''} onChange={(e) => handleCampaignInputChange(e, activeCampaignType)} className="w-full p-2 rounded bg-gray-800 border border-gray-600 focus:border-electric-teal focus:ring-electric-teal"/>
                        </div>

                        {/* Save Button for Multi-Scope */} 
                        {designScope === 'multiple' && (
                           <div className="pt-4 border-t border-gray-600/50 mt-4">
                              <button 
                                 onClick={() => handleMarkCampaignFormComplete(activeCampaignType)}
                                 disabled={completedCampaignForms.has(activeCampaignType)}
                                 className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:bg-gray-500 disabled:cursor-not-allowed"
                              >
                                {completedCampaignForms.has(activeCampaignType) ? 'Details Saved' : 'Save Details for this Type'}
                               </button>
                           </div>
                        )}
                       </>
                    ) : (
                        <p className="text-center text-gray-500">(Select a campaign type above)</p>
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
                            <li>Tone: {(formData.tone || []).join(', ') || '(Not set)'}</li>
                            <li>Visual Style: {(formData.visualStyle || []).join(', ') || '(Not set)'}</li>
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
                className={`px-4 py-2 rounded bg-electric-teal text-charcoal hover:bg-electric-teal/90 transition-colors ${ 
                    ((currentStep === 'brand' && !selectedBrandId) || 
                     (currentStep === 'campaign' && designScope === 'multiple' && completedCampaignForms.size !== businessTypesArray.length) || 
                     (currentStep === 'campaign' && designScope === 'single' && !completedCampaignForms.has(activeCampaignType || '')))
                    ? 'opacity-50 cursor-not-allowed' : ''}`}
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
    </div>
  );
};

export default AIHumanWizard; 