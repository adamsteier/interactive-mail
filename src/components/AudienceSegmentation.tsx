'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

interface AudienceSegmentationProps {
  onComplete: (isSegmented: boolean, segments?: string[]) => void;
}

const AudienceSegmentation = ({ onComplete }: AudienceSegmentationProps) => {
  const selectedBusinessTypes = useMarketingStore(state => state.selectedBusinessTypes);

  useEffect(() => {
    console.log('Selected Business Types:', {
      types: Array.from(selectedBusinessTypes),
      count: selectedBusinessTypes.size
    });
  }, [selectedBusinessTypes]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6"
    >
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-electric-teal mb-4 text-center">
          Selected Business Types
        </h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {Array.from(selectedBusinessTypes).map(type => (
            <div
              key={type}
              className="px-4 py-2 rounded-lg border-2 border-electric-teal/30 
                bg-electric-teal/10 text-electric-teal"
            >
              {type}
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-2xl font-bold text-electric-teal mb-8 text-center">
        How would you like to design your campaign?
      </h3>
      
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