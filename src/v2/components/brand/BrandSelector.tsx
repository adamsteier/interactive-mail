'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBrandSelection } from '../../hooks/useBrands';
import { BrandSummary } from '../../types/brand';
import { usePricing } from '../../hooks/usePricing';

interface BrandSelectorProps {
  leadCount: number;
  businessTypes: string[];
  onBrandSelected: (brandId: string) => void;
  onCreateNew: () => void;
}

const BrandSelector = ({ 
  leadCount, 
  businessTypes, 
  onBrandSelected,
  onCreateNew 
}: BrandSelectorProps) => {
  const { 
    brands, 
    selectedBrand, 
    hasNoBrands, 
    shouldAutoProceed, 
    loading,
    actions 
  } = useBrandSelection();
  
  const { formatted } = usePricing(leadCount);

  // Auto-proceed if user has only one brand
  useEffect(() => {
    if (shouldAutoProceed && selectedBrand) {
      // Small delay for better UX
      const timer = setTimeout(() => {
        onBrandSelected(selectedBrand.id);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldAutoProceed, selectedBrand, onBrandSelected]);

  const handleBrandSelect = (brandId: string) => {
    actions.select(brandId);
    onBrandSelected(brandId);
  };

  const handleCreateNew = () => {
    onCreateNew();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00F0FF] mx-auto mb-4"></div>
          <p className="text-[#00F0FF]">Loading your brands...</p>
        </div>
      </div>
    );
  }

  if (shouldAutoProceed && selectedBrand) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-16 h-16 rounded-full bg-electric-teal/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-electric-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-electric-teal mb-2">
            Using {selectedBrand.name}
          </h2>
          <p className="text-electric-teal/60">
            Proceeding to design creation...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Header with wave design */}
      <div className="border-b border-[#00F0FF]/20 bg-[#1A1A1A]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#EAEAEA] mb-2">
                Choose Your Brand
              </h1>
              <p className="text-[#EAEAEA]/60">
                Select a brand for your {leadCount} postcards to {businessTypes.join(', ')}
              </p>
            </div>
            <div className="text-right">
              <div className="bg-[#2F2F2F]/60 rounded-lg px-4 py-3 border border-[#00F0FF]/30">
                <div className="text-sm text-[#EAEAEA]/60 mb-1">Campaign Cost</div>
                <div className="text-2xl font-bold text-[#00F0FF]">
                  {formatted.totalCost}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {hasNoBrands ? (
          /* No Brands State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 rounded-full bg-electric-teal/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-electric-teal/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-electric-teal mb-2">
              Let&apos;s Create Your First Brand
            </h2>
            <p className="text-electric-teal/60 mb-8 max-w-md mx-auto">
              Set up your business brand with logo, colors, and contact info. 
              You&apos;ll reuse this for future campaigns.
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-electric-teal text-charcoal px-8 py-3 rounded-lg font-semibold hover:bg-electric-teal/90 transition-colors"
            >
              Create Your Brand
            </button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Recently Used Section */}
            {brands.some(brand => brand.lastUsed) && (
              <section>
                <h2 className="text-xl font-semibold text-electric-teal mb-4">
                  Recently Used
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brands
                    .filter(brand => brand.lastUsed)
                    .slice(0, 3)
                    .map(brand => (
                      <BrandCard
                        key={brand.id}
                        brand={brand}
                        isSelected={selectedBrand?.id === brand.id}
                        onSelect={() => handleBrandSelect(brand.id)}
                      />
                    ))}
                </div>
              </section>
            )}

            {/* All Brands Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-electric-teal">
                  Your Brands ({brands.length})
                </h2>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 text-electric-teal hover:text-electric-teal/80 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Brand
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {brands.map(brand => (
                  <BrandCard
                    key={brand.id}
                    brand={brand}
                    isSelected={selectedBrand?.id === brand.id}
                    onSelect={() => handleBrandSelect(brand.id)}
                  />
                ))}
              </div>
            </section>

            {/* Continue Button */}
            {selectedBrand && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center pt-8"
              >
                <button
                  onClick={() => onBrandSelected(selectedBrand.id)}
                  className="bg-electric-teal text-charcoal px-8 py-3 rounded-lg font-semibold hover:bg-electric-teal/90 transition-colors flex items-center gap-2"
                >
                  Continue with {selectedBrand.name}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface BrandCardProps {
  brand: BrandSummary;
  isSelected: boolean;
  onSelect: () => void;
}

const BrandCard = ({ brand, isSelected, onSelect }: BrandCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative cursor-pointer rounded-lg border-2 transition-all duration-200
        ${isSelected 
          ? 'border-electric-teal bg-electric-teal/10' 
          : 'border-electric-teal/20 bg-charcoal hover:border-electric-teal/40'
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div className="p-6">
        {/* Logo and Name */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-electric-teal/20 flex items-center justify-center flex-shrink-0">
            {brand.logoUrl && !imageError ? (
              <img 
                src={brand.logoUrl} 
                alt={brand.name}
                className="w-8 h-8 object-contain"
                onError={() => setImageError(true)}
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg" 
                style={{ backgroundColor: brand.primaryColor || '#00c2a8' }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-electric-teal truncate">
              {brand.name}
            </h3>
            {brand.isDefault && (
              <span className="text-xs text-electric-teal/60 bg-electric-teal/10 px-2 py-1 rounded">
                Default
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-electric-teal/60">Campaigns</span>
            <span className="text-electric-teal">{brand.totalCampaigns}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-electric-teal/60">Completeness</span>
            <span className="text-electric-teal">{brand.completeness}%</span>
          </div>
          {brand.lastUsed && (
            <div className="flex justify-between">
              <span className="text-electric-teal/60">Last Used</span>
              <span className="text-electric-teal">
                {new Date(brand.lastUsed.seconds * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        {/* Completeness Bar */}
        <div className="mt-4">
          <div className="w-full bg-electric-teal/10 rounded-full h-2">
            <div 
              className="bg-electric-teal h-2 rounded-full transition-all duration-300"
              style={{ width: `${brand.completeness}%` }}
            />
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 w-6 h-6 bg-electric-teal rounded-full flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}

        {/* Quick Actions on Hover */}
        <AnimatePresence>
          {isHovered && !isSelected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-3 right-3 flex gap-1"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement edit
                }}
                className="w-8 h-8 bg-electric-teal/20 hover:bg-electric-teal/30 rounded-full flex items-center justify-center transition-colors"
                title="Edit Brand"
              >
                <svg className="w-4 h-4 text-electric-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // TODO: Implement clone
                }}
                className="w-8 h-8 bg-electric-teal/20 hover:bg-electric-teal/30 rounded-full flex items-center justify-center transition-colors"
                title="Clone Brand"
              >
                <svg className="w-4 h-4 text-electric-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default BrandSelector; 