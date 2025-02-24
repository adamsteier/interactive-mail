'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

interface AudienceSegmentationProps {
  onComplete: (isSegmented: boolean, segments?: string[]) => void;
}

const AudienceSegmentation = ({ onComplete }: AudienceSegmentationProps) => {
  const selectedBusinessTypes = useMarketingStore(state => state.selectedBusinessTypes);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    console.log('Selected Business Types:', {
      types: Array.from(selectedBusinessTypes),
      count: selectedBusinessTypes.size
    });
  }, [selectedBusinessTypes]);

  // Check if we have multiple business types
  useEffect(() => {
    if (!initialized && selectedBusinessTypes.size > 0) {
      // Only auto-complete if there's exactly one type
      if (selectedBusinessTypes.size === 1) {
        onComplete(false, Array.from(selectedBusinessTypes));
      }
      setInitialized(true);
    }
  }, [selectedBusinessTypes, onComplete, initialized]);

  // If no business types, show an error
  if (selectedBusinessTypes.size === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-6 text-center"
      >
        <h2 className="text-3xl font-bold text-electric-teal mb-4">
          No Business Types Selected
        </h2>
        <p className="text-electric-teal/80">
          Please go back and select some leads before starting the design process.
        </p>
      </motion.div>
    );
  }

  // If only one type, return null (handled by useEffect)
  if (selectedBusinessTypes.size === 1) {
    return null;
  }

  // Show choice for multiple business types
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6"
    >
      <h2 className="text-3xl font-bold text-electric-teal mb-8 text-center">
        Let&apos;s Design Your Campaign
      </h2>
      
      <div className="text-electric-teal/80 text-center mb-12">
        <p>We noticed you&apos;ve selected leads from different business types:</p>
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {Array.from(selectedBusinessTypes).map(type => (
            <span
              key={type}
              className="px-3 py-1 rounded-full border border-electric-teal/30 
                bg-electric-teal/10 text-electric-teal text-sm"
            >
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onComplete(false, Array.from(selectedBusinessTypes))}
          className="relative overflow-hidden rounded-xl border-2 border-electric-teal 
            bg-charcoal p-6 text-left transition-colors hover:bg-electric-teal/5"
        >
          <h3 className="text-xl font-semibold text-electric-teal mb-2">
            One Design For All
          </h3>
          <p className="text-electric-teal/70">
            Create a single postcard design that works for all your selected businesses.
            Simple and unified messaging.
          </p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onComplete(true, Array.from(selectedBusinessTypes))}
          className="relative overflow-hidden rounded-xl border-2 border-electric-teal 
            bg-charcoal p-6 text-left transition-colors hover:bg-electric-teal/5"
        >
          <h3 className="text-xl font-semibold text-electric-teal mb-2">
            Tailored By Segment
          </h3>
          <p className="text-electric-teal/70">
            Create unique designs for each business type. More personalized,
            but requires multiple designs.
          </p>
          <div className="mt-4 text-sm text-electric-teal/60">
            {selectedBusinessTypes.size} designs needed
          </div>
        </motion.button>
      </div>

      <div className="mt-8 text-center text-electric-teal/60">
        <p>You can always change this decision later</p>
      </div>
    </motion.div>
  );
};

export default AudienceSegmentation; 