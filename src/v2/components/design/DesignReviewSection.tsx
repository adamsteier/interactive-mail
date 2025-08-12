'use client';

import { useState } from 'react';
import DesignOptionCard from './DesignOptionCard';
import { parseLogoPositionFromBrief } from '../../utils/logoPositionParser';
import { V2Brand } from '../../types/brand';

interface DesignAssignment {
  designId: string;
  businessTypes: string[];
  selectedOption?: 'A' | 'B';
  generationResult: {
    brief1?: {
      frontImageUrl?: string;
      executionTime?: number;
      briefText?: string;
      model?: string;
      temperature?: number;
      reasoning?: string;
      briefId?: string;
    };
    brief2?: {
      frontImageUrl?: string;
      executionTime?: number;
      briefText?: string;
      model?: string;
      temperature?: number;
      reasoning?: string;
      briefId?: string;
    };
  };
  creativeBrief?: {
    briefText: string;
  };
  prompt?: string;
  campaignId?: string;
}

interface DesignReviewSectionProps {
  assignment: DesignAssignment;
  brand: V2Brand;
  onOptionSelect: (designId: string, option: 'A' | 'B') => void;
  savingChanges?: boolean;
}

/**
 * Enhanced design review section with logo overlay support
 * Drop-in replacement for the current review page design section
 */
const DesignReviewSection = ({
  assignment,
  brand,
  onOptionSelect,
  savingChanges = false
}: DesignReviewSectionProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [logoPositions, setLogoPositions] = useState<{
    A?: { x: number; y: number };
    B?: { x: number; y: number };
  }>({});
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [logoSizes, setLogoSizes] = useState<{
    A?: { width: number; height: number };
    B?: { width: number; height: number };
  }>({});
  
  // Parse logo position from creative brief, with fallback to default position
  const logoPosition = assignment.creativeBrief?.briefText 
    ? parseLogoPositionFromBrief(assignment.creativeBrief.briefText)
    : null;
  
  // Create default logo position if none exists but brand has logo
  const defaultLogoPosition = {
    position: { x: 'bottom-right', y: 'bottom-right' } as const,
    dimensions: { width: 1, height: 0.75 }, // inches
    backgroundRequirement: 'any' as const,
    pixels: {
      position: { x: 400, y: 300 }, // Default position in pixels
      dimensions: { width: 144, height: 108 }, // Default size in pixels (1" x 0.75" at 144 DPI)
      safeZone: {
        minX: 36, // 0.25" margin
        minY: 36,
        maxX: 828, // 6" - 0.25" margin at 144 DPI
        maxY: 540  // 4" - 0.25" margin at 144 DPI
      }
    }
  };
  
  // Use parsed position or default if brand has logo
  const effectiveLogoPosition = logoPosition || (hasLogo ? defaultLogoPosition : null);
  
  // Handle logo position changes
  const handleLogoPositionChange = (option: 'A' | 'B', position: { x: number; y: number }) => {
    setLogoPositions(prev => ({
      ...prev,
      [option]: position
    }));
    
    // TODO: Save to database or parent component
    console.log(`Logo position changed for Option ${option}:`, position);
  };
  
  const handleLogoSizeChange = (option: 'A' | 'B', dimensions: { width: number; height: number }) => {
    setLogoSizes(prev => ({
      ...prev,
      [option]: dimensions
    }));
    
    // TODO: Save to database or parent component
    console.log(`Logo size changed for Option ${option}:`, dimensions);
  };
  
  const hasLogo = brand.logo?.variants?.length > 0;
  
  return (
    <div className="bg-[#1A1A1A] rounded-lg p-6 border border-[#2F2F2F]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-lg font-semibold text-[#EAEAEA] mb-1">
            Design for {assignment.businessTypes.map(type => 
              type.replace(/_/g, ' ')
            ).join(', ')}
          </h4>
          <p className="text-sm text-[#EAEAEA]/60">
            Choose your preferred creative brief approach
            {hasLogo && ' and customize logo placement'}
          </p>
        </div>
        
        {assignment.selectedOption && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${
              assignment.selectedOption === 'A' ? 'bg-[#00F0FF]' : 'bg-[#FF00B8]'
            }`} />
            <span className="text-[#EAEAEA]/60">
              Brief {assignment.selectedOption === 'A' ? '1' : '2'} Selected
            </span>
          </div>
        )}
      </div>
      
      {/* Design Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option A */}
        {assignment.generationResult.openai?.frontImageUrl && (
          <DesignOptionCard
            imageUrl={assignment.generationResult.openai.frontImageUrl}
            optionLabel="A"
            isSelected={assignment.selectedOption === 'A'}
            executionTime={assignment.generationResult.openai.executionTime}
            brand={brand}
            logoPosition={effectiveLogoPosition}
            creativeBrief={assignment.creativeBrief?.briefText}
            prompt={assignment.prompt}
            campaignId={assignment.campaignId}
            designId={assignment.designId}
            aiProvider="openai"
            userId={brand.ownerUid}
            onSelect={() => onOptionSelect(assignment.designId, 'A')}
            onLogoPositionChange={(position) => handleLogoPositionChange('A', position)}
            onLogoSizeChange={(dimensions) => handleLogoSizeChange('A', dimensions)}
            onTemplateSaved={(templateId) => console.log('Template A saved:', templateId)}
            disabled={savingChanges}
          />
        )}
        
        {/* Option B */}
        {assignment.generationResult.ideogram?.frontImageUrl && (
          <DesignOptionCard
            imageUrl={assignment.generationResult.ideogram.frontImageUrl}
            optionLabel="B"
            isSelected={assignment.selectedOption === 'B'}
            executionTime={assignment.generationResult.ideogram.executionTime}
            brand={brand}
            logoPosition={effectiveLogoPosition}
            creativeBrief={assignment.creativeBrief?.briefText}
            prompt={assignment.prompt}
            campaignId={assignment.campaignId}
            designId={assignment.designId}
            aiProvider="ideogram"
            userId={brand.ownerUid}
            onSelect={() => onOptionSelect(assignment.designId, 'B')}
            onLogoPositionChange={(position) => handleLogoPositionChange('B', position)}
            onLogoSizeChange={(dimensions) => handleLogoSizeChange('B', dimensions)}
            onTemplateSaved={(templateId) => console.log('Template B saved:', templateId)}
            disabled={savingChanges}
          />
        )}
      </div>
      
      {/* No Logo Warning with Upload Option */}
      {!hasLogo && (
        <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-400 font-medium text-sm">No Logo Available</p>
                <p className="text-blue-400/70 text-xs">Add a logo to enable positioning and overlay features</p>
              </div>
            </div>
            <button
              onClick={() => {
                // Navigate to brand selection page to create/edit brand
                window.open(`/v2/build/${assignment.campaignId}/brand`, '_blank');
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Logo
            </button>
          </div>
        </div>
      )}
      
      {/* Error States */}
      {!assignment.generationResult.openai?.frontImageUrl && !assignment.generationResult.ideogram?.frontImageUrl && (
        <div className="text-center py-8">
          <div className="text-[#FF00B8] mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-[#EAEAEA] mb-1">Generation Failed</h4>
          <p className="text-[#EAEAEA]/60 text-sm">
            Both design options failed to generate. Please try regenerating this design.
          </p>
        </div>
      )}
    </div>
  );
};

export default DesignReviewSection;
