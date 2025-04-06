'use client';

import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion'; // Temporarily unused
// import AIDesignWizard from './AIDesignWizard'; // Temporarily unused
// import DesignGuideModal from './DesignGuideModal'; // Temporarily unused
import { useRouter } from 'next/navigation';
import { useLeadsStore } from '@/store/leadsStore';

// import AIHumanWizard from './AIHumanWizard'; // Temporarily unused

// Update DesignOption type
// type DesignOption = 'upload' | 'ai' | 'human' | 'ai_human' | null; // Temporarily unused

const PostcardDesigner = () => {
  // Temporarily unused state
  // const [selectedOption, setSelectedOption] = useState<DesignOption>(null);
  // const [showAIWizard, setShowAIWizard] = useState(false);
  // const [showDesignGuide, setShowDesignGuide] = useState(false);
  // const [showAIHumanWizard, setShowAIHumanWizard] = useState(false);

  const router = useRouter();
  const selectedBusinessTypes = useLeadsStore(state => state.selectedBusinessTypes);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    // ADD THIS LOG:
    console.log('PostcardDesigner Guard Check: selectedBusinessTypes.size =', selectedBusinessTypes.size);

    // Guard: Check if leads are selected. If not, redirect.
    if (selectedBusinessTypes.size === 0) {
      console.log('PostcardDesigner: No leads found in store, redirecting to home.');
      router.replace('/'); // Or redirect to leads selection page e.g., '/leads'
    } else {
      console.log('PostcardDesigner Guard Check: Leads found, setting isLoading to false.'); // ADDED FOR CLARITY
      setIsLoading(false); // Leads are present, allow rendering
    }
  }, [selectedBusinessTypes, router]);

  // Prevent rendering until the check is complete
  if (isLoading) {
    return (
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
            <p className="text-electric-teal">Loading Designer...</p>
            {/* Or a spinner component */}
        </div>
    );
  }

  // --- TEMPORARY SIMPLIFIED RENDER FOR DEBUGGING ---
  return (
    <div className="min-h-screen bg-charcoal p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-12">
            <h1 className="text-3xl font-bold text-electric-teal">Postcard Designer Loaded!</h1>
            <p className="text-electric-teal/80">
                If you see this, the component rendered successfully after the guard check.
            </p>
            <p className="text-electric-teal/60">
                Number of business types found in store: {selectedBusinessTypes.size}
            </p>
        </div>
    </div>
  );

  // Original render logic, wizards, options, and handleContinue are temporarily removed below this point for debugging.

  /*
  // These parts are removed for now to ensure the basic component renders
  if (showAIWizard) { ... }
  if (showAIHumanWizard) { ... }
  const designOptions = [ ... ];
  const handleContinue = () => { ... };
  return ( ... original complex JSX ... );
  */

};

export default PostcardDesigner; 