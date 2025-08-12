'use client';

import { LogoPositionData, inchesToPixels } from '../../utils/logoPositionParser';

interface SimpleLogoOverlayProps {
  // Logo data
  logoUrl: string;
  logoPosition: LogoPositionData;
  
  // Container dimensions (in pixels)
  containerWidth: number;
  containerHeight: number;
  
  // Simple options
  isVisible?: boolean;
  opacity?: number;
  
  // Style options
  className?: string;
}

/**
 * Simple logo overlay for A/B selection cards
 * Shows logo in calculated position without interaction
 */
const SimpleLogoOverlay = ({
  logoUrl,
  logoPosition,
  containerWidth,
  containerHeight,
  isVisible = true,
  opacity = 0.9,
  className = ''
}: SimpleLogoOverlayProps) => {
  if (!isVisible) return null;
  
  // Calculate scale factor between container and actual postcard dimensions
  const scaleX = containerWidth / inchesToPixels(6); // 6" postcard width
  const scaleY = containerHeight / inchesToPixels(4); // 4" postcard height
  const scale = Math.min(scaleX, scaleY);
  
  // Scaled dimensions for display
  const displayPosition = {
    x: logoPosition.pixels.position.x * scale,
    y: logoPosition.pixels.position.y * scale
  };
  
  const displaySize = {
    width: logoPosition.pixels.dimensions.width * scale,
    height: logoPosition.pixels.dimensions.height * scale
  };
  
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <div
        className="absolute"
        style={{
          left: displayPosition.x,
          top: displayPosition.y,
          width: displaySize.width,
          height: displaySize.height,
          opacity
        }}
      >
        <img
          src={logoUrl}
          alt="Logo"
          className="w-full h-full object-contain drop-shadow-sm"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default SimpleLogoOverlay;
