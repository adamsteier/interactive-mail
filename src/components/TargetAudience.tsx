'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

interface AudienceData {
  industry: string;
  targetDescription: string;
  audienceAgeRange: string[];
  incomeLevel: string[];
  interests: string[];
  customAudience: boolean;
  customAudienceDescription: string;
}

interface TargetAudienceProps {
  onComplete: (audienceData: AudienceData) => void;
  initialData?: Partial<AudienceData>;
  segment?: string;
}

// Age range options
const ageRangeOptions = [
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45-54', label: '45-54' },
  { id: '55-64', label: '55-64' },
  { id: '65+', label: '65+' }
];

// Income level options
const incomeLevelOptions = [
  { id: 'low', label: 'Budget-conscious' },
  { id: 'medium', label: 'Middle income' },
  { id: 'high', label: 'Affluent' },
  { id: 'luxury', label: 'Luxury/Premium' }
];

// Interest categories
const interestOptions = [
  { id: 'health', label: 'Health & Wellness' },
  { id: 'tech', label: 'Technology' },
  { id: 'home', label: 'Home & Family' },
  { id: 'fashion', label: 'Fashion & Beauty' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'travel', label: 'Travel & Adventure' },
  { id: 'sports', label: 'Sports & Fitness' },
  { id: 'finance', label: 'Finance & Investment' },
  { id: 'education', label: 'Education & Learning' },
  { id: 'arts', label: 'Arts & Entertainment' }
];

const TargetAudience = ({ onComplete, initialData = {}, segment }: TargetAudienceProps) => {
  const businessAnalysis = useMarketingStore(state => state.businessInfo.businessAnalysis);
  
  const [audienceData, setAudienceData] = useState<AudienceData>({
    industry: initialData.industry ?? '',
    targetDescription: initialData.targetDescription ?? '',
    audienceAgeRange: initialData.audienceAgeRange ?? [],
    incomeLevel: initialData.incomeLevel ?? [],
    interests: initialData.interests ?? [],
    customAudience: initialData.customAudience ?? false,
    customAudienceDescription: initialData.customAudienceDescription ?? ''
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

  const toggleAgeRange = (range: string) => {
    setAudienceData(prev => {
      const newRanges = prev.audienceAgeRange.includes(range)
        ? prev.audienceAgeRange.filter(r => r !== range)
        : [...prev.audienceAgeRange, range];
      
      return {
        ...prev,
        audienceAgeRange: newRanges
      };
    });
  };

  const toggleIncomeLevel = (level: string) => {
    setAudienceData(prev => {
      const newLevels = prev.incomeLevel.includes(level)
        ? prev.incomeLevel.filter(l => l !== level)
        : [...prev.incomeLevel, level];
      
      return {
        ...prev,
        incomeLevel: newLevels
      };
    });
  };

  const toggleInterest = (interest: string) => {
    setAudienceData(prev => {
      const newInterests = prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest];
      
      return {
        ...prev,
        interests: newInterests
      };
    });
  };

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

  const demographicsSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Demographics</h3>
      
      <div className="mb-8">
        <h4 className="text-lg text-electric-teal mb-3">Age Range (select all that apply)</h4>
        <div className="flex flex-wrap gap-3">
          {ageRangeOptions.map(age => (
            <button
              key={age.id}
              onClick={() => toggleAgeRange(age.id)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors duration-200 ${
                audienceData.audienceAgeRange.includes(age.id)
                  ? 'bg-electric-teal text-charcoal border-electric-teal'
                  : 'border-electric-teal/50 text-electric-teal hover:border-electric-teal'
              }`}
            >
              {age.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-lg text-electric-teal mb-3">Income Level (select all that apply)</h4>
        <div className="flex flex-wrap gap-3">
          {incomeLevelOptions.map(income => (
            <button
              key={income.id}
              onClick={() => toggleIncomeLevel(income.id)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors duration-200 ${
                audienceData.incomeLevel.includes(income.id)
                  ? 'bg-electric-teal text-charcoal border-electric-teal'
                  : 'border-electric-teal/50 text-electric-teal hover:border-electric-teal'
              }`}
            >
              {income.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  const interestsSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Interests & Lifestyle</h3>
      <p className="text-electric-teal/70 mb-6">
        Select interests relevant to your target audience (optional)
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {interestOptions.map(interest => (
          <button
            key={interest.id}
            onClick={() => toggleInterest(interest.id)}
            className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors duration-200 ${
              audienceData.interests.includes(interest.id)
                ? 'bg-electric-teal text-charcoal border-electric-teal'
                : 'border-electric-teal/50 text-electric-teal hover:border-electric-teal'
            }`}
          >
            {interest.label}
          </button>
        ))}
      </div>
    </motion.div>
  );

  const customAudienceSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mb-10"
    >
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setAudienceData(prev => ({ 
            ...prev, 
            customAudience: !prev.customAudience,
            customAudienceDescription: !prev.customAudience ? prev.customAudienceDescription : ''
          }))}
          className="w-6 h-6 rounded-md border-2 border-electric-teal flex items-center justify-center"
        >
          {audienceData.customAudience && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 bg-electric-teal rounded-sm"
            />
          )}
        </button>
        <h3 className="text-xl font-semibold text-electric-teal">
          I have a custom audience segment
        </h3>
      </div>
      
      {audienceData.customAudience && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pl-9"
        >
          <p className="text-electric-teal/70 mb-4">
            Describe your specific audience segment in detail
          </p>
          <textarea
            value={audienceData.customAudienceDescription}
            onChange={(e) => setAudienceData(prev => ({ 
              ...prev, 
              customAudienceDescription: e.target.value 
            }))}
            placeholder="Describe your custom audience segment in detail (demographics, behaviors, preferences, etc.)"
            className="w-full h-32 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </motion.div>
      )}
    </motion.div>
  );

  const isValid = 
    audienceData.industry.trim() !== '' && 
    audienceData.targetDescription.trim() !== '' &&
    audienceData.audienceAgeRange.length > 0 &&
    audienceData.incomeLevel.length > 0 &&
    (!audienceData.customAudience || (audienceData.customAudience && audienceData.customAudienceDescription.trim() !== ''));

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
      {demographicsSection}
      {interestsSection}
      {customAudienceSection}

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