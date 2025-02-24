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
          className="bg-charcoal rounded-lg border-2 border-electric-teal p-6 max-w-4xl w-full shadow-glow"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="text-2xl font-medium text-electric-teal mb-6">Design Size Guide</h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6 text-electric-teal/80">
              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-3">4X6 Postcard Specifications:</h4>
                <ul className="space-y-2">
                  <li>• 4X6 (152.4mm x 101.6mm + 3mm Bleed Margins)</li>
                  <li>• Image resolution (@300dpi) = 1871 x 1271 pixels</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Trim Marks</h4>
                <p>When printing we print on larger paper and then cut it down to size. We use these guide lines to aim where to cut.</p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Bleed Margins</h4>
                <p>This area is cut off. Make sure background Colour overflows into this margin for an edge to edge design.</p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Safe Zone</h4>
                <p>Keep important text and logos inside the safe zone. This is because printers can sometimes print with a minor skew.</p>
              </div>

              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-2">Clear Zone</h4>
                <p>We need to make sure addresses and barcodes can be machine readable by keeping these areas clear.</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h4 className="text-lg font-medium text-electric-teal mb-4">Download Templates</h4>
                <div className="grid gap-4">
                  <a 
                    href="/images/front.JPG" 
                    download
                    className="flex items-center justify-center rounded-lg border-2 border-electric-teal px-6 py-3 
                      text-electric-teal hover:bg-electric-teal/10 transition-colors duration-200 gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Front Template
                  </a>
                  <a 
                    href="/images/back.JPG" 
                    download
                    className="flex items-center justify-center rounded-lg border-2 border-electric-teal px-6 py-3 
                      text-electric-teal hover:bg-electric-teal/10 transition-colors duration-200 gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Back Template
                  </a>
                </div>
              </div>

              <div className="border-2 border-electric-teal/30 rounded-lg p-4">
                <Image 
                  src="/images/front.JPG"
                  alt="Postcard Template Guide"
                  width={600}
                  height={400}
                  className="rounded-lg"
                />
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
  const collectedLeads = useMarketingStore(state => state.collectedLeads);

  const designOptions = [
    {
      id: 'ai',
      title: 'AI-Generated Design',
      description: 'Let our AI create a stunning postcard design tailored to your business',
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
      description: 'Collaborate with our professional design team to create your perfect postcard',
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
      <div className="max-w-6xl mx-auto space-y-12">
        <h1 className="text-3xl font-bold text-electric-teal">Design Your Postcard</h1>
        
        {/* Upload Option */}
        <div className="relative overflow-hidden rounded-xl border-2 border-electric-teal bg-charcoal/50 p-8">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-semibold text-electric-teal mb-2">Upload Your Design</h2>
              <p className="text-electric-teal/70 max-w-xl">
                Have your own design ready? Upload your artwork following our specifications for the best results.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setIsTemplateModalOpen(true)}
                className="rounded-lg border-2 border-electric-teal px-4 py-2 
                  text-electric-teal hover:bg-electric-teal/10 transition-colors duration-200"
              >
                Design Guide
              </button>
              <button
                onClick={() => setSelectedOption('upload')}
                className="rounded-lg bg-electric-teal px-6 py-2 text-charcoal 
                  hover:bg-electric-teal/90 transition-colors duration-200"
              >
                Upload Files
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-electric-teal">Or Choose an Option Below</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
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
                onClick={() => setSelectedOption(option.id)}
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
        </div>

        {selectedOption && (
          <div className="flex justify-end">
            <button
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

      <TemplateModal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
};

export default PostcardDesigner; 