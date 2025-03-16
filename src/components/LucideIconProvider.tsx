'use client';

import React, { memo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Interface for the IconWrapper props
interface IconWrapperProps {
  iconName: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
  [key: string]: any;
}

// Create a safer IconWrapper component that doesn't patch React.createElement
const IconWrapper = memo(({ 
  iconName, 
  size = 24, 
  className = '', 
  strokeWidth = 2,
  ...rest 
}: IconWrapperProps) => {
  // Use unknown as an intermediate type to avoid typing issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as { [key: string]: any };
  const IconComponent = icons[iconName] as LucideIcon | undefined;
  
  if (!IconComponent) {
    console.warn(`Icon "${iconName}" not found in Lucide icons`);
    return null;
  }
  
  return <IconComponent size={size} className={className} strokeWidth={strokeWidth} {...rest} />;
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