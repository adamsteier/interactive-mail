'use client';

import { useState, useCallback, useEffect } from 'react';
import { LogoPositionData, parseLogoPositionFromBrief, parseLogoPositionFromContext } from '../utils/logoPositionParser';
import { BriefGenerationContext } from '../types/design';

interface UseLogoPositionProps {
  // Data sources (provide one)
  briefText?: string;
  logoAnalysis?: BriefGenerationContext['logoAnalysis'];
  
  // Callbacks
  onPositionChange?: (position: { x: number; y: number }) => void;
  onSizeChange?: (dimensions: { width: number; height: number }) => void;
}

interface UseLogoPositionReturn {
  logoPosition: LogoPositionData | null;
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  updatePosition: (position: { x: number; y: number }) => void;
  updateSize: (dimensions: { width: number; height: number }) => void;
  resetToDefault: () => void;
  hasChanges: boolean;
}

/**
 * Hook to manage logo position state and parsing from creative briefs
 */
export function useLogoPosition({
  briefText,
  logoAnalysis,
  onPositionChange,
  onSizeChange
}: UseLogoPositionProps): UseLogoPositionReturn {
  const [logoPosition, setLogoPosition] = useState<LogoPositionData | null>(null);
  const [originalPosition, setOriginalPosition] = useState<LogoPositionData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Parse logo position from brief or context
  useEffect(() => {
    let parsedPosition: LogoPositionData | null = null;
    
    if (briefText) {
      parsedPosition = parseLogoPositionFromBrief(briefText);
    } else if (logoAnalysis) {
      parsedPosition = parseLogoPositionFromContext(logoAnalysis);
    }
    
    if (parsedPosition) {
      setLogoPosition(parsedPosition);
      setOriginalPosition(parsedPosition);
      setHasChanges(false);
    }
  }, [briefText, logoAnalysis]);
  
  // Update position
  const updatePosition = useCallback((position: { x: number; y: number }) => {
    if (!logoPosition) return;
    
    const updatedPosition: LogoPositionData = {
      ...logoPosition,
      position,
      pixels: {
        ...logoPosition.pixels,
        position: {
          x: Math.round(position.x * 300), // Convert to pixels
          y: Math.round(position.y * 300)
        }
      }
    };
    
    setLogoPosition(updatedPosition);
    setHasChanges(true);
    onPositionChange?.(position);
  }, [logoPosition, onPositionChange]);
  
  // Update size
  const updateSize = useCallback((dimensions: { width: number; height: number }) => {
    if (!logoPosition) return;
    
    const updatedPosition: LogoPositionData = {
      ...logoPosition,
      dimensions,
      pixels: {
        ...logoPosition.pixels,
        dimensions: {
          width: Math.round(dimensions.width * 300), // Convert to pixels
          height: Math.round(dimensions.height * 300)
        }
      }
    };
    
    setLogoPosition(updatedPosition);
    setHasChanges(true);
    onSizeChange?.(dimensions);
  }, [logoPosition, onSizeChange]);
  
  // Reset to original position
  const resetToDefault = useCallback(() => {
    if (originalPosition) {
      setLogoPosition(originalPosition);
      setHasChanges(false);
    }
  }, [originalPosition]);
  
  return {
    logoPosition,
    isVisible,
    setIsVisible,
    updatePosition,
    updateSize,
    resetToDefault,
    hasChanges
  };
}
