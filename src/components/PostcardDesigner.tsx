'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TemplateModal = ({ isOpen, onClose }: TemplateModalProps) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.95 }}
          className="bg-charcoal rounded-lg border-2 border-electric-teal p-6 max-w-2xl w-full shadow-glow"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-xl font-medium text-electric-teal mb-4">Design Size Guide</h3>
          <div className="space-y-4 text-electric-teal/80">
            <div>
              <h4 className="font-medium mb-2">4X6 Postcard:</h4>
              <ul className="list-disc list-inside space-y-2">
                <li>4X6 (152.4mm x 101.6mm + 3mm Bleed Margins)</li>
                <li>Image resolution (@300dpi) = 1871 x 1271 pixels</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Front Template</h4>
                <a 
                  href="/images/front.JPG" 
                  download
                  className="inline-block rounded-lg border-2 border-electric-teal px-4 py-2 
                    text-electric-teal hover:bg-electric-teal/10 transition-colors duration-200"
                >
                  Download Front
                </a>
              </div>
              <div>
                <h4 className="font-medium mb-2">Back Template</h4>
                <a 
                  href="/images/back.JPG" 
                  download
                  className="inline-block rounded-lg border-2 border-electric-teal px-4 py-2 
                    text-electric-teal hover:bg-electric-teal/10 transition-colors duration-200"
                >
                  Download Back
                </a>
              </div>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-electric-teal hover:text-electric-teal/80"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const PostcardDesigner = () => {
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Get collected leads from store
  const collectedLeads = useMarketingStore(state => state.collectedLeads);

  // Add useEffect to verify leads are available
  useEffect(() => {
    console.log('Collected leads in designer:', collectedLeads);
  }, [collectedLeads]);

  const designOptions = [
    {
      id: 'upload',
      title: 'Upload Your Design',
      description: 'Upload your own custom postcard design',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    },
    {
      id: 'template1',
      title: 'Modern Business',
      description: 'Clean, professional design with logo emphasis',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'template2',
      title: 'Bold Impact',
      description: 'Eye-catching design with strong visual hierarchy',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      )
    },
    {
      id: 'custom',
      title: 'Work with a Designer',
      description: 'Get a custom design from our professional team',
      icon: (
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-charcoal p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-electric-teal mb-8">Choose Your Design</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              onClick={() => {
                setSelectedOption(option.id);
                if (option.id === 'upload') {
                  setIsTemplateModalOpen(true);
                }
              }}
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
          <div className="mt-8 flex justify-end">
            <button
              className="rounded-lg bg-electric-teal px-6 py-3 text-charcoal 
                hover:bg-electric-teal/90 transition-colors duration-200"
            >
              Continue with {
                selectedOption === 'upload' ? 'Upload' :
                selectedOption === 'custom' ? 'Designer' :
                'Template'
              }
            </button>
          </div>
        )}
      </div>

      <TemplateModal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
};

export default PostcardDesigner; 