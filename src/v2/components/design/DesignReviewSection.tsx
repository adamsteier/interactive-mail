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
    openai?: {
      frontImageUrl?: string;
      executionTime?: number;
    };
    ideogram?: {
      frontImageUrl?: string;
      executionTime?: number;
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
  
  // Parse logo position from creative brief
  const logoPosition = assignment.creativeBrief?.briefText 
    ? parseLogoPositionFromBrief(assignment.creativeBrief.briefText)
    : null;
  
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
            Choose your preferred design option
            {hasLogo && ' and customize logo placement'}
          </p>
        </div>
        
        {assignment.selectedOption && (
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${
              assignment.selectedOption === 'A' ? 'bg-[#00F0FF]' : 'bg-[#FF00B8]'
            }`} />
            <span className="text-[#EAEAEA]/60">
              Option {assignment.selectedOption} Selected
            </span>
          </div>
        )}
      </div>
      
      {/* Design Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Option A */}
        {assignment.generationResult.openai?.frontImageUrl && logoPosition && (
          <DesignOptionCard
            imageUrl={assignment.generationResult.openai.frontImageUrl}
            optionLabel="A"
            isSelected={assignment.selectedOption === 'A'}
            executionTime={assignment.generationResult.openai.executionTime}
            brand={brand}
            logoPosition={logoPosition}
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
        {assignment.generationResult.ideogram?.frontImageUrl && logoPosition && (
          <DesignOptionCard
            imageUrl={assignment.generationResult.ideogram.frontImageUrl}
            optionLabel="B"
            isSelected={assignment.selectedOption === 'B'}
            executionTime={assignment.generationResult.ideogram.executionTime}
            brand={brand}
            logoPosition={logoPosition}
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
      
      {/* No Logo Warning */}
      {!hasLogo && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            No logo uploaded for this brand. Logo overlay features are disabled.
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
