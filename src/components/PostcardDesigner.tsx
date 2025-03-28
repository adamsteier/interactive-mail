'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import AIDesignWizard from './AIDesignWizard';
import DesignGuideModal from './DesignGuideModal';

type DesignOption = 'upload' | 'ai' | 'human' | null;

const PostcardDesigner = () => {
  const [selectedOption, setSelectedOption] = useState<DesignOption>(null);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [showDesignGuide, setShowDesignGuide] = useState(false);

  if (showAIWizard) {
    return <AIDesignWizard onBack={() => setShowAIWizard(false)} />;
  }

  const designOptions = [
    {
      id: 'upload',
      title: 'Upload Your Design',
      description: 'Have your own design ready? Upload your artwork following our specifications.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    },
    {
      id: 'ai',
      title: 'AI-Generated Design',
      description: 'Let our AI create a stunning postcard design tailored to your business.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    {
      id: 'human',
      title: 'Work with a Designer',
      description: 'Collaborate with our professional design team to create your perfect postcard.',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    }
  ];

  const handleContinue = () => {
    if (selectedOption === 'ai') {
      setShowAIWizard(true);
    } else if (selectedOption === 'upload') {
      setShowDesignGuide(true);
    } else if (selectedOption === 'human') {
      // Handle human designer flow
      console.log('Starting human designer flow');
    }
  };

  return (
    <div className="min-h-screen bg-charcoal p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-3xl font-bold text-electric-teal">Choose Your Design Method</h1>
        
        <div className="grid md:grid-cols-3 gap-6">
          {designOptions.map((option) => (
            <motion.div
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`rounded-lg border-2 ${
                selectedOption === option.id 
                  ? 'border-electric-teal shadow-glow' 
                  : 'border-electric-teal/50'
              } bg-charcoal p-6 cursor-pointer transition-colors duration-200
                hover:border-electric-teal hover:shadow-glow`}
              onClick={() => setSelectedOption(option.id as DesignOption)}
            >
              <div className="text-electric-teal mb-4">
                {option.icon}
              </div>
              <h3 className="text-xl font-medium text-electric-teal mb-2">
                {option.title}
              </h3>
              <p className="text-electric-teal/60">
                {option.description}
              </p>
            </motion.div>
          ))}
        </div>

        {selectedOption && (
          <div className="flex justify-end">
            <button
              onClick={handleContinue}
              className="rounded-lg bg-electric-teal px-6 py-3 text-charcoal 
                hover:bg-electric-teal/90 transition-colors duration-200"
            >
              Continue with {
                selectedOption === 'upload' ? 'Upload' :
                selectedOption === 'ai' ? 'AI Design' :
                'Designer'
              }
            </button>
          </div>
        )}
      </div>

      <DesignGuideModal 
        isOpen={showDesignGuide}
        onClose={() => setShowDesignGuide(false)}
      />
    </div>
  );
};

export default PostcardDesigner; 