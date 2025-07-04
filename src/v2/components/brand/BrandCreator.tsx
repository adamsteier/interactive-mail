'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LogoUploader from './LogoUploader';
import { useBrands } from '../../hooks/useBrands';
import { LogoVariant, ColorAnalysis } from '../../types/brand';

interface BrandFormData {
  name: string;
  logoFile?: File;
  logoPreview?: string;
  logo: {
    variants: LogoVariant[];
    analysis: ColorAnalysis;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    accent: string;
  };
  isDefault: boolean;
}

interface BrandCreatorProps {
  onSuccess?: (brandId: string) => void;
  onCancel?: () => void;
  campaignId?: string;
  initialData?: Partial<BrandFormData>;
  mode?: 'modal' | 'page';
}

const BrandCreator = ({ 
  onSuccess, 
  onCancel, 
  campaignId,
  initialData,
  mode = 'modal'
}: BrandCreatorProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const { actions: { create: createBrand }, loading: isCreating } = useBrands();
  
  // Form state
  const [formData, setFormData] = useState<BrandFormData>({
    name: initialData?.name || '',
          logo: initialData?.logo || {
        variants: [],
        analysis: {
          extracted: { 
            primary: '#000000', 
            secondary: '#000000', 
            palette: [], 
            confidence: 0 
          },
          contrast: { 
            primaryVsWhite: 1, 
            primaryVsBlack: 1, 
            isAccessible: false 
          },
          harmony: { 
            scheme: 'monochromatic', 
            quality: 'poor' 
          }
        }
      },
    colors: initialData?.colors || {
      primary: '#00F0FF',
      secondary: '#FF00B8',
      accent: '#2F2F2F',
      background: '#1A1A1A',
      surface: '#2F2F2F',
      text: '#EAEAEA'
    },
    fonts: initialData?.fonts || {
      heading: 'Inter',
      body: 'Inter',
      accent: 'Inter'
    },
    isDefault: initialData?.isDefault || false
  });

  // UI state
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { id: 'basic', title: 'Basic Info', description: 'Brand name and logo' },
    { id: 'colors', title: 'Colors', description: 'Brand color palette' },
    { id: 'fonts', title: 'Typography', description: 'Font selections' },
    { id: 'preview', title: 'Preview', description: 'Review and create' }
  ];

  // Validation
  const validateStep = useCallback((stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (stepIndex) {
      case 0: // Basic Info
        if (!formData.name.trim()) {
          newErrors.name = 'Brand name is required';
        } else if (formData.name.length < 2) {
          newErrors.name = 'Brand name must be at least 2 characters';
        } else if (formData.name.length > 50) {
          newErrors.name = 'Brand name must be less than 50 characters';
        }
        
        if (!formData.logo.variants.length) {
          newErrors.logo = 'Logo is required';
        }
        break;

      case 1: // Colors
        if (!formData.colors.primary) {
          newErrors.primary = 'Primary color is required';
        }
        if (!formData.colors.secondary) {
          newErrors.secondary = 'Secondary color is required';
        }
        break;

      case 2: // Fonts
        if (!formData.fonts.heading) {
          newErrors.heading = 'Heading font is required';
        }
        if (!formData.fonts.body) {
          newErrors.body = 'Body font is required';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle logo upload
  const handleLogoUploaded = useCallback((variants: LogoVariant[], analysis: ColorAnalysis) => {
    setFormData(prev => ({
      ...prev,
      logo: { variants, analysis }
    }));

    // Auto-suggest colors from logo
    if (analysis.extracted.palette.length > 0) {
      const suggestedColors = analysis.extracted.palette.slice(0, 3);
      setFormData(prev => ({
        ...prev,
        colors: {
          ...prev.colors,
          primary: suggestedColors[0] || prev.colors.primary,
          secondary: suggestedColors[1] || prev.colors.secondary,
          accent: suggestedColors[2] || prev.colors.accent
        }
      }));
    }

    // Clear logo errors
    setErrors(prev => ({ ...prev, logo: '' }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    try {
      // Convert form data to CreateBrandRequest format
      const createRequest = {
        name: formData.name,
        logoData: formData.logo.variants.length > 0 ? {
          variants: formData.logo.variants,
          analysis: formData.logo.analysis
        } : undefined,
        businessInfo: {
          type: '',
          address: '',
          phone: '',
          email: '',
          website: ''
        },
        identity: {
          tagline: '',
          voice: 'professional' as const,
          keywords: [],
          targetAudience: '',
          valueProposition: ''
        },
        socialMedia: {
          instagram: '',
          facebook: '',
          twitter: '',
          linkedin: '',
          tiktok: '',
          youtube: ''
        }
      };
      
      const brandId = await createBrand(createRequest);
      
      if (onSuccess) {
        onSuccess(brandId);
      } else if (campaignId) {
        router.push(`/v2/build/${campaignId}/brand`);
      } else {
        router.push('/v2/dashboard');
      }
    } catch (error) {
      console.error('Error creating brand:', error);
      setErrors({ submit: 'Failed to create brand. Please try again.' });
    }
  }, [formData.name, createBrand, onSuccess, campaignId, router]);

  // Step navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Available fonts
  const fontOptions = [
    { value: 'Inter', label: 'Inter - Modern & Clean' },
    { value: 'Poppins', label: 'Poppins - Friendly & Rounded' },
    { value: 'Roboto', label: 'Roboto - Professional' },
    { value: 'Montserrat', label: 'Montserrat - Elegant' },
    { value: 'Open Sans', label: 'Open Sans - Readable' },
    { value: 'Lato', label: 'Lato - Versatile' },
    { value: 'Source Sans Pro', label: 'Source Sans Pro - Clean' },
    { value: 'Ubuntu', label: 'Ubuntu - Friendly' }
  ];

  return (
    <div className={`${mode === 'modal' ? 'fixed inset-0 bg-black/50 flex items-center justify-center z-50' : 'w-full'}`}>
      <div className={`bg-[#1A1A1A] rounded-lg border border-[#2F2F2F] ${
        mode === 'modal' ? 'max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto' : 'w-full'
      }`}>
        {/* Header */}
        <div className="p-6 border-b border-[#2F2F2F]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#EAEAEA]">Create Brand</h2>
              <p className="text-[#EAEAEA]/60 mt-1">Set up your brand identity for campaigns</p>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-[#EAEAEA]/60 hover:text-[#FF00B8] transition-colors p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-4 mt-6">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
                  index < currentStep 
                    ? 'bg-[#00F0FF] text-[#1A1A1A] border-[#00F0FF]' 
                    : index === currentStep
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-[#2F2F2F] text-[#EAEAEA]/60 border-[#2F2F2F]'
                }`}>
                  {index < currentStep ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-[#EAEAEA]' : 'text-[#EAEAEA]/60'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-[#EAEAEA]/60">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-[#00F0FF]' : 'bg-[#2F2F2F]'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-[#EAEAEA] mb-4">Basic Information</h3>
                
                {/* Brand Name */}
                <div>
                  <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-3 bg-[#2F2F2F] border rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/60 focus:outline-none focus:ring-2 focus:ring-[#00F0FF] transition-all ${
                      errors.name ? 'border-[#FF00B8]' : 'border-[#2F2F2F]'
                    }`}
                    placeholder="e.g., My Coffee Shop"
                  />
                  {errors.name && (
                    <p className="text-[#FF00B8] text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                    Logo *
                  </label>
                  <LogoUploader
                    onLogoUploaded={handleLogoUploaded}
                    onError={(error) => setErrors(prev => ({ ...prev, logo: error }))}
                    currentLogoUrl={formData.logo.variants[0]?.url}
                    userId={user?.uid}
                  />
                  {errors.logo && (
                    <p className="text-[#FF00B8] text-sm mt-1">{errors.logo}</p>
                  )}
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="colors"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-[#EAEAEA] mb-4">Brand Colors</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                      Primary Color *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.colors.primary}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          colors: { ...prev.colors, primary: e.target.value }
                        }))}
                        className="w-12 h-12 rounded border-2 border-[#2F2F2F] bg-[#2F2F2F] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.colors.primary}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          colors: { ...prev.colors, primary: e.target.value }
                        }))}
                        className="flex-1 px-3 py-2 bg-[#2F2F2F] border border-[#2F2F2F] rounded text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                        placeholder="#00F0FF"
                      />
                    </div>
                    {errors.primary && (
                      <p className="text-[#FF00B8] text-sm mt-1">{errors.primary}</p>
                    )}
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                      Secondary Color *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.colors.secondary}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          colors: { ...prev.colors, secondary: e.target.value }
                        }))}
                        className="w-12 h-12 rounded border-2 border-[#2F2F2F] bg-[#2F2F2F] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.colors.secondary}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          colors: { ...prev.colors, secondary: e.target.value }
                        }))}
                        className="flex-1 px-3 py-2 bg-[#2F2F2F] border border-[#2F2F2F] rounded text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                        placeholder="#FF00B8"
                      />
                    </div>
                    {errors.secondary && (
                      <p className="text-[#FF00B8] text-sm mt-1">{errors.secondary}</p>
                    )}
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                      Accent Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.colors.accent}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          colors: { ...prev.colors, accent: e.target.value }
                        }))}
                        className="w-12 h-12 rounded border-2 border-[#2F2F2F] bg-[#2F2F2F] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.colors.accent}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          colors: { ...prev.colors, accent: e.target.value }
                        }))}
                        className="flex-1 px-3 py-2 bg-[#2F2F2F] border border-[#2F2F2F] rounded text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                        placeholder="#2F2F2F"
                      />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20">
                  <h4 className="text-[#EAEAEA] font-medium mb-3">Color Preview</h4>
                  <div className="flex gap-3">
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-[#2F2F2F] mb-2"
                        style={{ backgroundColor: formData.colors.primary }}
                      />
                      <p className="text-xs text-[#EAEAEA]/60">Primary</p>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-[#2F2F2F] mb-2"
                        style={{ backgroundColor: formData.colors.secondary }}
                      />
                      <p className="text-xs text-[#EAEAEA]/60">Secondary</p>
                    </div>
                    <div className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-[#2F2F2F] mb-2"
                        style={{ backgroundColor: formData.colors.accent }}
                      />
                      <p className="text-xs text-[#EAEAEA]/60">Accent</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="fonts"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-[#EAEAEA] mb-4">Typography</h3>
                
                <div className="space-y-6">
                  {/* Heading Font */}
                  <div>
                    <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                      Heading Font *
                    </label>
                    <select
                      value={formData.fonts.heading}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        fonts: { ...prev.fonts, heading: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                    >
                      {fontOptions.map(font => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                    {errors.heading && (
                      <p className="text-[#FF00B8] text-sm mt-1">{errors.heading}</p>
                    )}
                  </div>

                  {/* Body Font */}
                  <div>
                    <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                      Body Font *
                    </label>
                    <select
                      value={formData.fonts.body}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        fonts: { ...prev.fonts, body: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                    >
                      {fontOptions.map(font => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                    {errors.body && (
                      <p className="text-[#FF00B8] text-sm mt-1">{errors.body}</p>
                    )}
                  </div>

                  {/* Accent Font */}
                  <div>
                    <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                      Accent Font (Optional)
                    </label>
                    <select
                      value={formData.fonts.accent}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        fonts: { ...prev.fonts, accent: e.target.value }
                      }))}
                      className="w-full px-4 py-3 bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg text-[#EAEAEA] focus:outline-none focus:ring-2 focus:ring-[#00F0FF]"
                    >
                      {fontOptions.map(font => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Font Preview */}
                <div className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20">
                  <h4 className="text-[#EAEAEA] font-medium mb-3">Typography Preview</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-[#EAEAEA]/60 mb-1">Heading Font</p>
                      <h2 
                        className="text-2xl font-bold text-[#EAEAEA]"
                        style={{ fontFamily: formData.fonts.heading }}
                      >
                        Your Brand Name
                      </h2>
                    </div>
                    <div>
                      <p className="text-xs text-[#EAEAEA]/60 mb-1">Body Font</p>
                      <p 
                        className="text-[#EAEAEA]/80"
                        style={{ fontFamily: formData.fonts.body }}
                      >
                        This is how your body text will look in campaigns and marketing materials.
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#EAEAEA]/60 mb-1">Accent Font</p>
                      <p 
                        className="text-lg font-medium"
                        style={{ 
                          fontFamily: formData.fonts.accent,
                          color: formData.colors.primary
                        }}
                      >
                        Call to Action
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-[#EAEAEA] mb-4">Preview & Create</h3>
                
                {/* Brand Summary */}
                <div className="bg-[#2F2F2F]/50 rounded-lg p-6 border border-[#00F0FF]/20">
                  <div className="flex items-center gap-4 mb-4">
                    {formData.logo.variants.length > 0 && (
                      <div className="w-16 h-16 bg-[#2F2F2F] rounded-lg border border-[#00F0FF]/20 flex items-center justify-center p-2">
                        <img 
                          src={formData.logo.variants[0]?.url} 
                          alt="Logo preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xl font-bold text-[#EAEAEA]" style={{ fontFamily: formData.fonts.heading }}>
                        {formData.name}
                      </h4>
                      <p className="text-[#EAEAEA]/60" style={{ fontFamily: formData.fonts.body }}>
                        Brand identity ready for campaigns
                      </p>
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-[#EAEAEA] mb-2">Colors</h5>
                      <div className="flex gap-2">
                        <div className="text-center">
                          <div 
                            className="w-8 h-8 rounded border-2 border-[#2F2F2F] mb-1"
                            style={{ backgroundColor: formData.colors.primary }}
                          />
                          <p className="text-xs text-[#EAEAEA]/60">Primary</p>
                        </div>
                        <div className="text-center">
                          <div 
                            className="w-8 h-8 rounded border-2 border-[#2F2F2F] mb-1"
                            style={{ backgroundColor: formData.colors.secondary }}
                          />
                          <p className="text-xs text-[#EAEAEA]/60">Secondary</p>
                        </div>
                        <div className="text-center">
                          <div 
                            className="w-8 h-8 rounded border-2 border-[#2F2F2F] mb-1"
                            style={{ backgroundColor: formData.colors.accent }}
                          />
                          <p className="text-xs text-[#EAEAEA]/60">Accent</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-[#EAEAEA] mb-2">Typography</h5>
                      <div className="space-y-1">
                        <p className="text-xs text-[#EAEAEA]/60">Heading: {formData.fonts.heading}</p>
                        <p className="text-xs text-[#EAEAEA]/60">Body: {formData.fonts.body}</p>
                        <p className="text-xs text-[#EAEAEA]/60">Accent: {formData.fonts.accent}</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-[#EAEAEA] mb-2">Logo Analysis</h5>
                      <div className="space-y-1">
                        <p className="text-xs text-[#EAEAEA]/60">
                          Colors: {formData.logo.analysis.extracted.palette.length} extracted
                        </p>
                        <p className="text-xs text-[#EAEAEA]/60">
                          Confidence: {Math.round(formData.logo.analysis.extracted.confidence * 100)}%
                        </p>
                        <p className={`text-xs ${
                          formData.logo.analysis.contrast.isAccessible ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {formData.logo.analysis.contrast.isAccessible ? 'WCAG Compliant' : 'Needs attention'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Set as Default */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="w-5 h-5 rounded border-2 border-[#2F2F2F] bg-[#2F2F2F] checked:bg-[#00F0FF] checked:border-[#00F0FF] focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/50"
                  />
                  <span className="text-[#EAEAEA]">Set as default brand for new campaigns</span>
                </label>

                {errors.submit && (
                  <div className="bg-[#FF00B8]/20 border border-[#FF00B8]/40 rounded-lg p-4">
                    <p className="text-[#FF00B8]">{errors.submit}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2F2F2F] flex justify-between">
          <button
            onClick={currentStep === 0 ? (onCancel || (() => router.back())) : prevStep}
            disabled={isCreating}
            className="px-6 py-3 text-[#EAEAEA] hover:text-[#00F0FF] transition-colors disabled:opacity-50"
          >
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </button>
          
          <button
            onClick={nextStep}
            disabled={isCreating}
            className="px-8 py-3 bg-[#00F0FF] text-[#1A1A1A] rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)] disabled:opacity-50 flex items-center gap-2"
          >
            {isCreating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full"
                />
                Creating...
              </>
            ) : currentStep === steps.length - 1 ? (
              'Create Brand'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandCreator; 