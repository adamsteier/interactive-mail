'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

interface AudienceData {
  industry: string;
  targetDescription: string;
}

interface TargetAudienceProps {
  onComplete: (audienceData: AudienceData) => void;
  initialData?: Partial<AudienceData>;
  segment?: string;
}

const TargetAudience = ({ onComplete, initialData = {}, segment }: TargetAudienceProps) => {
  const businessAnalysis = useMarketingStore(state => state.businessInfo.businessAnalysis);
  
  const [audienceData, setAudienceData] = useState<AudienceData>({
    industry: initialData.industry ?? '',
    targetDescription: initialData.targetDescription ?? ''
  });

  // Pre-fill industry if available from business analysis
  useEffect(() => {
    if (businessAnalysis?.industry && !audienceData.industry) {
      setAudienceData(prev => ({
        ...prev,
        industry: businessAnalysis.industry
      }));
    }
  }, [businessAnalysis, audienceData.industry]);

  const handleSubmit = () => {
    onComplete(audienceData);
  };

  const industrySection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Business Industry</h3>
      <p className="text-electric-teal/70 mb-6">
        What is your business or industry?
      </p>
      
      <input
        type="text"
        value={audienceData.industry}
        onChange={(e) => setAudienceData(prev => ({ ...prev, industry: e.target.value }))}
        placeholder="E.g., Real Estate, Healthcare, Restaurant, Retail, etc."
        className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
          text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
          focus:outline-none transition-colors"
      />
    </motion.div>
  );

  const targetDescriptionSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Target Market Description</h3>
      <p className="text-electric-teal/70 mb-6">
        Briefly describe your ideal customers or target market
      </p>
      
      <textarea
        value={audienceData.targetDescription}
        onChange={(e) => setAudienceData(prev => ({ ...prev, targetDescription: e.target.value }))}
        placeholder="E.g., 'First-time homebuyers in suburban areas' or 'Small business owners seeking accounting services'"
        className="w-full h-32 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
          text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
          focus:outline-none transition-colors"
      />
    </motion.div>
  );

  const isValid = 
    audienceData.industry.trim() !== '' && 
    audienceData.targetDescription.trim() !== '';

  return (
    <div className="max-w-3xl mx-auto px-4">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-electric-teal mb-2">
            Target Audience {segment ? `for ${segment}` : ''}
          </h2>
          <p className="text-electric-teal/70">
            Help us understand who you&apos;re trying to reach with your postcards.
          </p>
        </div>
      </motion.div>

      {industrySection}
      {targetDescriptionSection}

      <div className="flex justify-end mt-8">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-8 py-3 rounded-lg font-medium transition-colors duration-200 
            ${isValid
              ? 'bg-electric-teal text-charcoal hover:bg-electric-teal/90'
              : 'bg-electric-teal/40 text-charcoal/70 cursor-not-allowed'
            }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default TargetAudience; 