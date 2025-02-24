'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

interface BusinessData {
  tagline: string;
  useAiTagline: boolean;
  contactInfo: {
    phone: string;
    website: string;
    email: string;
    address: string;
  };
  disclaimer: string;
  includeDisclaimer: boolean;
  extraInfo: string;
}

interface BusinessDetailsProps {
  onComplete: (businessData: BusinessData) => void;
  initialData?: Partial<BusinessData>;
  segment?: string;
}

const taglineSuggestions = [
  "Quality service you can trust",
  "Your satisfaction is our priority",
  "Experience the difference",
  "Where excellence meets affordability",
  "Serving your needs since [YEAR]",
  "The smart choice for [INDUSTRY]",
  "Your local [INDUSTRY] experts"
];

const BusinessDetails = ({ onComplete, initialData = {}, segment }: BusinessDetailsProps) => {
  const businessName = useMarketingStore(state => state.businessInfo.businessName);
  const businessAnalysis = useMarketingStore(state => state.businessInfo.businessAnalysis);

  const [businessData, setBusinessData] = useState<BusinessData>({
    tagline: initialData.tagline ?? '',
    useAiTagline: initialData.useAiTagline ?? false,
    contactInfo: {
      phone: initialData.contactInfo?.phone ?? '',
      website: initialData.contactInfo?.website ?? '',
      email: initialData.contactInfo?.email ?? '',
      address: initialData.contactInfo?.address ?? ''
    },
    disclaimer: initialData.disclaimer ?? '',
    includeDisclaimer: initialData.includeDisclaimer ?? false,
    extraInfo: initialData.extraInfo ?? ''
  });

  const [showTaglineSuggestions, setShowTaglineSuggestions] = useState(false);
  const [customizedTaglines, setCustomizedTaglines] = useState<string[]>([]);

  // Pre-fill contact info if available
  useEffect(() => {
    if (businessAnalysis && businessName && !businessData.contactInfo.website) {
      // If we have business analysis but no contact info yet, pre-populate with defaults
      setBusinessData(prev => ({
        ...prev,
        contactInfo: {
          ...prev.contactInfo,
          website: initialData.contactInfo?.website ?? `www.${businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          address: initialData.contactInfo?.address ?? ''
        }
      }));
    }
  }, [businessAnalysis, businessName, businessData.contactInfo.website, initialData.contactInfo]);

  // Generate customized tagline suggestions
  useEffect(() => {
    if (businessName) {
      const industry = businessAnalysis?.industry || 'business';
      const yearEstablished = (new Date().getFullYear() - Math.floor(Math.random() * 20)).toString();
      
      const customized = taglineSuggestions.map(suggestion => {
        return suggestion
          .replace('[INDUSTRY]', industry)
          .replace('[YEAR]', yearEstablished);
      });
      
      setCustomizedTaglines(customized);
    }
  }, [businessName, businessAnalysis]);

  const handleSelectTagline = (tagline: string) => {
    setBusinessData(prev => ({
      ...prev,
      tagline,
      useAiTagline: true
    }));
    setShowTaglineSuggestions(false);
  };

  const handleSubmit = () => {
    onComplete(businessData);
  };

  const taglineSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Tagline or USP</h3>
      <p className="text-electric-teal/70 mb-6">
        Do you have a tagline or unique selling proposition (USP) you want to highlight?
      </p>
      
      <div className="mb-6">
        <input
          type="text"
          value={businessData.tagline}
          onChange={(e) => setBusinessData(prev => ({ 
            ...prev, 
            tagline: e.target.value,
            useAiTagline: false
          }))}
          placeholder="E.g., 'Quality service since 1995' or 'The area's leading provider'"
          className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
            text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
            focus:outline-none transition-colors"
        />
      </div>

      {!showTaglineSuggestions ? (
        <button
          onClick={() => setShowTaglineSuggestions(true)}
          className="text-electric-teal hover:text-electric-teal/80 flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Need help creating a tagline? Get AI suggestions
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4"
        >
          <h4 className="text-electric-teal mb-3">AI-Suggested Taglines:</h4>
          <div className="grid grid-cols-1 gap-3">
            {customizedTaglines.map((tagline, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectTagline(tagline)}
                className="p-3 rounded-lg border cursor-pointer
                  border-electric-teal/30 hover:border-electric-teal/60 transition-colors"
              >
                <p className="text-electric-teal">{tagline}</p>
              </motion.div>
            ))}
          </div>
          <button
            onClick={() => setShowTaglineSuggestions(false)}
            className="mt-4 text-electric-teal/70 text-sm"
          >
            Hide suggestions
          </button>
        </motion.div>
      )}
    </motion.div>
  );

  const contactInfoSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Contact Information</h3>
      <p className="text-electric-teal/70 mb-6">
        What contact information do you want included on your postcard?
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-electric-teal mb-2">Phone</label>
          <input
            type="tel"
            value={businessData.contactInfo.phone}
            onChange={(e) => setBusinessData(prev => ({ 
              ...prev, 
              contactInfo: { ...prev.contactInfo, phone: e.target.value }
            }))}
            placeholder="(555) 123-4567"
            className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-3
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-electric-teal mb-2">Website</label>
          <input
            type="url"
            value={businessData.contactInfo.website}
            onChange={(e) => setBusinessData(prev => ({ 
              ...prev, 
              contactInfo: { ...prev.contactInfo, website: e.target.value }
            }))}
            placeholder="www.yourbusiness.com"
            className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-3
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-electric-teal mb-2">Email</label>
          <input
            type="email"
            value={businessData.contactInfo.email}
            onChange={(e) => setBusinessData(prev => ({ 
              ...prev, 
              contactInfo: { ...prev.contactInfo, email: e.target.value }
            }))}
            placeholder="contact@yourbusiness.com"
            className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-3
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-electric-teal mb-2">Address</label>
          <input
            type="text"
            value={businessData.contactInfo.address}
            onChange={(e) => setBusinessData(prev => ({ 
              ...prev, 
              contactInfo: { ...prev.contactInfo, address: e.target.value }
            }))}
            placeholder="123 Main St, City, State ZIP"
            className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-3
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </div>
      </div>
    </motion.div>
  );

  const disclaimerSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-10"
    >
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setBusinessData(prev => ({ 
            ...prev, 
            includeDisclaimer: !prev.includeDisclaimer,
            disclaimer: !prev.includeDisclaimer ? prev.disclaimer : ''
          }))}
          className="w-6 h-6 rounded-md border-2 border-electric-teal flex items-center justify-center"
        >
          {businessData.includeDisclaimer && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 bg-electric-teal rounded-sm"
            />
          )}
        </button>
        <h3 className="text-xl font-semibold text-electric-teal">
          Include legal disclaimer or notice
        </h3>
      </div>
      
      {businessData.includeDisclaimer && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pl-9"
        >
          <p className="text-electric-teal/70 mb-4">
            Enter any legal disclaimer or notice needed for your industry.
            This will appear in smaller text on the postcard.
          </p>
          <textarea
            value={businessData.disclaimer}
            onChange={(e) => setBusinessData(prev => ({ 
              ...prev, 
              disclaimer: e.target.value 
            }))}
            placeholder="E.g., 'Terms and conditions apply. Offer valid until [date].' or industry-specific disclaimers."
            className="w-full h-24 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </motion.div>
      )}
    </motion.div>
  );

  const extraInfoSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Additional Information</h3>
      <p className="text-electric-teal/70 mb-6">
        Is there any other information you&apos;d like to include? (Optional)
      </p>
      
      <textarea
        value={businessData.extraInfo}
        onChange={(e) => setBusinessData(prev => ({ ...prev, extraInfo: e.target.value }))}
        placeholder="E.g., Hours of operation, social media handles, special services, etc."
        className="w-full h-24 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
          text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
          focus:outline-none transition-colors"
      />
    </motion.div>
  );

  const isValid = 
    (businessData.contactInfo.phone.trim() !== '' || 
     businessData.contactInfo.website.trim() !== '' ||
     businessData.contactInfo.email.trim() !== '' ||
     businessData.contactInfo.address.trim() !== '') &&
    (!businessData.includeDisclaimer || (businessData.includeDisclaimer && businessData.disclaimer.trim() !== ''));

  return (
    <div className="max-w-3xl mx-auto px-4">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-electric-teal mb-2">
            Business Details {segment ? `for ${segment}` : ''}
          </h2>
          <p className="text-electric-teal/70">
            Add essential information about your business that should appear on the postcard.
          </p>
        </div>
      </motion.div>

      {taglineSection}
      {contactInfoSection}
      {disclaimerSection}
      {extraInfoSection}

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

export default BusinessDetails; 