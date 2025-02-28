'use client';

import React from 'react';
import { LucideProps } from 'lucide-react';
import { icons } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

/**
 * A component that dynamically renders any Lucide icon by name.
 * This allows Claude to specify icons by name in its generated designs.
 */
const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  // Get the icon component from Lucide icons
  const IconComponent = (icons as Record<string, React.ComponentType<LucideProps>>)[name];
  
  // If the icon doesn't exist, render a fallback or null
  if (!IconComponent) {
    console.warn(`Icon ${name} does not exist in Lucide icons library`);
    return null;
  }
  
  // Render the icon with the provided props
  return <IconComponent {...props} />;
};

export default DynamicIcon; 