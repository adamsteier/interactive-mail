'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';

interface BrandData {
  hasBrandGuidelines: boolean;
  primaryColor: string;
  accentColor: string;
  stylePreferences: BrandStylePreference[];
  additionalNotes: string;
  logoUrl: string;
  brandName: string;
}

interface BrandIdentityProps {
  onComplete: (brandData: BrandData) => void;
  initialData?: Partial<BrandData>;
  hideLogoInput?: boolean;
}

const styleOptions: { id: BrandStylePreference; label: string; description: string }[] = [
  {
    id: 'playful',
    label: 'Playful / Fun',
    description: 'Vibrant, energetic, and approachable style with friendly elements'
  },
  {
    id: 'professional',
    label: 'Professional / Corporate',
    description: 'Clean, sophisticated, and trustworthy aesthetic for business'
  },
  {
    id: 'modern',
    label: 'Modern / Minimal',
    description: 'Sleek, contemporary design with clean lines and simplicity'
  },
  {
    id: 'traditional',
    label: 'Traditional / Classic',
    description: 'Timeless, established look with conventional elements'
  }
];

const BrandIdentity = ({ onComplete, initialData = {}, hideLogoInput = false }: BrandIdentityProps) => {
  const [brandData, setBrandData] = useState<BrandData>({
    hasBrandGuidelines: initialData.hasBrandGuidelines ?? false,
    primaryColor: initialData.primaryColor ?? '#1ecbe1', // Default to electric-teal
    accentColor: initialData.accentColor ?? '#e11e64', // Default to a contrasting color
    stylePreferences: initialData.stylePreferences ?? [],
    additionalNotes: initialData.additionalNotes ?? '',
    logoUrl: initialData.logoUrl ?? '',
    brandName: initialData.brandName ?? ''
  });

  const [logoPreview, setLogoPreview] = useState<string>(initialData.logoUrl ?? '');

  const toggleStylePreference = (style: BrandStylePreference) => {
    setBrandData(prev => {
      const newPreferences = prev.stylePreferences.includes(style)
        ? prev.stylePreferences.filter(s => s !== style)
        : [...prev.stylePreferences, style];
      
      return {
        ...prev,
        stylePreferences: newPreferences
      };
    });
  };

  const handleSubmit = () => {
    onComplete(brandData);
  };

  const guidelinesSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Brand Guidelines</h3>
      <p className="text-electric-teal/70 mb-6">
        Do you have existing brand guidelines (logo, color palette, fonts) you&apos;d like us to use?
      </p>
      
      <div className="flex gap-4">
        <button
          onClick={() => setBrandData(prev => ({ ...prev, hasBrandGuidelines: true }))}
          className={`px-6 py-3 rounded-lg border-2 transition-colors duration-200 ${
            brandData.hasBrandGuidelines 
              ? 'bg-electric-teal text-charcoal border-electric-teal' 
              : 'border-electric-teal/50 text-electric-teal hover:border-electric-teal'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => setBrandData(prev => ({ ...prev, hasBrandGuidelines: false }))}
          className={`px-6 py-3 rounded-lg border-2 transition-colors duration-200 ${
            !brandData.hasBrandGuidelines 
              ? 'bg-electric-teal text-charcoal border-electric-teal' 
              : 'border-electric-teal/50 text-electric-teal hover:border-electric-teal'
          }`}
        >
          No
        </button>
      </div>

      {brandData.hasBrandGuidelines && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6"
        >
          <div className="p-4 border-2 border-dashed border-electric-teal/50 rounded-lg text-center cursor-pointer">
            <div className="text-electric-teal mb-2">
              <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-electric-teal/70">
              Upload your brand guidelines (PDF, images, or text files)
            </p>
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
              multiple
            />
          </div>
          <p className="text-sm text-electric-teal/60 mt-2">
            We&apos;ll use these to match your brand&apos;s look and feel
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  const colorSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Color Selection</h3>
      
      {!brandData.hasBrandGuidelines && (
        <p className="text-electric-teal/70 mb-6">
          Choose your primary and accent colors for your postcard design.
        </p>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-electric-teal mb-2">Primary Color</label>
          <div className="flex items-center gap-4 mb-2">
            <div 
              className="w-10 h-10 rounded-full border border-white/20"
              style={{ backgroundColor: brandData.primaryColor }}
            ></div>
            <input
              type="color"
              value={brandData.primaryColor}
              onChange={(e) => setBrandData(prev => ({ ...prev, primaryColor: e.target.value }))}
              className="w-full"
            />
          </div>
          <div className="mt-2">
            <label className="block text-electric-teal text-sm mb-1">Hex Code</label>
            <input
              type="text"
              value={brandData.primaryColor}
              onChange={(e) => {
                // Validate hex code format (with or without #)
                const hexValue = e.target.value.startsWith('#') 
                  ? e.target.value 
                  : `#${e.target.value}`;
                
                // Basic validation for hex color format
                if (/^#([0-9A-F]{3}){1,2}$/i.test(hexValue) || e.target.value === '' || e.target.value === '#') {
                  setBrandData(prev => ({ ...prev, primaryColor: hexValue }));
                }
              }}
              placeholder="#1ecbe1"
              className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-2
                text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
                focus:outline-none transition-colors"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-electric-teal mb-2">Accent Color</label>
          <div className="flex items-center gap-4 mb-2">
            <div 
              className="w-10 h-10 rounded-full border border-white/20"
              style={{ backgroundColor: brandData.accentColor }}
            ></div>
            <input
              type="color"
              value={brandData.accentColor}
              onChange={(e) => setBrandData(prev => ({ ...prev, accentColor: e.target.value }))}
              className="w-full"
            />
          </div>
          <div className="mt-2">
            <label className="block text-electric-teal text-sm mb-1">Hex Code</label>
            <input
              type="text"
              value={brandData.accentColor}
              onChange={(e) => {
                // Validate hex code format (with or without #)
                const hexValue = e.target.value.startsWith('#') 
                  ? e.target.value 
                  : `#${e.target.value}`;
                
                // Basic validation for hex color format
                if (/^#([0-9A-F]{3}){1,2}$/i.test(hexValue) || e.target.value === '' || e.target.value === '#') {
                  setBrandData(prev => ({ ...prev, accentColor: hexValue }));
                }
              }}
              placeholder="#e11e64"
              className="w-full bg-charcoal border-2 border-electric-teal/50 rounded-lg p-2
                text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
                focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  const styleSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Style Preferences</h3>
      <p className="text-electric-teal/70 mb-6">
        What best describes the style you&apos;re going for? (Select one or more)
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {styleOptions.map(option => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleStylePreference(option.id)}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              brandData.stylePreferences.includes(option.id)
                ? 'border-electric-teal bg-electric-teal/10'
                : 'border-electric-teal/30 hover:border-electric-teal/70'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${brandData.stylePreferences.includes(option.id) 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {brandData.stylePreferences.includes(option.id) && (
                  <div className="w-3 h-3 rounded-full bg-electric-teal"></div>
                )}
              </div>
              <h4 className="text-lg font-medium text-electric-teal">{option.label}</h4>
            </div>
            <p className="text-electric-teal/70 text-sm pl-7">{option.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const notesSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Additional Notes</h3>
      <p className="text-electric-teal/70 mb-4">
        Any additional notes on style? (Optional)
      </p>
      
      <textarea
        value={brandData.additionalNotes}
        onChange={(e) => setBrandData(prev => ({ ...prev, additionalNotes: e.target.value }))}
        placeholder="E.g., 'We prefer rounded corners and bold typography' or 'Our brand has a nature-inspired aesthetic'"
        className="w-full h-32 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
          text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
          focus:outline-none transition-colors"
      />
    </motion.div>
  );

  const logoUploadSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Brand Identity</h3>
      
      <div className="mb-6">
        <label className="block text-electric-teal mb-2" htmlFor="brandName">
          Brand Name
        </label>
        <input
          type="text"
          id="brandName"
          value={brandData.brandName}
          onChange={(e) => setBrandData(prev => ({ ...prev, brandName: e.target.value }))}
          className="w-full p-3 bg-charcoal border-2 border-electric-teal/50 rounded-lg
            text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
            focus:outline-none transition-colors"
          placeholder="Enter your brand name"
        />
      </div>
      
      {!hideLogoInput && (
        <div className="mb-6">
          <label className="block text-electric-teal mb-2">
            Logo Upload
          </label>
          <div className="border-2 border-dashed border-electric-teal/50 rounded-lg p-4 text-center">
            {logoPreview ? (
              <div className="mb-3">
                <img 
                  src={logoPreview} 
                  alt="Logo preview" 
                  className="max-h-32 mx-auto bg-white/10 p-2 rounded-lg"
                />
                <button 
                  onClick={() => {
                    setLogoPreview('');
                    setBrandData(prev => ({ ...prev, logoUrl: '' }));
                  }}
                  className="mt-2 text-electric-teal/70 hover:text-electric-teal text-sm"
                >
                  Remove logo
                </button>
              </div>
            ) : (
              <div className="py-8">
                <svg className="w-12 h-12 mx-auto text-electric-teal/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-electric-teal mb-2">
                  Drag and drop your logo or click to browse
                </p>
                <p className="text-electric-teal/60 text-sm">
                  Recommended: PNG file with transparent background
                </p>
              </div>
            )}
            
            <input 
              type="file"
              id="logo-upload"
              accept="image/png,image/jpeg,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Create a URL for preview
                  const objectUrl = URL.createObjectURL(file);
                  setLogoPreview(objectUrl);
                  // In a real app, you would upload the file to a server here
                  // For now, we'll just simulate it by setting the logoUrl to the object URL
                  setBrandData(prev => ({ ...prev, logoUrl: objectUrl }));
                }
              }}
            />
            
            <label 
              htmlFor="logo-upload"
              className="inline-block px-4 py-2 bg-electric-teal/20 border border-electric-teal/50
                rounded-lg text-electric-teal cursor-pointer hover:bg-electric-teal/30 transition-colors"
            >
              {logoPreview ? 'Choose a different logo' : 'Select file'}
            </label>
          </div>
          
          <p className="mt-2 text-electric-teal/70 text-sm">
            For best results, upload a high-resolution logo (PNG or SVG) with a transparent background.
            This will appear on your postcards and ensure your brand stands out.
          </p>
        </div>
      )}
    </motion.div>
  );

  const isValid = brandData.stylePreferences.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-electric-teal mb-2">
            Brand Identity & Style
          </h2>
          <p className="text-electric-teal/70">
            Let&apos;s make sure your postcards align with your brand identity and aesthetic preferences.
          </p>
        </div>
      </motion.div>

      {guidelinesSection}
      {logoUploadSection}
      {colorSection}
      {styleSection}
      {notesSection}

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

export default BrandIdentity; 