'use client';

import React, { memo } from 'react';
import * as LucideIcons from 'lucide-react';

// Define what props Lucide icons can accept
interface LucideIconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string;
  strokeWidth?: number;
  absoluteStrokeWidth?: boolean;
  color?: string;
}

// Interface for the IconWrapper props
interface IconWrapperProps extends LucideIconProps {
  iconName: string;
}

// Create a safer IconWrapper component that doesn't patch React.createElement
const IconWrapper = memo(({ 
  iconName, 
  ...rest 
}: IconWrapperProps) => {
  // Use type casting through unknown to access the icon components
  // We do a runtime check first to ensure the icon exists
  const hasIcon = Object.prototype.hasOwnProperty.call(LucideIcons, iconName);
  
  if (!hasIcon) {
    console.warn(`Icon "${iconName}" not found in Lucide icons`);
    return null;
  }
  
  // We know the icon exists at this point, so it's safe to use it
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<LucideIconProps>>;
  const IconComponent = icons[iconName];
  
  // Render the icon component with the props (iconName is excluded by rest spread)
  return <IconComponent {...rest} />;
});

// Set display name for debugging
IconWrapper.displayName = 'IconWrapper';

/**
 * This component provides Lucide icon functionality to Claude-generated components
 * using a safer approach than patching React.createElement
 */
const LucideIconProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="lucide-icon-provider">
      {children}
    </div>
  );
};

// Export the IconWrapper for direct use
export { IconWrapper };

export default LucideIconProvider; 