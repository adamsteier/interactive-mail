'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveDesignAsTemplate, CreateTemplateRequest } from '../../services/templateService';
import { V2Brand } from '../../types/brand';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (templateId: string) => void;
  
  // Design data
  originalImageUrl: string;
  creativeBrief: string;
  prompt: string;
  logoPosition: { x: number; y: number; width: number; height: number };
  logoUrl: string;
  
  // Context
  brand: V2Brand;
  campaignId: string;
  designId: string;
  selectedOption: 'A' | 'B';
  aiProvider: 'openai' | 'ideogram';
  userId: string;
}

const TEMPLATE_CATEGORIES = [
  'restaurant',
  'retail',
  'healthcare',
  'automotive',
  'real-estate',
  'fitness',
  'beauty',
  'professional-services',
  'home-services',
  'education',
  'entertainment',
  'technology',
  'non-profit',
  'other'
];

const SaveTemplateModal = ({
  isOpen,
  onClose,
  onSaved,
  originalImageUrl,
  creativeBrief,
  prompt,
  logoPosition,
  logoUrl,
  brand,
  campaignId,
  designId,
  selectedOption,
  aiProvider,
  userId
}: SaveTemplateModalProps) => {
  const [formData, setFormData] = useState({
    name: `${brand.name} - ${selectedOption} Design`,
    description: '',
    category: brand.businessInfo?.type || 'other',
    tags: '',
    isPublic: false
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle form submission
  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      setError('Template name is required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Parse tags
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const request: CreateTemplateRequest = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        tags,
        
        originalImageUrl,
        creativeBrief,
        prompt,
        logoPosition,
        logoUrl,
        
        brand,
        campaignId,
        designId,
        selectedOption,
        aiProvider,
        
        isPublic: formData.isPublic
      };

      const result = await saveDesignAsTemplate(userId, request);

      if (result.success && result.templateId) {
        setSuccess(true);
        setTimeout(() => {
          onSaved(result.templateId!);
          onClose();
          // Reset form
          setFormData({
            name: `${brand.name} - ${selectedOption} Design`,
            description: '',
            category: brand.businessInfo?.type || 'other',
            tags: '',
            isPublic: false
          });
          setSuccess(false);
        }, 1500);
      } else {
        setError(result.error || 'Failed to save template');
      }

    } catch (error) {
      console.error('Error saving template:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsSaving(false);
    }
  }, [formData, originalImageUrl, creativeBrief, prompt, logoPosition, logoUrl, brand, campaignId, designId, selectedOption, aiProvider, userId, onSaved, onClose]);

  // Handle form field changes
  const handleInputChange = useCallback((field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (!isSaving) {
      onClose();
      setError(null);
      setSuccess(false);
    }
  }, [isSaving, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1A1A1A] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-[#EAEAEA]">
                Save as Template
              </h3>
              <p className="text-sm text-[#EAEAEA]/60 mt-1">
                Save this design for future campaigns
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="text-[#EAEAEA]/60 hover:text-[#EAEAEA] transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {success ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-[#EAEAEA] mb-2">Template Saved!</h4>
              <p className="text-sm text-[#EAEAEA]/60">
                Your design has been saved and can be reused in future campaigns.
              </p>
            </div>
          ) : (
            /* Form */
            <div className="space-y-4">
              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isSaving}
                  className="w-full bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg px-3 py-2 text-[#EAEAEA] placeholder-[#EAEAEA]/40 focus:outline-none focus:border-[#00F0FF] disabled:opacity-50"
                  placeholder="Enter template name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={isSaving}
                  rows={3}
                  className="w-full bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg px-3 py-2 text-[#EAEAEA] placeholder-[#EAEAEA]/40 focus:outline-none focus:border-[#00F0FF] disabled:opacity-50 resize-none"
                  placeholder="Describe this template (optional)"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={isSaving}
                  className="w-full bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg px-3 py-2 text-[#EAEAEA] focus:outline-none focus:border-[#00F0FF] disabled:opacity-50"
                >
                  {TEMPLATE_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-[#EAEAEA] mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  disabled={isSaving}
                  className="w-full bg-[#2F2F2F] border border-[#2F2F2F] rounded-lg px-3 py-2 text-[#EAEAEA] placeholder-[#EAEAEA]/40 focus:outline-none focus:border-[#00F0FF] disabled:opacity-50"
                  placeholder="Enter tags separated by commas"
                />
                <p className="text-xs text-[#EAEAEA]/40 mt-1">
                  e.g., modern, professional, colorful
                </p>
              </div>

              {/* Public Template Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-[#EAEAEA]">
                    Make Public Template
                  </label>
                  <p className="text-xs text-[#EAEAEA]/60">
                    Allow other users to see and use this template
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('isPublic', !formData.isPublic)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-2 focus:ring-offset-[#1A1A1A] disabled:opacity-50 ${
                    formData.isPublic ? 'bg-[#00F0FF]' : 'bg-[#2F2F2F]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Template Info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-xs text-blue-400">
                    <p className="font-medium mb-1">Template will include:</p>
                    <ul className="space-y-0.5 text-blue-400/80">
                      <li>• Final image with your logo positioned</li>
                      <li>• Creative brief and AI prompt</li>
                      <li>• Brand colors and styling</li>
                      <li>• Logo positioning data</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClose}
                  disabled={isSaving}
                  className="flex-1 bg-[#2F2F2F] text-[#EAEAEA] py-3 px-4 rounded-lg font-medium hover:bg-[#2F2F2F]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !formData.name.trim()}
                  className="flex-1 bg-[#00F0FF] text-[#1A1A1A] py-3 px-4 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Template'
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaveTemplateModal;
