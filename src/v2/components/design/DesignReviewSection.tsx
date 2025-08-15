'use client';

import { useState, useEffect } from 'react';
import DesignOptionCard from './DesignOptionCard';
import { parseLogoPositionFromBrief } from '../../utils/logoPositionParser';
import { V2Brand } from '../../types/brand';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  const [logoPositions, setLogoPositions] = useState<{
    A?: { x: number; y: number };
    B?: { x: number; y: number };
  }>({});
  
  const [logoSizes, setLogoSizes] = useState<{
    A?: { width: number; height: number };
    B?: { width: number; height: number };
  }>({});
  
  // Load saved logo positions from Firebase
  useEffect(() => {
    const loadSavedPositions = async () => {
      if (assignment.campaignId && assignment.designId) {
        try {
          const campaignRef = doc(db, 'campaigns', assignment.campaignId);
          const campaignSnap = await getDoc(campaignRef);
          
          if (campaignSnap.exists()) {
            const data = campaignSnap.data();
            
            // Load saved positions
            if (data.logoPositions?.[assignment.designId]) {
              const savedPositions = data.logoPositions[assignment.designId];
              if (savedPositions.A) {
                setLogoPositions(prev => ({ ...prev, A: { x: savedPositions.A.x, y: savedPositions.A.y } }));
              }
              if (savedPositions.B) {
                setLogoPositions(prev => ({ ...prev, B: { x: savedPositions.B.x, y: savedPositions.B.y } }));
              }
            }
            
            // Load saved sizes
            if (data.logoSizes?.[assignment.designId]) {
              const savedSizes = data.logoSizes[assignment.designId];
              if (savedSizes.A) {
                setLogoSizes(prev => ({ ...prev, A: { width: savedSizes.A.width, height: savedSizes.A.height } }));
              }
              if (savedSizes.B) {
                setLogoSizes(prev => ({ ...prev, B: { width: savedSizes.B.width, height: savedSizes.B.height } }));
              }
            }
          }
        } catch (error) {
          console.error('Error loading saved logo positions:', error);
        }
      }
    };
    
    loadSavedPositions();
  }, [assignment.campaignId, assignment.designId]);
  
  // Parse logo position from creative brief, with fallback to default position
  const logoPosition = assignment.creativeBrief?.briefText 
    ? parseLogoPositionFromBrief(assignment.creativeBrief.briefText)
    : null;
  
  // Create default logo position if none exists but brand has logo
  // Fallback to top-left safe placement with sensible size at 300 DPI
  const defaultLogoPosition = {
    position: { x: 0.25, y: 0.25 }, // Top-left safe zone in inches
    dimensions: { width: 1.5, height: 1.0 }, // inches (adjusted later by aspect as needed elsewhere)
    backgroundRequirement: 'light' as const,
    safeZone: {
      minX: 0.125,
      minY: 0.125,
      maxX: 5.875,
      maxY: 3.875
    },
    pixels: {
      position: { x: Math.round(0.25 * 300), y: Math.round(0.25 * 300) },
      dimensions: { width: Math.round(1.5 * 300), height: Math.round(1.0 * 300) },
      safeZone: {
        minX: Math.round(0.125 * 300),
        minY: Math.round(0.125 * 300),
        maxX: Math.round(5.875 * 300),
        maxY: Math.round(3.875 * 300)
      }
    }
  };
  
  // Check if brand has logo
  const hasLogo = brand.logo?.variants?.length > 0;
  
  // Use parsed position or default if brand has logo
  const effectiveLogoPosition = logoPosition || (hasLogo ? defaultLogoPosition : null);
  
  // Handle logo position changes
  const handleLogoPositionChange = async (option: 'A' | 'B', position: { x: number; y: number }) => {
    setLogoPositions(prev => ({
      ...prev,
      [option]: position
    }));
    
    // Save to Firebase
    if (assignment.campaignId && assignment.designId) {
      try {
        const campaignRef = doc(db, 'campaigns', assignment.campaignId);
        await updateDoc(campaignRef, {
          [`logoPositions.${assignment.designId}.${option}`]: {
            x: position.x,
            y: position.y,
            updatedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });
        console.log(`Logo position saved for Design ${assignment.designId}, Option ${option}:`, position);
      } catch (error) {
        console.error('Error saving logo position:', error);
      }
    }
  };
  
  const handleLogoSizeChange = async (option: 'A' | 'B', dimensions: { width: number; height: number }) => {
    setLogoSizes(prev => ({
      ...prev,
      [option]: dimensions
    }));
    
    // Save to Firebase
    if (assignment.campaignId && assignment.designId) {
      try {
        const campaignRef = doc(db, 'campaigns', assignment.campaignId);
        await updateDoc(campaignRef, {
          [`logoSizes.${assignment.designId}.${option}`]: {
            width: dimensions.width,
            height: dimensions.height,
            updatedAt: serverTimestamp()
          },
          updatedAt: serverTimestamp()
        });
        console.log(`Logo size saved for Design ${assignment.designId}, Option ${option}:`, dimensions);
      } catch (error) {
        console.error('Error saving logo size:', error);
      }
    }
  };
  
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
        {/* Brief 1 */}
        {assignment.generationResult.brief1?.frontImageUrl && (
          <DesignOptionCard
            imageUrl={assignment.generationResult.brief1.frontImageUrl}
            optionLabel="A"
            isSelected={assignment.selectedOption === 'A'}
            executionTime={assignment.generationResult.brief1.executionTime}
            brand={brand}
            logoPosition={effectiveLogoPosition}
            savedLogoPosition={logoPositions.A}
            savedLogoSize={logoSizes.A}
            creativeBrief={assignment.generationResult.brief1.briefText || assignment.creativeBrief?.briefText}
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
        
        {/* Brief 2 */}
        {assignment.generationResult.brief2?.frontImageUrl && (
          <DesignOptionCard
            imageUrl={assignment.generationResult.brief2.frontImageUrl}
            optionLabel="B"
            isSelected={assignment.selectedOption === 'B'}
            executionTime={assignment.generationResult.brief2.executionTime}
            brand={brand}
            logoPosition={effectiveLogoPosition}
            savedLogoPosition={logoPositions.B}
            savedLogoSize={logoSizes.B}
            creativeBrief={assignment.generationResult.brief2.briefText || assignment.creativeBrief?.briefText}
            prompt={assignment.prompt}
            campaignId={assignment.campaignId}
            designId={assignment.designId}
            aiProvider="openai"
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
      {!assignment.generationResult.brief1?.frontImageUrl && !assignment.generationResult.brief2?.frontImageUrl && (
        <div className="text-center py-8">
          <div className="text-[#FF00B8] mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-[#EAEAEA] mb-1">Generation Failed</h4>
          <p className="text-[#EAEAEA]/60 text-sm">
            Both creative briefs failed to generate designs. Please try regenerating this design.
          </p>
        </div>
      )}
    </div>
  );
};

export default DesignReviewSection;
