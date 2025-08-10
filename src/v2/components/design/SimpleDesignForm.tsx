'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SimpleDesignRequest,
  validateDesignRequest
} from '../../services/aiDesignService';

interface BusinessTypeWithCount {
  type: string;
  count: number;
}

interface SimpleDesignFormProps {
  brandId: string;
  businessTypes: BusinessTypeWithCount[];
  availableBusinessTypes: BusinessTypeWithCount[]; // All business types from campaign
  campaignId: string;
  onSubmit: (request: SimpleDesignRequest) => void;
  onToggleAdvanced: () => void;
  loading?: boolean;
  initialData?: Partial<SimpleDesignRequest>;
  initialIndustry?: string;
  initialDescription?: string;
  onBusinessTypesChange?: (businessTypes: BusinessTypeWithCount[]) => void;
  onBusinessDescriptionChange?: (description: string) => void;
}

/* Goal examples organized by category
const goalExamples = {
  promotions: [
    '10% off first visit',
    '20% discount this month',
    'Buy one get one free',
    'Limited time offer',
    'Free consultation',
    '50% off second service'
  ],
  announcements: [
    'Grand opening',
    'New location',
    'Now hiring',
    'New services/products available',
    'Under new management',
    'Celebrating 10 years'
  ],
  seasonal: [
    'Holiday specials',
    'Summer promotion',
    'Back to school offer',
    'End of year sale',
    'Spring cleaning special',
    'Black Friday deals'
  ],
  engagement: [
    'Join our loyalty program',
    'Follow us on social media',
    'Book your appointment today',
    'Visit our website',
    'Call for free quote',
    'Schedule consultation'
  ]
}; */

