'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type MarketingObjective = 'awareness' | 'promotion' | 'traffic' | 'event' | 'other';

interface MarketingData {
  objectives: MarketingObjective[];
  otherObjective: string;
  callToAction: string;
  useAiCta: boolean;
}

interface MarketingGoalsProps {
  onComplete: (marketingData: MarketingData) => void;
  initialData?: Partial<MarketingData>;
}

const objectiveOptions: { id: MarketingObjective; label: string; description: string }[] = [
  {
    id: 'awareness',
    label: 'Brand Awareness',
    description: 'Introduce your business and services to potential customers'
  },
  {
    id: 'promotion',
    label: 'Promote a Sale/Discount',
    description: 'Highlight special offers, discounts, or limited-time promotions'
  },
  {
    id: 'traffic',
    label: 'Drive Website Traffic',
    description: 'Encourage recipients to visit your website or online platform'
  },
  {
    id: 'event',
    label: 'Announce an Event',
    description: 'Promote an upcoming event, grand opening, or special occasion'
  },
  {
    id: 'other',
    label: 'Other Goal',
    description: 'Define your own custom marketing objective'
  }
];

const aiGeneratedCtas: Record<MarketingObjective, string[]> = {
  awareness: [
    'Discover what makes us different',
    'See why customers choose us',
    'Find out how we can help you today'
  ],
  promotion: [
    'Claim your special offer today',
    'Don&apos;t miss this limited-time deal',
    'Save big when you act now'
  ],
  traffic: [
    'Visit our website for exclusive content',
    'Explore our full selection online',
    'Learn more at our website'
  ],
  event: [
    'Join us for this special occasion',
    'Save the date and be part of the experience',
    'RSVP today to secure your spot'
  ],
  other: [
    'Take the next step today',
    'Contact us to learn more',
    'Let&apos;s start a conversation'
  ]
};

const MarketingGoals = ({ onComplete, initialData = {} }: MarketingGoalsProps) => {
  const [marketingData, setMarketingData] = useState<MarketingData>({
    objectives: initialData.objectives ?? [],
    otherObjective: initialData.otherObjective ?? '',
    callToAction: initialData.callToAction ?? '',
    useAiCta: initialData.useAiCta ?? false
  });

  const [showAiCtas, setShowAiCtas] = useState(false);
  const [selectedCta, setSelectedCta] = useState<string | null>(null);

  const toggleObjective = (objective: MarketingObjective) => {
    setMarketingData(prev => {
      const newObjectives = prev.objectives.includes(objective)
        ? prev.objectives.filter(o => o !== objective)
        : [...prev.objectives, objective];
      
      return {
        ...prev,
        objectives: newObjectives
      };
    });
  };

  const handleSubmit = () => {
    onComplete(marketingData);
  };

  const handleGenerateCtas = () => {
    setShowAiCtas(true);
  };

  const handleSelectCta = (cta: string) => {
    setSelectedCta(cta);
    setMarketingData(prev => ({
      ...prev,
      callToAction: cta,
      useAiCta: true
    }));
  };

  const objectivesSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Primary Goal</h3>
      <p className="text-electric-teal/70 mb-6">
        What is the primary goal of your postcard? (Choose one or more)
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {objectiveOptions.map(option => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleObjective(option.id)}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              marketingData.objectives.includes(option.id)
                ? 'border-electric-teal bg-electric-teal/10'
                : 'border-electric-teal/30 hover:border-electric-teal/70'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${marketingData.objectives.includes(option.id) 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {marketingData.objectives.includes(option.id) && (
                  <div className="w-3 h-3 rounded-full bg-electric-teal"></div>
                )}
              </div>
              <h4 className="text-lg font-medium text-electric-teal">{option.label}</h4>
            </div>
            <p className="text-electric-teal/70 text-sm pl-7">{option.description}</p>
          </motion.div>
        ))}
      </div>

      {marketingData.objectives.includes('other') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6"
        >
          <input
            type="text"
            value={marketingData.otherObjective}
            onChange={(e) => setMarketingData(prev => ({ ...prev, otherObjective: e.target.value }))}
            placeholder="Please describe your specific marketing objective"
            className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </motion.div>
      )}
    </motion.div>
  );

  const ctaSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Call to Action (CTA)</h3>
      <p className="text-electric-teal/70 mb-6">
        What action do you want recipients to take?
      </p>
      
      <div className="mb-6">
        <input
          type="text"
          value={marketingData.callToAction}
          onChange={(e) => setMarketingData(prev => ({ ...prev, callToAction: e.target.value, useAiCta: false }))}
          placeholder="E.g., 'Visit our website', 'Call us today', 'Scan this QR code'"
          className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
            text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
            focus:outline-none transition-colors"
        />
      </div>

      {!showAiCtas ? (
        <button
          onClick={handleGenerateCtas}
          className="text-electric-teal hover:text-electric-teal/80 flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Need help wording your CTA? Click for AI suggestions
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4"
        >
          <h4 className="text-electric-teal mb-3">AI-Suggested Call to Actions:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {marketingData.objectives.map(objective => (
              <div key={objective} className="space-y-2">
                {aiGeneratedCtas[objective].map((cta, index) => (
                  <motion.div
                    key={`${objective}-${index}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectCta(cta)}
                    className={`p-3 rounded-lg border cursor-pointer
                      ${selectedCta === cta 
                        ? 'border-electric-teal bg-electric-teal/10' 
                        : 'border-electric-teal/30 hover:border-electric-teal/60'}`}
                  >
                    <p className="text-electric-teal">{cta}</p>
                    <p className="text-xs text-electric-teal/60">Based on: {objectiveOptions.find(o => o.id === objective)?.label}</p>
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );

  const isValid = 
    marketingData.objectives.length > 0 && 
    (marketingData.objectives.includes('other') ? marketingData.otherObjective.trim() !== '' : true) &&
    marketingData.callToAction.trim() !== '';

  return (
    <div className="max-w-3xl mx-auto px-4">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-electric-teal mb-2">
            Marketing Objectives
          </h2>
          <p className="text-electric-teal/70">
            Define the purpose of your postcard campaign and what action you want recipients to take.
          </p>
        </div>
      </motion.div>

      {objectivesSection}
      {ctaSection}

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

export default MarketingGoals; 