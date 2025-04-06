'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
// import AIDesignWizard from './AIDesignWizard'; // Removed - keeping only AIHumanWizard
import DesignGuideModal from './DesignGuideModal';
import { useRouter } from 'next/navigation';
import { useLeadsStore } from '@/store/leadsStore';

import AIHumanWizard from './AIHumanWizard'; // Keep this one

// Simplify DesignOption type
type DesignOption = 'upload' | 'create' | null; // Renamed 'ai_human' to 'create'

const PostcardDesigner = () => {
  // Simplified state
  const [selectedOption, setSelectedOption] = useState<DesignOption>(null);
  // const [showAIWizard, setShowAIWizard] = useState(false); // Removed
  const [showDesignGuide, setShowDesignGuide] = useState(false);
  const [showAIHumanWizard, setShowAIHumanWizard] = useState(false);

  const router = useRouter();
  const selectedBusinessTypes = useLeadsStore(state => state.selectedBusinessTypes);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('PostcardDesigner Guard Check: selectedBusinessTypes.size =', selectedBusinessTypes.size);
    if (selectedBusinessTypes.size === 0) {
      console.log('PostcardDesigner: No leads found in store, redirecting to home.');
      router.replace('/');
    } else {
      console.log('PostcardDesigner Guard Check: Leads found, setting isLoading to false.');
      setIsLoading(false);
    }
  }, [selectedBusinessTypes, router]);

  if (isLoading) {
    return (
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
            <p className="text-electric-teal">Loading Designer...</p>
        </div>
    );
  }

  // Remove pure AI wizard logic
  // if (showAIWizard) { ... }

  // Keep AIHumanWizard logic
  if (showAIHumanWizard) {
    return <AIHumanWizard onBack={() => setShowAIHumanWizard(false)} />;
  }

  // Simplified designOptions array
  const designOptions = [
    {
      id: 'upload',
      title: 'Upload Your Design',
      description: 'Have your own print-ready artwork? Upload it here.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    },
    {
      id: 'create', // Renamed from 'ai_human'
      title: 'Create Your Design',
      description: 'Use our wizard to input your details. We\'ll generate AI concepts reviewed by an expert.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {/* Robot head + Pencil Icon */}
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 0l-3-3m3 3l-3 3m-1.886 3.944A8.5 8.5 0 113.1 10M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.343 3.343l-5.657 5.657a2 2 0 00-.586 1.414V14h3.586a2 2 0 001.414-.586l5.657-5.657a2 2 0 000-2.828l-.879-.879a2 2 0 00-2.828 0L11.343 3.343z" />
        </svg>
      )
    }
    // Removed 'ai' and 'human' options
  ];

  // Simplified handleContinue
  const handleContinue = () => {
    if (selectedOption === 'upload') {
      setShowDesignGuide(true);
    } else if (selectedOption === 'create') { // Changed from 'ai_human'
      console.log('Starting AI + Human wizard flow');
      setShowAIHumanWizard(true);
    }
  };

  // Render logic mostly the same, but maps over fewer options
  return (
    <div className="min-h-screen bg-charcoal p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-12"> {/* Reduced max-width slightly */}
         {/* Conditionally render the wizard or the selection UI */}
         {showAIHumanWizard ? (
            // Render the NEW wizard
            <AIHumanWizard onBack={() => setShowAIHumanWizard(false)} />
          ) : (
          // Render the simplified design method selection UI
          <>
            <h1 className="text-3xl font-bold text-electric-teal">Choose Your Design Method</h1>
            {/* Changed grid layout for 2 options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {designOptions.map((option) => (
                <motion.div
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-lg border-2 ${selectedOption === option.id ? 'border-electric-teal shadow-glow' : 'border-electric-teal/50'} bg-charcoal p-6 cursor-pointer transition-colors duration-200 hover:border-electric-teal hover:shadow-glow`}
                  onClick={() => setSelectedOption(option.id as DesignOption)}
                >
                  <div className="text-electric-teal mb-4">{option.icon}</div>
                  <h3 className="text-xl font-medium text-electric-teal mb-2">{option.title}</h3>
                  <p className="text-electric-teal/60">{option.description}</p>
                </motion.div>
              ))}
            </div>

            {selectedOption && (
              <div className="flex justify-end">
                <button onClick={handleContinue} className="rounded-lg bg-electric-teal px-6 py-3 text-charcoal hover:bg-electric-teal/90 transition-colors duration-200">
                  {/* Simplified button text */}
                  Continue with {selectedOption === 'upload' ? 'Upload' : 'Create Design'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Keep DesignGuideModal */} 
      <DesignGuideModal 
        isOpen={showDesignGuide}
        onClose={() => setShowDesignGuide(false)}
      />
    </div>
  );

};

export default PostcardDesigner; 