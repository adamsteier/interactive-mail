'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SimpleLogoOverlay from './SimpleLogoOverlay';
import LogoOverlay from './LogoOverlay';
import SaveTemplateModal from './SaveTemplateModal';
import { useLogoPosition } from '../../hooks/useLogoPosition';
import { LogoPositionData } from '../../utils/logoPositionParser';
import { V2Brand } from '../../types/brand';

interface DesignOptionCardProps {
  // Design data
  imageUrl: string;
  optionLabel: 'A' | 'B';
  isSelected: boolean;
  executionTime?: number;
  
  // Brand data for logo
  brand: V2Brand;
  logoPosition: LogoPositionData | null;
  
  // Template saving data
  creativeBrief?: string;
  prompt?: string;
  campaignId?: string;
  designId?: string;
  aiProvider?: 'openai' | 'ideogram';
  userId?: string;
  
  // Interaction
  onSelect: () => void;
  onLogoPositionChange?: (position: { x: number; y: number }) => void;
  onLogoSizeChange?: (dimensions: { width: number; height: number }) => void;
  onTemplateSaved?: (templateId: string) => void;
  
  // Options
  disabled?: boolean;
  className?: string;
}

const DesignOptionCard = ({
  imageUrl,
  optionLabel,
  isSelected,
  executionTime,
  brand,
  logoPosition,
  creativeBrief,
  prompt,
  campaignId,
  designId,
  aiProvider,
  userId,
  onSelect,
  onLogoPositionChange,
  onLogoSizeChange,
  onTemplateSaved,
  disabled = false,
  className = ''
}: DesignOptionCardProps) => {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [cardDimensions, setCardDimensions] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Logo position management
  const {
    logoPosition: currentLogoPosition,
    isVisible: logoVisible,
    setIsVisible: setLogoVisible,
    updatePosition,
    updateSize,
    resetToDefault,
    hasChanges
  } = useLogoPosition({
    logoAnalysis: logoPosition ? {
      width: logoPosition.dimensions.width,
      height: logoPosition.dimensions.height,
      position: logoPosition.position,
      backgroundRequirement: logoPosition.backgroundRequirement,
      promptInstructions: '' // Not needed for this use case
    } : undefined,
    onPositionChange: onLogoPositionChange,
    onSizeChange: onLogoSizeChange
  });
  
  // Measure card dimensions for logo scaling
  useEffect(() => {
    const updateDimensions = () => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        setCardDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const logoUrl = brand.logo?.variants?.[0]?.url;
  const hasLogo = logoUrl && currentLogoPosition;
  
  return (
    <>
      <div className={`relative rounded-lg border-2 transition-all duration-200 ${
        isSelected 
          ? `border-[${optionLabel === 'A' ? '#00F0FF' : '#FF00B8'}] bg-[${optionLabel === 'A' ? '#00F0FF' : '#FF00B8'}]/5` 
          : 'border-[#2F2F2F] hover:border-[#00F0FF]/50'
      } ${className}`}>
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[#EAEAEA] font-medium flex items-center gap-2">
              <div className={`w-6 h-6 ${
                optionLabel === 'A' ? 'bg-[#00F0FF]' : 'bg-[#FF00B8]'
              } text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                {optionLabel}
              </div>
              Option {optionLabel}
              {hasChanges && (
                <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Logo position modified" />
              )}
            </h5>
            <div className="flex items-center gap-2">
              {executionTime && (
                <span className="text-xs text-[#EAEAEA]/60">
                  {executionTime}ms
                </span>
              )}
              {hasLogo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLogoVisible(!logoVisible);
                  }}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    logoVisible 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  {logoVisible ? 'Logo ON' : 'Logo OFF'}
                </button>
              )}
            </div>
          </div>
          
          {/* Image with Logo Overlay */}
          <div 
            ref={cardRef}
            className="relative group mb-4 cursor-pointer" 
            onClick={() => setShowFullPreview(true)}
            style={{ paddingBottom: '66.67%' }} // 3:2 aspect ratio
          >
            <div className="absolute inset-0">
              <img 
                src={imageUrl} 
                alt={`Design Option ${optionLabel}`}
                className="w-full h-full object-cover rounded-lg"
              />
              
              {/* Simple Logo Overlay for card view */}
              {hasLogo && logoVisible && currentLogoPosition && cardDimensions.width > 0 && (
                <SimpleLogoOverlay
                  logoUrl={logoUrl}
                  logoPosition={currentLogoPosition}
                  containerWidth={cardDimensions.width}
                  containerHeight={cardDimensions.height}
                  opacity={0.9}
                />
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white px-3 py-2 rounded text-sm">
                  Click to customize logo position
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={onSelect}
              disabled={disabled}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                isSelected
                  ? `bg-[${optionLabel === 'A' ? '#00F0FF' : '#FF00B8'}] text-[#1A1A1A]`
                  : `bg-[${optionLabel === 'A' ? '#00F0FF' : '#FF00B8'}]/20 border border-[${optionLabel === 'A' ? '#00F0FF' : '#FF00B8'}]/40 text-[${optionLabel === 'A' ? '#00F0FF' : '#FF00B8'}] hover:bg-[${optionLabel === 'A' ? '#00F0FF' : '#FF00B8'}]/30`
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSelected ? 'Selected' : `Select Option ${optionLabel}`}
            </button>
            
            {/* Save as Template Button */}
            {isSelected && creativeBrief && prompt && campaignId && designId && aiProvider && userId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSaveTemplate(true);
                }}
                className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-green-600/20 border border-green-600/40 text-green-400 hover:bg-green-600/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Save as Template
              </button>
            )}
          </div>
          
          {/* Logo Controls */}
          {hasLogo && logoVisible && (
            <div className="mt-3 pt-3 border-t border-[#2F2F2F]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#EAEAEA]/60">Logo Controls:</span>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetToDefault();
                    }}
                    className="text-[#00F0FF] hover:text-[#00F0FF]/80 transition-colors"
                    disabled={!hasChanges}
                  >
                    Reset
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullPreview(true);
                    }}
                    className="text-[#00F0FF] hover:text-[#00F0FF]/80 transition-colors"
                  >
                    Customize
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Full Preview Modal */}
      <AnimatePresence>
        {showFullPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFullPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1A1A1A] rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-[#EAEAEA]">
                  Option {optionLabel} - Logo Positioning
                </h3>
                <button
                  onClick={() => setShowFullPreview(false)}
                  className="text-[#EAEAEA]/60 hover:text-[#EAEAEA] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Full Size Preview with Interactive Logo */}
              <div className="relative bg-white rounded-lg" style={{ aspectRatio: '3/2' }}>
                <img 
                  src={imageUrl} 
                  alt={`Design Option ${optionLabel}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                
                {/* Interactive Logo Overlay */}
                {hasLogo && currentLogoPosition && (
                  <LogoOverlay
                    logoUrl={logoUrl}
                    logoPosition={currentLogoPosition}
                    containerWidth={800} // Fixed width for consistent scaling
                    containerHeight={533} // 3:2 ratio
                    isVisible={logoVisible}
                    onPositionChange={updatePosition}
                    onSizeChange={updateSize}
                    onVisibilityToggle={setLogoVisible}
                  />
                )}
              </div>
              
              {/* Instructions */}
              <div className="mt-4 text-sm text-[#EAEAEA]/60">
                <p>• <strong>Drag</strong> the logo to reposition it</p>
                <p>• <strong>Click + Arrow keys</strong> for pixel-perfect positioning</p>
                <p>• <strong>Corner handles</strong> to resize (maintains aspect ratio)</p>
                <p>• <strong>Shift+Arrow</strong> for 10px movements</p>
                <p>• Logo stays within safe print area automatically</p>
                <p>• Changes are saved in real-time</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Save Template Modal */}
      {creativeBrief && prompt && campaignId && designId && aiProvider && userId && (
        <SaveTemplateModal
          isOpen={showSaveTemplate}
          onClose={() => setShowSaveTemplate(false)}
          onSaved={(templateId) => {
            setShowSaveTemplate(false);
            onTemplateSaved?.(templateId);
          }}
          originalImageUrl={imageUrl}
          creativeBrief={creativeBrief}
          prompt={prompt}
          logoPosition={{
            x: currentLogoPosition?.pixels.position.x || 0,
            y: currentLogoPosition?.pixels.position.y || 0,
            width: currentLogoPosition?.pixels.dimensions.width || 0,
            height: currentLogoPosition?.pixels.dimensions.height || 0
          }}
          logoUrl={logoUrl || ''}
          brand={brand}
          campaignId={campaignId}
          designId={designId}
          selectedOption={optionLabel}
          aiProvider={aiProvider}
          userId={userId}
        />
      )}
    </>
  );
};

export default DesignOptionCard;
