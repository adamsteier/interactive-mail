/**
 * Logo Position Parser
 * Extracts structured logo position data from creative briefs
 */

export interface LogoPositionData {
  // Position in inches from top-left corner
  position: {
    x: number; // inches from left
    y: number; // inches from top
  };
  
  // Dimensions in inches
  dimensions: {
    width: number;
    height: number;
  };
  
  // Background requirement
  backgroundRequirement: 'light' | 'dark';
  
  // Safe zone constraints (6" x 4" postcard with 0.125" bleed)
  safeZone: {
    minX: number; // 0.125"
    minY: number; // 0.125"
    maxX: number; // 5.875" (6" - 0.125")
    maxY: number; // 3.875" (4" - 0.125")
  };
  
  // Converted to pixels for UI (300 DPI)
  pixels: {
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    safeZone: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
  };
}

// Constants
const DPI = 300;
const POSTCARD_WIDTH = 6; // inches
const POSTCARD_HEIGHT = 4; // inches
const BLEED = 0.125; // inches

/**
 * Parse logo position data from creative brief text
 */
export function parseLogoPositionFromBrief(briefText: string): LogoPositionData | null {
  try {
    // Look for the LOGO POSITION DATA section
    const logoDataMatch = briefText.match(/LOGO POSITION DATA \(for client overlay\):([\s\S]*?)(?=\n\n|\n1\.)/);
    
    if (!logoDataMatch) {
      console.warn('No LOGO POSITION DATA section found in brief');
      return null;
    }
    
    const logoSection = logoDataMatch[1];
    
    // Extract position (x" from left, y" from top)
    const positionMatch = logoSection.match(/Position: ([\d.]+)" from left, ([\d.]+)" from top/);
    if (!positionMatch) {
      throw new Error('Could not parse logo position');
    }
    
    const x = parseFloat(positionMatch[1]);
    const y = parseFloat(positionMatch[2]);
    
    // Extract dimensions (width" × height")
    const dimensionsMatch = logoSection.match(/Dimensions: ([\d.]+)" × ([\d.]+)"/);
    if (!dimensionsMatch) {
      throw new Error('Could not parse logo dimensions');
    }
    
    const width = parseFloat(dimensionsMatch[1]);
    const height = parseFloat(dimensionsMatch[2]);
    
    // Extract background requirement
    const backgroundMatch = logoSection.match(/Background: (light|dark) colored area required/);
    const backgroundRequirement = backgroundMatch ? backgroundMatch[1] as 'light' | 'dark' : 'light';
    
    // Calculate safe zone
    const safeZone = {
      minX: BLEED,
      minY: BLEED,
      maxX: POSTCARD_WIDTH - BLEED,
      maxY: POSTCARD_HEIGHT - BLEED
    };
    
    // Convert to pixels for UI
    const pixels = {
      position: {
        x: Math.round(x * DPI),
        y: Math.round(y * DPI)
      },
      dimensions: {
        width: Math.round(width * DPI),
        height: Math.round(height * DPI)
      },
      safeZone: {
        minX: Math.round(safeZone.minX * DPI),
        minY: Math.round(safeZone.minY * DPI),
        maxX: Math.round(safeZone.maxX * DPI),
        maxY: Math.round(safeZone.maxY * DPI)
      }
    };
    
    return {
      position: { x, y },
      dimensions: { width, height },
      backgroundRequirement,
      safeZone,
      pixels
    };
    
  } catch (error) {
    console.error('Error parsing logo position from brief:', error);
    return null;
  }
}

/**
 * Parse logo position data from BriefGenerationContext (direct access)
 */
export function parseLogoPositionFromContext(logoAnalysis: {
  width: number;
  height: number;
  position: { x: number; y: number };
  backgroundRequirement: 'light' | 'dark';
}): LogoPositionData {
  const { position, width, height, backgroundRequirement } = logoAnalysis;
  
  // Calculate safe zone
  const safeZone = {
    minX: BLEED,
    minY: BLEED,
    maxX: POSTCARD_WIDTH - BLEED,
    maxY: POSTCARD_HEIGHT - BLEED
  };
  
  // Convert to pixels for UI
  const pixels = {
    position: {
      x: Math.round(position.x * DPI),
      y: Math.round(position.y * DPI)
    },
    dimensions: {
      width: Math.round(width * DPI),
      height: Math.round(height * DPI)
    },
    safeZone: {
      minX: Math.round(safeZone.minX * DPI),
      minY: Math.round(safeZone.minY * DPI),
      maxX: Math.round(safeZone.maxX * DPI),
      maxY: Math.round(safeZone.maxY * DPI)
    }
  };
  
  return {
    position,
    dimensions: { width, height },
    backgroundRequirement,
    safeZone,
    pixels
  };
}

/**
 * Validate logo position is within safe zone
 */
export function validateLogoPosition(
  position: { x: number; y: number },
  dimensions: { width: number; height: number }
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const safeZone = {
    minX: BLEED,
    minY: BLEED,
    maxX: POSTCARD_WIDTH - BLEED,
    maxY: POSTCARD_HEIGHT - BLEED
  };
  
  // Check if logo fits within safe zone
  if (position.x < safeZone.minX) {
    errors.push(`Logo too close to left edge (minimum ${safeZone.minX}")`);
  }
  
  if (position.y < safeZone.minY) {
    errors.push(`Logo too close to top edge (minimum ${safeZone.minY}")`);
  }
  
  if (position.x + dimensions.width > safeZone.maxX) {
    errors.push(`Logo extends beyond right safe zone (maximum ${safeZone.maxX}")`);
  }
  
  if (position.y + dimensions.height > safeZone.maxY) {
    errors.push(`Logo extends beyond bottom safe zone (maximum ${safeZone.maxY}")`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Convert pixel coordinates back to inches
 */
export function pixelsToInches(pixels: number): number {
  return pixels / DPI;
}

/**
 * Convert inches to pixel coordinates
 */
export function inchesToPixels(inches: number): number {
  return Math.round(inches * DPI);
}