const SimpleDesignForm = ({
  brandId,
  businessTypes: initialBusinessTypes,
  availableBusinessTypes,
  // campaignId,
  onSubmit,
  onToggleAdvanced,
  loading = false,
  initialData,
  initialIndustry,
  initialDescription,
  onBusinessTypesChange,
  onBusinessDescriptionChange
}: SimpleDesignFormProps) => {
  // Business types state
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeWithCount[]>(initialBusinessTypes);
  const [showAddBusinessTypes, setShowAddBusinessTypes] = useState(false);
  
  // Business description state
  const [businessDescription, setBusinessDescription] = useState(initialDescription || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Form state
  const [formData, setFormData] = useState<SimpleDesignRequest>({
    brandId,
    voice: initialData?.voice || 'professional',
    goal: initialData?.goal || '',
    industry: initialData?.industry || initialIndustry || '',
    audience: initialData?.audience || businessTypes.map(bt => bt.type.replace(/_/g, ' ')).join(', ')
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showGoalSuggestions, setShowGoalSuggestions] = useState(false);
  const [goalSuggestions, setGoalSuggestions] = useState<string[]>([]);
  const [loadingGoalSuggestions, setLoadingGoalSuggestions] = useState(false);
  const [imageryDescription, setImageryDescription] = useState('');
  const [showImageryField, setShowImageryField] = useState(false);
  const [customAudience, setCustomAudience] = useState(false);

  // Refs for autoscroll to invalid fields
  const businessTypesRef = useRef<HTMLDivElement>(null);
  const industryInputRef = useRef<HTMLInputElement>(null);
  const goalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const audienceContainerRef = useRef<HTMLDivElement>(null);
  const audienceInputRef = useRef<HTMLInputElement>(null);

  // Update form when initial data changes
  useEffect(() => {
    if (initialData || initialIndustry || initialDescription) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        industry: initialData?.industry || initialIndustry || prev.industry,
        brandId // Always keep current brandId
      }));
    }
  }, [initialData, brandId, initialIndustry, initialDescription]);

  // Update audience when business types change
  useEffect(() => {
    if (!customAudience) {
      setFormData(prev => ({
        ...prev,
        audience: businessTypes.map(bt => bt.type.replace(/_/g, ' ')).join(', ') + ' businesses'
      }));
    }
  }, [businessTypes, customAudience]);

  // Campaign goal suggestions
  const fetchGoalSuggestions = useCallback(async () => {
    if (!formData.industry || formData.industry.length < 2) return;
    
    setLoadingGoalSuggestions(true);
    try {
      const response = await fetch('/api/v2/smart-goal-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          industry: formData.industry,
          businessTypes: businessTypes.map(bt => bt.type),
          brandVoice: formData.voice,
          businessDescription: businessDescription,
          // Optional: target area if present in description (simple heuristic)
          targetArea: undefined
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const rich = (data.suggestions || []) as Array<{ headline: string; subcopy?: string; offer?: string; cta?: string; urgency?: string; rationale?: string; category: string; }>;
        // Map to display strings combining parts
        const mapped = rich.map(s => {
          const parts = [s.headline, s.offer, s.subcopy, s.urgency, s.cta].filter(Boolean);
          return parts.join(' • ');
        });
        // Fallback to raw suggestions if shape differs
        setGoalSuggestions(mapped.length > 0 ? mapped : (data.suggestions || []));
      }
    } catch (error) {
      console.error('Error fetching goal suggestions:', error);
    } finally {
      setLoadingGoalSuggestions(false);
    }
  }, [formData.industry, businessTypes, formData.voice, businessDescription]);

  // Handle business type removal
  const handleRemoveBusinessType = useCallback((typeToRemove: string) => {
    if (businessTypes.length <= 1) {
      setErrors(prev => ({ ...prev, businessTypes: 'At least one business type is required' }));
      return;
    }
    
    const newBusinessTypes = businessTypes.filter(bt => bt.type !== typeToRemove);
    setBusinessTypes(newBusinessTypes);
    onBusinessTypesChange?.(newBusinessTypes);
    
    // Clear error if it exists
    if (errors.businessTypes) {
      setErrors(prev => ({ ...prev, businessTypes: '' }));
    }
  }, [businessTypes, onBusinessTypesChange, errors.businessTypes]);

  // Handle business type addition
  const handleAddBusinessType = useCallback((typeToAdd: BusinessTypeWithCount) => {
    if (businessTypes.some(bt => bt.type === typeToAdd.type)) return;
    
    const newBusinessTypes = [...businessTypes, typeToAdd];
    setBusinessTypes(newBusinessTypes);
    onBusinessTypesChange?.(newBusinessTypes);
    setShowAddBusinessTypes(false);
  }, [businessTypes, onBusinessTypesChange]);

  // Handle business description save
  const handleSaveDescription = useCallback(async () => {
    try {
      setBusinessDescription(businessDescription);
      onBusinessDescriptionChange?.(businessDescription);
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Error saving description:', error);
    }
  }, [businessDescription, onBusinessDescriptionChange]);

  // Handle form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate business types
    if (businessTypes.length === 0) {
      setErrors(prev => ({ ...prev, businessTypes: 'At least one business type is required' }));
      // Scroll to business types section
      businessTypesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Add imagery to goal if provided and include business description
    const finalFormData = {
      ...formData,
      goal: imageryDescription 
        ? `${formData.goal}. Imagery: ${imageryDescription}`
        : formData.goal,
      businessDescription: businessDescription,
      businessTypes: businessTypes.map(bt => bt.type)
    };
    
    const validation = validateDesignRequest(finalFormData);
    if (validation.isValid) {
      setErrors({});
      onSubmit(finalFormData);
    } else {
      const errorMap: Record<string, string> = {};
      validation.errors.forEach(error => {
        if (error.includes('Goal')) errorMap.goal = error;
        if (error.includes('Industry')) errorMap.industry = error;
        if (error.includes('audience')) errorMap.audience = error;
      });
      setErrors(errorMap);

      // Determine first error field and autoscroll/focus
      type ErrorKey = 'industry' | 'goal' | 'audience';
      let firstError: ErrorKey | undefined;
      if (errorMap.industry) firstError = 'industry';
      else if (errorMap.goal) firstError = 'goal';
      else if (errorMap.audience) firstError = 'audience';

      if (firstError === 'industry') {
        industryInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        industryInputRef.current?.focus();
      } else if (firstError === 'goal') {
        goalTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        goalTextareaRef.current?.focus();
      } else if (firstError === 'audience') {
        // Ensure the audience input is visible before focusing
        setCustomAudience(true);
        setTimeout(() => {
          audienceContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          audienceInputRef.current?.focus();
        }, 0);
      }
    }
  }, [formData, imageryDescription, businessDescription, businessTypes, onSubmit, setCustomAudience]);

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

  // Available business types for adding
  const availableToAdd = availableBusinessTypes.filter(
    available => !businessTypes.some(bt => bt.type === available.type)
  );

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
            Design Brief
          </h2>
          <p className="text-[#EAEAEA]/60 mb-4">
            Tell us about your business and campaign goals to create the perfect postcard
          </p>
        </div>

        {/* Business Types Being Targeted */}
        <div ref={businessTypesRef} className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20">
          <h3 className="text-[#EAEAEA] font-medium mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Targeting {businessTypes.length} Business Type{businessTypes.length > 1 ? 's' : ''}
          </h3>
          <p className="text-[#EAEAEA]/60 text-sm mb-3">
            These are the business types we&apos;ll be mailing to
          </p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {businessTypes.map((businessType) => (
              <div
                key={businessType.type}
                className="flex items-center gap-2 bg-[#00F0FF]/10 text-[#00F0FF] px-3 py-2 rounded-full border border-[#00F0FF]/30"
              >
                <span className="text-sm capitalize">
                  {businessType.type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs bg-[#00F0FF]/20 px-2 py-0.5 rounded-full">
                  {businessType.count}
                </span>
                {businessTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveBusinessType(businessType.type)}
                    className="ml-1 text-[#00F0FF]/60 hover:text-[#FF00B8] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            
            {availableToAdd.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddBusinessTypes(!showAddBusinessTypes)}
                  className="flex items-center gap-1 bg-[#00F0FF]/10 text-[#00F0FF] px-3 py-2 rounded-full border border-[#00F0FF]/30 hover:bg-[#00F0FF]/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-sm">Add More</span>
                </button>

                {showAddBusinessTypes && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 mt-2 bg-[#2F2F2F] border border-[#00F0FF]/30 rounded-lg p-3 min-w-64 z-10"
                  >
                    <p className="text-[#EAEAEA]/60 text-xs mb-2">Available business types:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {availableToAdd.map((businessType) => (
                        <button
                          key={businessType.type}
                          type="button"
                          onClick={() => handleAddBusinessType(businessType)}
                          className="w-full flex items-center justify-between p-2 rounded hover:bg-[#00F0FF]/10 transition-colors text-left"
                        >
                          <span className="text-[#EAEAEA] text-sm capitalize">
                            {businessType.type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[#00F0FF] text-xs">
                            {businessType.count} leads
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          {errors.businessTypes && (
            <p className="text-[#FF00B8] text-sm">{errors.businessTypes}</p>
          )}
        </div>

        {/* Business Information */}
        {businessDescription && (
          <div className="bg-[#00F0FF]/10 rounded-lg p-4 border border-[#00F0FF]/30">
            <h3 className="text-[#EAEAEA] font-medium mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Using Your Business Information
            </h3>
            
            {isEditingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#2F2F2F] border border-[#00F0FF]/30 rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 focus:outline-none focus:ring-2 focus:ring-[#00F0FF] resize-none"
                  rows={4}
                  placeholder="Describe your business..."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDescription}
                    className="px-4 py-2 bg-[#00F0FF] text-[#1A1A1A] rounded-lg font-medium hover:bg-[#00F0FF]/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessDescription(initialDescription || '');
                      setIsEditingDescription(false);
                    }}
                    className="px-4 py-2 bg-[#2F2F2F] text-[#EAEAEA] rounded-lg font-medium hover:bg-[#2F2F2F]/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[#EAEAEA]/80 text-sm">
                  {showFullDescription || businessDescription.length <= 150 
                    ? businessDescription 
                    : `${businessDescription.slice(0, 150)}...`}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {businessDescription.length > 150 && (
                    <button
                      type="button"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-[#00F0FF] text-xs hover:text-[#FF00B8] transition-colors"
                    >
                      {showFullDescription ? 'Show Less' : 'Read More'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(true)}
                    className="text-[#00F0FF] text-xs hover:text-[#FF00B8] transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <p className="text-[#00F0FF]/60 text-xs mt-2">
                  ✓ AI will use this context to create more relevant designs
                </p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Industry - Simplified */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Your Business Industry *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
                ref={industryInputRef}
                className={`
                  w-full px-4 py-3 bg-[#2F2F2F] border rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 
                  focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all pr-24
                  ${errors.industry ? 'border-[#FF00B8]' : 'border-[#2F2F2F]'}
                `}
                placeholder="What industry is your business in? (e.g., Restaurant, Law Office, Auto Repair, Dental Practice)"
              />
              {/* Prefill helper using saved session data */}
              {initialIndustry && !formData.industry && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#EAEAEA]/50">
                  Prefilled
                </span>
              )}
            </div>
            {errors.industry && (
              <p className="text-[#FF00B8] text-sm mt-1">{errors.industry}</p>
            )}
            <p className="text-[#EAEAEA]/60 text-xs mt-1">
              This helps us create industry-specific design elements and messaging
            </p>
          </div>

          {/* Campaign Goal with AI Suggestions */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Campaign Goal *
            </label>
            <div className="relative">
              <textarea
                value={formData.goal}
                onChange={(e) => updateField('goal', e.target.value)}
                ref={goalTextareaRef}
                className={`
                  w-full px-4 py-3 bg-[#2F2F2F] border rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 
                  focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all resize-none
                  ${errors.goal ? 'border-[#FF00B8]' : 'border-[#2F2F2F]'}
                `}
                rows={3}
                placeholder="What do you want to achieve with this postcard campaign?"
              />
              {errors.goal && (
                <p className="text-[#FF00B8] text-sm mt-1">{errors.goal}</p>
              )}
              
              {/* AI Suggestions Toggle */}
              <div className="flex items-center justify-between mt-2">
                <div className="text-[#EAEAEA]/60 text-xs">
                  <p className="mb-1">💡 <strong>Campaigns perform better with:</strong></p>
                  <ul className="list-disc list-inside space-y-0.5 ml-4">
                    <li>A clear offer or promotion</li>
                    <li>Specific call-to-action</li>
                    <li>What differentiates you from competitors</li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowGoalSuggestions(!showGoalSuggestions);
                    if (!showGoalSuggestions && goalSuggestions.length === 0) {
                      fetchGoalSuggestions();
                    }
                  }}
                  className="flex items-center gap-2 text-[#00F0FF] hover:text-[#FF00B8] transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Suggestions
                </button>
              </div>

              {/* Goal Suggestions */}
              <AnimatePresence>
                {showGoalSuggestions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20"
                  >
                    {loadingGoalSuggestions ? (
                      <div className="flex items-center justify-center py-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-[#00F0FF] border-t-transparent rounded-full"
                        />
                        <span className="ml-2 text-[#00F0FF] text-sm">Generating suggestions...</span>
                      </div>
                    ) : goalSuggestions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[#EAEAEA]/60 text-xs mb-3">Click any suggestion to use it:</p>
                        {goalSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              updateField('goal', suggestion);
                              setShowGoalSuggestions(false);
                            }}
                            className="w-full text-left p-3 bg-[#1A1A1A] hover:bg-[#00F0FF]/10 rounded-lg transition-colors border border-[#2F2F2F] hover:border-[#00F0FF]/30"
                          >
                            <span className="text-[#EAEAEA] text-sm">{suggestion}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[#EAEAEA]/60 text-sm text-center py-2">
                        No suggestions available. Please add your industry first.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Target Audience */}
          <div ref={audienceContainerRef}>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Target Audience *
            </label>
            <div className="relative">
              {!customAudience ? (
                <div className="bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg p-3 flex items-center justify-between">
                  <span className="text-[#EAEAEA]">
                    {businessTypes.map(bt => bt.type.replace(/_/g, ' ')).join(', ')} businesses
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomAudience(true);
                      updateField('audience', `${businessTypes.map(bt => bt.type.replace(/_/g, ' ')).join(', ')} businesses`);
                    }}
                    className="text-[#00F0FF] hover:text-[#FF00B8] transition-colors text-sm"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={formData.audience}
                    onChange={(e) => updateField('audience', e.target.value)}
                    ref={audienceInputRef}
                    className={`
                      w-full px-4 py-3 bg-[#2F2F2F] border rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 
                      focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all pr-16
                      ${errors.audience ? 'border-[#FF00B8]' : 'border-[#2F2F2F]'}
                    `}
                    placeholder="Who are you trying to reach?"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustomAudience(false);
                      updateField('audience', businessTypes.map(bt => bt.type.replace(/_/g, ' ')).join(', ') + ' businesses');
                    }}
                    className="absolute right-3 top-3 text-[#EAEAEA]/60 hover:text-[#FF00B8] transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              )}
              {errors.audience && (
                <p className="text-[#FF00B8] text-sm mt-1">{errors.audience}</p>
              )}
            </div>
          </div>

          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
              Brand Voice *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {voiceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('voice', option.value)}
                  className={`
                    p-4 rounded-lg border text-left transition-all
                    ${formData.voice === option.value
                      ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                      : 'border-[#2F2F2F] bg-[#2F2F2F] hover:border-[#00F0FF]/50'
                    }
                  `}
                >
                  <div className="font-medium text-[#EAEAEA] mb-1">
                    {option.label}
                  </div>
                  <div className="text-sm text-[#EAEAEA]/60">
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Imagery Description (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[#EAEAEA]">
                Imagery Instructions (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowImageryField(!showImageryField)}
                className="text-[#00F0FF] hover:text-[#FF00B8] transition-colors text-sm"
              >
                {showImageryField ? 'Hide' : 'Add Instructions'}
              </button>
            </div>
            
            <AnimatePresence>
              {showImageryField && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <textarea
                    value={imageryDescription}
                    onChange={(e) => setImageryDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all resize-none"
                    rows={3}
                    placeholder="Describe specific imagery you'd like to see (e.g., 'Include images of our storefront', 'Use photos of happy customers', 'Show before/after examples')"
                  />
                  <p className="text-[#EAEAEA]/60 text-xs">
                    This will be included in your design brief to help AI create more relevant visuals
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#00F0FF] text-[#1A1A1A] py-4 px-6 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-[#1A1A1A] border-t-transparent rounded-full"
                  />
                  Generating Design...
                </div>
              ) : (
                'Generate Creative Briefs'
              )}
            </button>
            
            <button
              type="button"
              onClick={onToggleAdvanced}
              className="px-6 py-4 bg-[#2F2F2F] text-[#EAEAEA] rounded-lg font-semibold hover:bg-[#2F2F2F]/80 transition-all duration-200 border border-[#00F0FF]/20"
            >
              Advanced Mode
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default SimpleDesignForm; 