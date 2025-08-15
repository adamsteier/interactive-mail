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
    // 1) Try to extract a dedicated LOGO POSITION DATA section (case/format tolerant)
    const sectionMatch = briefText.match(/LOGO\s*POSITION\s*DATA[^\n]*:([\s\S]*?)(?=\n\n|\n\d+\.|$)/i);
    const searchArea = sectionMatch ? sectionMatch[1] : briefText;

    // Tolerant regexes that accept `"`, `in`, `inches`, `px`, `pixels`, and `x` or `×`. Capture units if present.
    const positionRegex = /Position\s*[:\-]?\s*([\d.]+)\s*("|in(?:ches)?|px|pixels)?\s*from\s*left\s*,\s*([\d.]+)\s*("|in(?:ches)?|px|pixels)?\s*from\s*top/i;
    const dimensionsRegex = /Dimensions\s*[:\-]?\s*([\d.]+)\s*("|in(?:ches)?|px|pixels)?\s*[x×]\s*([\d.]+)\s*("|in(?:ches)?|px|pixels)?/i;
    const backgroundRegex = /Background\s*[:\-]?\s*(light|dark)/i;

    const positionMatch = searchArea.match(positionRegex);
    const dimensionsMatch = searchArea.match(dimensionsRegex);
    const backgroundMatch = searchArea.match(backgroundRegex);

    if (!positionMatch || !dimensionsMatch) {
      throw new Error('Could not parse logo position or dimensions');
    }

    const xVal = parseFloat(positionMatch[1]);
    const xUnit = (positionMatch[2] || '').toLowerCase();
    const yVal = parseFloat(positionMatch[3]);
    const yUnit = (positionMatch[4] || '').toLowerCase();

    const widthVal = parseFloat(dimensionsMatch[1]);
    const widthUnit = (dimensionsMatch[2] || '').toLowerCase();
    const heightVal = parseFloat(dimensionsMatch[3]);
    const heightUnit = (dimensionsMatch[4] || '').toLowerCase();

    const toInches = (value: number, unit: string): number => {
      if (unit.includes('px')) return value / DPI;
      // Default to inches for '"', 'in', 'inches', or empty
      return value;
    };

    const x = toInches(xVal, xUnit);
    const y = toInches(yVal, yUnit);
    const width = toInches(widthVal, widthUnit);
    const height = toInches(heightVal, heightUnit);
    const backgroundRequirement = (backgroundMatch ? backgroundMatch[1] : 'light') as 'light' | 'dark';

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
