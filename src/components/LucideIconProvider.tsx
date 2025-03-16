'use client';

import React, { useEffect, ElementType, ReactNode } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

/**
 * This component provides Lucide icon functionality to Claude-generated components
 * by patching the global React.createElement function to handle icon data attributes.
 */
const LucideIconProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Store the original createElement function
    const originalCreateElement = React.createElement;
    
    // Override React.createElement to intercept icon elements
     
    const patchedCreateElement = function(
      type: ElementType | string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      props: Record<string, any> | null, 
      ...children: ReactNode[]
    ) {
      // If this is a div with data-icon attribute, replace it with the actual Lucide icon
      if (
        type === 'div' && 
        props && 
        typeof props === 'object' && 
        'data-icon' in props && 
        typeof props['data-icon'] === 'string'
      ) {
        const iconName = props['data-icon'];
        const size = props['data-size'] ? Number(props['data-size']) : 24;
        const className = props['data-class'] || '';
        const strokeWidth = props['data-stroke-width'] ? Number(props['data-stroke-width']) : 2;
        
        // Get the icon component from Lucide
        const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps> | undefined>)[iconName];
        
        if (IconComponent) {
          // Create a new props object without the data attributes
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { 'data-icon': _icon, 'data-size': _size, 'data-class': _class, 'data-stroke-width': _stroke, ...restProps } = props;
          
          // Merge in the icon-specific props
          const iconProps = {
            ...restProps,
            className: className,
            size: size,
            strokeWidth: strokeWidth
          };
          
          // Return the actual Lucide icon component
          return originalCreateElement(IconComponent, iconProps, ...children);
        }
      }
      
      // Default behavior for all other elements
      return originalCreateElement(type, props, ...children);
    };
    
    // Patch React.createElement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (React as any).createElement = patchedCreateElement;
    
    // Cleanup function to restore original createElement
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (React as any).createElement = originalCreateElement;
    };
  }, []);
  
  return <>{children}</>;
};

export default LucideIconProvider; 