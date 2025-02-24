'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

interface AudienceSegmentationProps {
  onComplete: (isSegmented: boolean, segments?: string[]) => void;
}

const AudienceSegmentation = ({ onComplete }: AudienceSegmentationProps) => {
  const collectedLeads = useMarketingStore(state => state.collectedLeads);
  const [showSegmentChoice, setShowSegmentChoice] = useState(false);
  const [uniqueBusinessTypes, setUniqueBusinessTypes] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Check if we have multiple business types
  useEffect(() => {
    if (!initialized && collectedLeads.length > 0) {
      const types = Array.from(new Set(collectedLeads.map(lead => lead.businessType)));
      setUniqueBusinessTypes(types);
      setShowSegmentChoice(types.length > 1);
      
      // Only auto-complete if there's exactly one type
      if (types.length === 1) {
        onComplete(false);
      }
      
      setInitialized(true);
    }
  }, [collectedLeads, onComplete, initialized]);

  // If no leads, show an error or redirect
  if (collectedLeads.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-6 text-center"
      >
        <h2 className="text-3xl font-bold text-electric-teal mb-4">
          No Leads Selected
        </h2>
        <p className="text-electric-teal/80">
          Please go back and select some leads before starting the design process.
        </p>
      </motion.div>
    );
  }

  if (!showSegmentChoice) {
    return null;
  }

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
          {uniqueBusinessTypes.map(type => (
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
          onClick={() => onComplete(false)}
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
          onClick={() => onComplete(true, uniqueBusinessTypes)}
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
            {uniqueBusinessTypes.length} designs needed
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