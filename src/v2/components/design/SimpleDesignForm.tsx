'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  SimpleDesignRequest,
  detectIndustryFromTypes,
  suggestAudienceFromTypes,
  getIndustryDesignSuggestions,
  validateDesignRequest
} from '../../services/aiDesignService';

interface SimpleDesignFormProps {
  brandId: string;
  businessTypes: string[];
  onSubmit: (request: SimpleDesignRequest) => void;
  onToggleAdvanced: () => void;
  loading?: boolean;
  initialData?: Partial<SimpleDesignRequest>;
}

const SimpleDesignForm = ({
  brandId,
  businessTypes,
  onSubmit,
  onToggleAdvanced,
  loading = false,
  initialData
}: SimpleDesignFormProps) => {
  // Auto-detected values
  const detectedIndustry = detectIndustryFromTypes(businessTypes);
  const audienceSuggestions = suggestAudienceFromTypes(businessTypes);
  const designSuggestions = getIndustryDesignSuggestions(detectedIndustry);

  // Form state
  const [formData, setFormData] = useState<SimpleDesignRequest>({
    brandId,
    voice: initialData?.voice || 'professional',
    goal: initialData?.goal || '',
    industry: initialData?.industry || detectedIndustry,
    audience: initialData?.audience || audienceSuggestions[0] || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState<Record<string, boolean>>({});

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        brandId // Always keep current brandId
      }));
    }
  }, [initialData, brandId]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateDesignRequest(formData);
    if (validation.isValid) {
      setErrors({});
      onSubmit(formData);
    } else {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(error => {
        if (error.includes('Goal')) errorMap.goal = error;
        if (error.includes('Industry')) errorMap.industry = error;
        if (error.includes('audience')) errorMap.audience = error;
      });
      setErrors(errorMap);
    }
  }, [formData, onSubmit]);

  // Handle field changes
  const updateField = useCallback((field: keyof SimpleDesignRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Voice options
  const voiceOptions = [
    { value: 'professional', label: 'Professional', description: 'Trustworthy and authoritative' },
    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
    { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
    { value: 'authoritative', label: 'Authoritative', description: 'Expert and confident' },
    { value: 'creative', label: 'Creative', description: 'Innovative and artistic' }
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#EAEAEA] mb-2">
            Simple Design Mode
          </h2>
          <p className="text-[#EAEAEA]/60 mb-4">
            Quick 5-field form - AI handles all creative decisions
          </p>
          <button
            onClick={onToggleAdvanced}
            className="text-[#00F0FF] hover:text-[#FF00B8] transition-colors text-sm flex items-center gap-1 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Switch to Advanced Mode
          </button>
        </div>

        {/* Auto-detected Info */}
        <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-lg p-4">
          <h3 className="text-[#00F0FF] font-medium mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Auto-detected from your leads
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[#EAEAEA]/60">Industry:</span>
              <span className="text-[#EAEAEA] ml-2">{detectedIndustry}</span>
            </div>
            <div>
              <span className="text-[#EAEAEA]/60">Business Types:</span>
              <span className="text-[#EAEAEA] ml-2 capitalize">
                {businessTypes.map(bt => bt.replace(/_/g, ' ')).join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Voice/Tone */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-3">
              Voice & Tone *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {voiceOptions.map(option => (
                <div
                  key={option.value}
                  className={`
                    cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                    ${formData.voice === option.value
                      ? 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                      : 'border-[#2F2F2F] bg-[#2F2F2F]/30 hover:border-[#00F0FF]/50'
                    }
                  `}
                  onClick={() => updateField('voice', option.value)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${formData.voice === option.value
                        ? 'border-[#00F0FF] bg-[#00F0FF]'
                        : 'border-[#2F2F2F]'
                      }
                    `}>
                      {formData.voice === option.value && (
                        <div className="w-2 h-2 bg-[#1A1A1A] rounded-full" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[#EAEAEA] font-medium">{option.label}</h4>
                      <p className="text-[#EAEAEA]/60 text-sm">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Design Goal *
            </label>
            <div className="relative">
              <textarea
                value={formData.goal}
                onChange={(e) => updateField('goal', e.target.value)}
                className={`
                  w-full px-4 py-3 bg-[#2F2F2F] border rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 
                  focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all resize-none h-24
                  ${errors.goal ? 'border-[#FF00B8]' : 'border-[#2F2F2F]'}
                `}
                placeholder="What do you want to achieve? e.g., Attract new customers, promote seasonal menu, increase appointments..."
                onFocus={() => setShowSuggestions(prev => ({ ...prev, goal: true }))}
              />
              {errors.goal && (
                <p className="text-[#FF00B8] text-sm mt-1">{errors.goal}</p>
              )}
            </div>

            {/* Goal Suggestions */}
            {showSuggestions.goal && designSuggestions.goalSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 bg-[#2F2F2F]/50 rounded-lg p-3 border border-[#00F0FF]/20"
              >
                <p className="text-[#EAEAEA]/60 text-xs mb-2">Suggestions for {detectedIndustry}:</p>
                <div className="flex flex-wrap gap-2">
                  {designSuggestions.goalSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        updateField('goal', suggestion);
                        setShowSuggestions(prev => ({ ...prev, goal: false }));
                      }}
                      className="text-xs bg-[#00F0FF]/20 text-[#00F0FF] px-2 py-1 rounded hover:bg-[#00F0FF]/30 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Industry *
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => updateField('industry', e.target.value)}
              className={`
                w-full px-4 py-3 bg-[#2F2F2F] border rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 
                focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all
                ${errors.industry ? 'border-[#FF00B8]' : 'border-[#2F2F2F]'}
              `}
              placeholder="e.g., Food & Beverage, Automotive, Health & Beauty"
            />
            {errors.industry && (
              <p className="text-[#FF00B8] text-sm mt-1">{errors.industry}</p>
            )}
            <p className="text-[#EAEAEA]/60 text-xs mt-1">
              Auto-detected: {detectedIndustry}
            </p>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Target Audience *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.audience}
                onChange={(e) => updateField('audience', e.target.value)}
                className={`
                  w-full px-4 py-3 bg-[#2F2F2F] border rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 
                  focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all
                  ${errors.audience ? 'border-[#FF00B8]' : 'border-[#2F2F2F]'}
                `}
                placeholder="Who are you trying to reach?"
                onFocus={() => setShowSuggestions(prev => ({ ...prev, audience: true }))}
              />
              {errors.audience && (
                <p className="text-[#FF00B8] text-sm mt-1">{errors.audience}</p>
              )}
            </div>

            {/* Audience Suggestions */}
            {showSuggestions.audience && audienceSuggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-2 bg-[#2F2F2F]/50 rounded-lg p-3 border border-[#00F0FF]/20"
              >
                <p className="text-[#EAEAEA]/60 text-xs mb-2">Suggested audiences:</p>
                <div className="flex flex-wrap gap-2">
                  {audienceSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        updateField('audience', suggestion);
                        setShowSuggestions(prev => ({ ...prev, audience: false }));
                      }}
                      className="text-xs bg-[#00F0FF]/20 text-[#00F0FF] px-2 py-1 rounded hover:bg-[#00F0FF]/30 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-[#00F0FF] text-[#1A1A1A] px-8 py-4 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full"
                  />
                  Generating Design...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate AI Design
                </>
              )}
            </button>
          </div>

          {/* Estimated Time */}
          <div className="text-center text-[#EAEAEA]/60 text-sm">
            Estimated generation time: 30-45 seconds
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SimpleDesignForm; 