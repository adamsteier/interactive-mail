'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { generatePostcardDesign, extractComponentCode } from '../services/claude';
// Remove unused import
// import dynamic from 'next/dynamic';

// Import LucideIconProvider
import LucideIconProvider from './LucideIconProvider';

// Add new import for Next.js font loading
import { useGoogleFonts } from '../hooks/useGoogleFonts';

// Import the interface types from Claude service to avoid 'any'
import type { BrandData, MarketingData, AudienceData, BusinessData, VisualData } from '../services/claude';

// Editable text component that switches between static text and editable input
const EditableText = ({
  value, 
  onChange, 
  fieldName,
  className = "",
  style = {},
  isMultiline = false,
  isEditing = false
}: { 
  value: string; 
  onChange: (value: string) => void;
  fieldName: string;
  className?: string;
  style?: React.CSSProperties;
  isMultiline?: boolean;
  isEditing?: boolean;
}) => {
  if (!isEditing) {
    return <div className={className} style={style}>{value}</div>;
  }
  
  if (isMultiline) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-transparent border border-pink-500 rounded px-2 py-1 w-full ${className}`}
        style={{...style, minHeight: '60px'}}
        placeholder={`Edit ${fieldName}...`}
      />
    );
  }
  
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-transparent border border-pink-500 rounded px-2 py-1
                w-full ${className}`}
      style={style}
      placeholder={`Edit ${fieldName}...`}
    />
  );
};

// Types for props
interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

interface PostcardDesignProps {
  imageUrl: string | null;
  isSelected: boolean;
  onSelect: () => void;
  imagePosition: ImagePosition;
  onDragEnd?: (info: { offset: { x: number; y: number } }) => void;
  isLoading?: boolean;
  isEditing?: boolean;
  brandName?: string;
  tagline?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  callToAction?: string;
  extraInfo?: string;
  onTextChange?: (field: string, value: string) => void;
}

interface GeneratedDesignProps {
  designStyle: 'playful' | 'professional' | 'modern' | 'traditional';
  creativityLevel?: 'template' | 'creative' | 'very_creative';
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
  postcardProps: PostcardDesignProps;
}

// Simple fallback component in case of error
// const ErrorDesign: React.FC<PostcardDesignProps> = ({
//   isSelected,
//   onSelect,
//   brandName
// }) => (
//   <div 
//     className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-red-500'} 
//       rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-gray-100`}
//     onClick={onSelect}
//   >
//     <div className="p-4">
//       <h3 className="text-red-500 font-bold">{brandName || 'Error'}</h3>
//       <p className="text-sm text-gray-700">Sorry, we couldn&apos;t generate this design. Please try again.</p>
//       <div className="mt-4 p-4 border border-gray-300 rounded bg-gray-50 flex items-center justify-center h-32">
//         <p className="text-gray-400">Image area</p>
//       </div>
//     </div>
//   </div>
// );

// Create error component to display debugging information
const ErrorDesign: React.FC<PostcardDesignProps & { 
  onReload?: () => void; 
  error?: string | null; 
  debugInfo?: {
    codePreview?: string;
    hasJsx?: boolean;
    errorMessage?: string;
  }
}> = (props) => (
  <div 
    className={`relative border-2 ${props.isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
      rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-white`}
    onClick={props.onSelect}
  >
    <div className="p-4 flex flex-col h-full">
      <div className="mb-2">
        <h3 className="text-gray-800 font-bold text-lg flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          AI Design Generation Failed
        </h3>
        <p className="text-gray-600 text-sm italic">Showing a simple fallback design</p>
      </div>
      
      {/* Error message */}
      {props.error && (
        <div className="mb-3 p-2 text-sm bg-red-50 border border-red-200 rounded text-red-600">
          {props.error}
        </div>
      )}

      {/* Image placeholder */}
      <div className="flex-grow flex items-center justify-center bg-gray-100 rounded relative mb-3 overflow-hidden">
        {props.imageUrl ? (
          <motion.div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${props.imageUrl})`,
              x: props.imagePosition.x,
              y: props.imagePosition.y,
              scale: props.imagePosition.scale,
            }}
            drag={props.isSelected}
            dragMomentum={false}
            onDragEnd={(_, info) => props.onDragEnd && props.onDragEnd({ offset: { x: info.offset.x, y: info.offset.y } })}
          />
        ) : (
          <div className="text-gray-400">No image available</div>
        )}
      </div>
      
      {/* Debug info if available */}
      {props.debugInfo && props.debugInfo.codePreview && (
        <div className="mb-3 text-xs">
          <p className="text-xs font-semibold">Code preview:</p>
          <div className="bg-gray-100 p-2 text-xs font-mono overflow-auto max-h-20 rounded">
            {props.debugInfo.codePreview.substring(0, 200)}...
          </div>
        </div>
      )}
      
      {props.onReload && (
        <button
          className="mt-auto mb-2 py-2 px-4 bg-electric-teal text-white rounded hover:bg-electric-teal/80 transition-colors"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the parent onClick
            props.onReload?.();
          }}
        >
          Regenerate Design
        </button>
      )}
      
      <p className="text-xs text-gray-600">
        This is a simplified fallback design. Please try regenerating or contact support if the issue persists.
      </p>
    </div>
  </div>
);

// New interface for font information
interface FontInfo {
  fonts: {
    name: string;
    weights: number[];
  }[];
}

interface DebugInfo {
  codePreview?: string;
  hasJsx?: boolean;
  errorMessage?: string;
  fontInfo?: FontInfo;
}

const DynamicPostcardDesign: React.FC<GeneratedDesignProps> = ({
  designStyle,
  creativityLevel,
  brandData,
  marketingData,
  audienceData,
  businessData,
  visualData,
  postcardProps
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designComponent, setDesignComponent] = useState<React.ComponentType<PostcardDesignProps> | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [fontInfo, setFontInfo] = useState<FontInfo | null>(null);
  
  // Load fonts using our custom hook
  const { fontsLoaded } = useGoogleFonts(fontInfo?.fonts || []);

  // Create a loading indicator component
  const LoadingDesign: React.FC<PostcardDesignProps> = (props) => (
    <div 
      className={`relative border-2 ${props.isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
        rounded-lg aspect-[7/5] overflow-hidden cursor-pointer bg-charcoal-light`}
      onClick={props.onSelect}
    >
      <div className="h-full flex flex-col items-center justify-center p-5">
        <div className="flex items-center space-x-3 mb-4">
          <motion.div 
            className="w-3 h-3 bg-electric-teal rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <motion.div 
            className="w-3 h-3 bg-electric-teal rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, delay: 0.2, repeat: Infinity }}
          />
          <motion.div 
            className="w-3 h-3 bg-electric-teal rounded-full"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, delay: 0.4, repeat: Infinity }}
          />
        </div>
        <p className="text-electric-teal font-medium text-center mb-1">Generating Custom Design</p>
        <p className="text-electric-teal/70 text-xs text-center">
          Our AI is creating a beautiful postcard design for {brandData.brandName}
        </p>
      </div>
    </div>
  );

  useEffect(() => {
    const generateDesign = async () => {
      try {
        setError(null);

        console.log(`Generating ${designStyle} design...`);
        
        // Call Claude API to generate the design
        const result = await generatePostcardDesign({
          brandData,
          marketingData,
          audienceData,
          businessData,
          visualData,
          designStyle,
          creativityLevel
        });

        console.log("API response:", {
          success: result.success,
          hasCompletion: !!result.completion,
          error: result.error || 'none',
          completionLength: result.completion?.length || 0
        });

        if (!result.success || !result.completion) {
          throw new Error(result.error || 'Failed to generate design');
        }

        // Extract the component code from the response
        const componentCode = extractComponentCode(result.completion);
        
        if (!componentCode) {
          throw new Error('Failed to extract component code from response');
        }

        // More detailed debugging
        console.log('Component code length:', componentCode.length);
        console.log('Component code preview (first 100 chars):', componentCode.substring(0, 100) + '...');
        console.log('Component code preview (last 100 chars):', componentCode.substring(componentCode.length - 100) + '...');
        console.log('Contains JSX tags:', componentCode.includes('<div'), componentCode.includes('</div>'));
        console.log('Contains React import:', componentCode.includes('import React'));
        
        // Create a component from the code
        try {
          // Attempt to use the Function constructor to evaluate the component code
          console.log('Attempting to create component from dynamic code');
          
          try {
            // Remove import statements from the code before evaluation
            const cleanedCode = componentCode
              .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
              .replace(/import\s+{.*?}\s+from\s+['"].*?['"];?/g, '')
              // Additional safeguard to remove language identifiers that might appear at the beginning
              .replace(/^(javascript|typescript|jsx|js|ts)\b\s*/i, '')
              .trim();
            
            // Enhanced debugging - log more detailed info about the code
            console.log('Cleaned code length:', cleanedCode.length);
            console.log('Cleaned code (first 100 chars):', cleanedCode.substring(0, 100) + '...');
            
            // More robust JSX detection - now distinguishing between JSX tags and React.createElement
            const hasJsxTags = 
              (cleanedCode.includes('<') && (cleanedCode.includes('/>') || cleanedCode.includes('</div>'))) ||
              cleanedCode.includes('<>') || // Fragment syntax
              /return\s+</.test(cleanedCode); // JSX in return statement
              
            const hasReactCreateElement = cleanedCode.includes('React.createElement') || cleanedCode.includes('createElement(');
              
            console.log('Code contains JSX tags?', hasJsxTags);
            console.log('Code uses React.createElement?', hasReactCreateElement);
            
            // Additional syntax analysis
            const functionDefCheck = cleanedCode.match(/function\s+(\w+)/);
            const constArrowCheck = cleanedCode.match(/const\s+(\w+)\s*=\s*\(/);
            console.log('Function definition found:', functionDefCheck ? functionDefCheck[0] : 'None');
            console.log('Arrow function definition found:', constArrowCheck ? constArrowCheck[0] : 'None');
            
            // Store debug info
            setDebugInfo({
              codePreview: cleanedCode,
              hasJsx: hasJsxTags && !hasReactCreateElement,
              errorMessage: hasJsxTags && !hasReactCreateElement ? 
                'Code contains JSX which cannot be evaluated with Function constructor' : undefined
            });
            
            // Check if code contains JSX tags but doesn't use React.createElement
            if (hasJsxTags && !hasReactCreateElement) {
              console.log('Code contains JSX tags without React.createElement, using fallback component');
              throw new Error('Code contains JSX which cannot be evaluated with Function constructor');
            }
            
            // Use Function constructor to evaluate the component code
            const ComponentFunction = new Function(
              'React', 'motion', 'postcardProps',
              `
              try {
                // Find the PostcardDesign component declaration
                ${cleanedCode}
                
                // Safety check - make sure PostcardDesign exists
                if (typeof PostcardDesign !== 'function') {
                  console.error('PostcardDesign component not found in generated code');
                  return null;
                }
                
                // Check if we're just extracting font information
                if (motion && typeof motion === 'object' && motion.getFontInfo === true) {
                  // Try to find fontInfo in the code
                  if (typeof fontInfo !== 'undefined') {
                    return fontInfo;
                  }
                  return null;
                }
                
                return React.createElement(PostcardDesign, postcardProps);
              } catch (err) {
                console.error("Error in dynamic component:", err);
                return null;
              }
              `
            );
            
            // Create a wrapper component that calls the generated component
            const WrappedComponent = (props: PostcardDesignProps) => {
              try {
                // Extract font information from the component
                // This assumes that Claude creates a fontInfo object in the generated component
                try {
                  // This will run once when the component is created
                  const extractedFontInfo = ComponentFunction(React, { getFontInfo: true }, props);
                  if (extractedFontInfo && typeof extractedFontInfo === 'object' && 'fonts' in extractedFontInfo) {
                    setFontInfo(extractedFontInfo as FontInfo);
                    
                    // Add font info to debug information
                    setDebugInfo(prev => ({
                      ...prev,
                      fontInfo: extractedFontInfo as FontInfo
                    }));
                  }
                } catch (fontError) {
                  console.warn('Failed to extract font information:', fontError);
                }
                
                return (
                  <LucideIconProvider>
                    {fontsLoaded && ComponentFunction(React, motion, props)}
                  </LucideIconProvider>
                );
              } catch (err) {
                console.error('Error rendering generated component:', err);
                // Update debug info with render error
                setDebugInfo(prev => ({
                  ...prev,
                  errorMessage: `Render error: ${err instanceof Error ? err.message : 'Unknown error'}`
                }));
                return <ErrorDesign {...props} error="Error rendering component" debugInfo={debugInfo} />;
              }
            };
            
            setDesignComponent(() => WrappedComponent);
          } catch (dynamicError) {
            console.error('Failed to create component dynamically:', dynamicError);
            console.log('Falling back to hardcoded component');
            
            // Store error message in debug info
            setDebugInfo(prev => ({
              ...prev,
              errorMessage: dynamicError instanceof Error ? dynamicError.message : 'Unknown dynamic component error'
            }));
            
            // Use the same fallback logic as in the useEffect
            const WrappedComponent = (props: PostcardDesignProps) => {
              const colors = {
                bg: designStyle === 'professional' ? '#f8f9fa' : designStyle === 'modern' ? '#2d3748' : '#f7f7f7',
                primary: designStyle === 'professional' ? '#1a365d' : designStyle === 'modern' ? '#38b2ac' : '#7c3aed',
                secondary: designStyle === 'professional' ? '#2c5282' : designStyle === 'modern' ? '#234e52' : '#4c1d95',
                text: designStyle === 'professional' ? '#2d3748' : designStyle === 'modern' ? '#e2e8f0' : '#1e293b'
              };
            
              // Set default fonts based on design style
              useEffect(() => {
                const defaultFontInfo = {
                  fonts: [
                    { name: designStyle === 'traditional' ? 'Merriweather' : 
                            designStyle === 'professional' ? 'Playfair Display' : 
                            designStyle === 'modern' ? 'Roboto' : 'Pacifico', 
                      weights: [400, 700] },
                    { name: designStyle === 'traditional' ? 'Lora' : 
                            designStyle === 'professional' ? 'Source Sans Pro' : 
                            designStyle === 'modern' ? 'Roboto Slab' : 'Quicksand', 
                      weights: [400, 500] }
                  ]
                };
                setFontInfo(defaultFontInfo);
              }, []);
              
              return (
                <LucideIconProvider>
                  <div 
                    className={`relative border-2 ${props.isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
                      rounded-lg overflow-hidden cursor-pointer`}
                    style={{ backgroundColor: colors.bg }}
                    onClick={props.onSelect}
                  >
                    <div className="p-4 flex flex-col h-full">
                      {/* Header */}
                      <div className="mb-3">
                        <EditableText 
                          value={props.brandName || brandData.brandName}
                          onChange={(value) => props.onTextChange?.('brandName', value)}
                          fieldName="Brand Name"
                          className="font-bold text-xl mb-1" 
                          style={{ color: colors.primary }}
                          isEditing={props.isEditing}
                        />
                        
                        <EditableText 
                          value={props.tagline || businessData.tagline}
                          onChange={(value) => props.onTextChange?.('tagline', value)}
                          fieldName="Tagline"
                          className="text-sm italic" 
                          style={{ color: colors.secondary }}
                          isEditing={props.isEditing}
                        />
                      </div>
                      
                      {/* Image area */}
                      <div className="w-full aspect-video bg-gray-200 relative overflow-hidden rounded mb-3">
                        {props.imageUrl ? (
                          <motion.div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                              backgroundImage: `url(${props.imageUrl})`,
                              x: props.imagePosition.x,
                              y: props.imagePosition.y,
                              scale: props.imagePosition.scale,
                            }}
                            drag={props.isSelected}
                            dragMomentum={false}
                            onDragEnd={(_, info) => props.onDragEnd && props.onDragEnd({ offset: { x: info.offset.x, y: info.offset.y } })}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            Image placeholder
                          </div>
                        )}
                      </div>
                      
                      {/* Call to action */}
                      <div 
                        className="py-2 px-4 rounded text-center font-medium text-white mb-3"
                        style={{ backgroundColor: colors.primary }}
                      >
                        <EditableText 
                          value={props.callToAction || marketingData.callToAction}
                          onChange={(value) => props.onTextChange?.('callToAction', value)}
                          fieldName="Call to Action"
                          className="w-full text-center"
                          style={{ color: 'white' }}
                          isEditing={props.isEditing}
                        />
                      </div>
                      
                      {/* Contact info */}
                      <div className="mt-auto text-xs space-y-1" style={{ color: colors.text }}>
                        {props.contactInfo?.phone && (
                          <div className="flex items-center">
                            <span className="mr-1">📞</span>
                            <EditableText 
                              value={props.contactInfo.phone}
                              onChange={(value) => props.onTextChange?.('phone', value)}
                              fieldName="Phone"
                              className="flex-1"
                              isEditing={props.isEditing}
                            />
                          </div>
                        )}
                        
                        {props.contactInfo?.email && (
                          <div className="flex items-center">
                            <span className="mr-1">✉️</span>
                            <EditableText 
                              value={props.contactInfo.email}
                              onChange={(value) => props.onTextChange?.('email', value)}
                              fieldName="Email"
                              className="flex-1"
                              isEditing={props.isEditing}
                            />
                          </div>
                        )}
                        
                        {props.contactInfo?.website && (
                          <div className="flex items-center">
                            <span className="mr-1">🌐</span>
                            <EditableText 
                              value={props.contactInfo.website}
                              onChange={(value) => props.onTextChange?.('website', value)}
                              fieldName="Website"
                              className="flex-1"
                              isEditing={props.isEditing}
                            />
                          </div>
                        )}
                        
                        {props.contactInfo?.address && (
                          <div className="flex items-center">
                            <span className="mr-1">📍</span>
                            <EditableText 
                              value={props.contactInfo.address}
                              onChange={(value) => props.onTextChange?.('address', value)}
                              fieldName="Address"
                              className="flex-1"
                              isMultiline={true}
                              isEditing={props.isEditing}
                            />
                          </div>
                        )}
                        
                        {props.extraInfo && (
                          <EditableText 
                            value={props.extraInfo}
                            onChange={(value) => props.onTextChange?.('extraInfo', value)}
                            fieldName="Additional Info"
                            className="italic mt-2"
                            isMultiline={true}
                            isEditing={props.isEditing}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </LucideIconProvider>
              );
            };
            
            setDesignComponent(() => WrappedComponent);
          }
        } catch (err) {
          console.error('Error creating component from code:', err);
          throw new Error('Failed to create component from generated code');
        }
      } catch (err) {
        console.error('Error in generateDesign:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Start with showing the placeholder immediately
    setTimeout(() => {
      generateDesign();
    }, 100);
  }, [designStyle, creativityLevel, brandData, marketingData, audienceData, businessData, visualData]);

  // Handle reloading the design
  const handleReload = () => {
    setLoading(true);
    setError(null);
    setDebugInfo({});
    
    setTimeout(() => {
      const generateDesign = async () => {
        try {
          setError(null);
          
          console.log(`Regenerating ${designStyle} design...`);
          
          // Call Claude API to generate the design
          const result = await generatePostcardDesign({
            brandData,
            marketingData,
            audienceData,
            businessData,
            visualData,
            designStyle,
            creativityLevel
          });
          
          console.log("API response:", {
            success: result.success,
            hasCompletion: !!result.completion,
            error: result.error || 'none',
            completionLength: result.completion?.length || 0
          });

          if (!result.success || !result.completion) {
            throw new Error(result.error || 'Failed to generate design');
          }

          // Extract the component code from the response
          const componentCode = extractComponentCode(result.completion);
          
          if (!componentCode) {
            throw new Error('Failed to extract component code from response');
          }

          // More detailed debugging
          console.log('Component code length:', componentCode.length);
          console.log('Component code preview (first 100 chars):', componentCode.substring(0, 100) + '...');
          
          // Create a component from the code
          try {
            // Attempt to use the Function constructor to evaluate the component code
            console.log('Attempting to create component from dynamic code');
            
            try {
              // Remove import statements from the code before evaluation
              const cleanedCode = componentCode
                .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
                .replace(/import\s+{.*?}\s+from\s+['"].*?['"];?/g, '')
                // Additional safeguard to remove language identifiers that might appear at the beginning
                .replace(/^(javascript|typescript|jsx|js|ts)\b\s*/i, '')
                .trim();
              
              // Enhanced debugging - log more detailed info about the code
              console.log('Cleaned code length:', cleanedCode.length);
              console.log('Cleaned code (first 100 chars):', cleanedCode.substring(0, 100) + '...');
              
              // More robust JSX detection - now distinguishing between JSX tags and React.createElement
              const hasJsxTags = 
                (cleanedCode.includes('<') && (cleanedCode.includes('/>') || cleanedCode.includes('</div>'))) ||
                cleanedCode.includes('<>') || // Fragment syntax
                /return\s+</.test(cleanedCode); // JSX in return statement
                
              const hasReactCreateElement = cleanedCode.includes('React.createElement') || cleanedCode.includes('createElement(');
                
              console.log('Code contains JSX tags?', hasJsxTags);
              console.log('Code uses React.createElement?', hasReactCreateElement);
              
              // Additional syntax analysis
              const functionDefCheck = cleanedCode.match(/function\s+(\w+)/);
              const constArrowCheck = cleanedCode.match(/const\s+(\w+)\s*=\s*\(/);
              console.log('Function definition found:', functionDefCheck ? functionDefCheck[0] : 'None');
              console.log('Arrow function definition found:', constArrowCheck ? constArrowCheck[0] : 'None');
              
              // Store debug info
              setDebugInfo({
                codePreview: cleanedCode,
                hasJsx: hasJsxTags && !hasReactCreateElement,
                errorMessage: hasJsxTags && !hasReactCreateElement ? 
                  'Code contains JSX which cannot be evaluated with Function constructor' : undefined
              });
              
              // Check if code contains JSX tags but doesn't use React.createElement
              if (hasJsxTags && !hasReactCreateElement) {
                console.log('Code contains JSX tags without React.createElement, using fallback component');
                throw new Error('Code contains JSX which cannot be evaluated with Function constructor');
              }
              
              // Use Function constructor to evaluate the component code
              const ComponentFunction = new Function(
                'React', 'motion', 'postcardProps',
                `
                try {
                  // Find the PostcardDesign component declaration
                  ${cleanedCode}
                  
                  // Safety check - make sure PostcardDesign exists
                  if (typeof PostcardDesign !== 'function') {
                    console.error('PostcardDesign component not found in generated code');
                    return null;
                  }
                  
                  // Check if we're just extracting font information
                  if (motion && typeof motion === 'object' && motion.getFontInfo === true) {
                    // Try to find fontInfo in the code
                    if (typeof fontInfo !== 'undefined') {
                      return fontInfo;
                    }
                    return null;
                  }
                  
                  return React.createElement(PostcardDesign, postcardProps);
                } catch (err) {
                  console.error("Error in dynamic component:", err);
                  return null;
                }
                `
              );
              
              // Create a wrapper component that calls the generated component
              const WrappedComponent = (props: PostcardDesignProps) => {
                try {
                  // Extract font information from the component
                  // This assumes that Claude creates a fontInfo object in the generated component
                  try {
                    // This will run once when the component is created
                    const extractedFontInfo = ComponentFunction(React, { getFontInfo: true }, props);
                    if (extractedFontInfo && typeof extractedFontInfo === 'object' && 'fonts' in extractedFontInfo) {
                      setFontInfo(extractedFontInfo as FontInfo);
                      
                      // Add font info to debug information
                      setDebugInfo(prev => ({
                        ...prev,
                        fontInfo: extractedFontInfo as FontInfo
                      }));
                    }
                  } catch (fontError) {
                    console.warn('Failed to extract font information:', fontError);
                  }
                  
                  return (
                    <LucideIconProvider>
                      {fontsLoaded && ComponentFunction(React, motion, props)}
                    </LucideIconProvider>
                  );
                } catch (err) {
                  console.error('Error rendering generated component:', err);
                  // Update debug info with render error
                  setDebugInfo(prev => ({
                    ...prev,
                    errorMessage: `Render error: ${err instanceof Error ? err.message : 'Unknown error'}`
                  }));
                  return <ErrorDesign {...props} error="Error rendering component" debugInfo={debugInfo} />;
                }
              };
              
              setDesignComponent(() => WrappedComponent);
            } catch (dynamicError) {
              console.error('Failed to create component dynamically:', dynamicError);
              console.log('Falling back to hardcoded component');
              
              // Store error message in debug info
              setDebugInfo(prev => ({
                ...prev,
                errorMessage: dynamicError instanceof Error ? dynamicError.message : 'Unknown dynamic component error'
              }));
              
              // Use the same fallback logic as in the useEffect
              const WrappedComponent = (props: PostcardDesignProps) => {
                const colors = {
                  bg: designStyle === 'professional' ? '#f8f9fa' : designStyle === 'modern' ? '#2d3748' : '#f7f7f7',
                  primary: designStyle === 'professional' ? '#1a365d' : designStyle === 'modern' ? '#38b2ac' : '#7c3aed',
                  secondary: designStyle === 'professional' ? '#2c5282' : designStyle === 'modern' ? '#234e52' : '#4c1d95',
                  text: designStyle === 'professional' ? '#2d3748' : designStyle === 'modern' ? '#e2e8f0' : '#1e293b'
                };
               
                // Set default fonts based on design style
                useEffect(() => {
                  const defaultFontInfo = {
                    fonts: [
                      { name: designStyle === 'traditional' ? 'Merriweather' : 
                              designStyle === 'professional' ? 'Playfair Display' : 
                              designStyle === 'modern' ? 'Roboto' : 'Pacifico', 
                        weights: [400, 700] },
                      { name: designStyle === 'traditional' ? 'Lora' : 
                              designStyle === 'professional' ? 'Source Sans Pro' : 
                              designStyle === 'modern' ? 'Roboto Slab' : 'Quicksand', 
                        weights: [400, 500] }
                    ]
                  };
                  setFontInfo(defaultFontInfo);
                }, []);
                
                return (
                  <LucideIconProvider>
                    <div 
                      className={`relative border-2 ${props.isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
                        rounded-lg overflow-hidden cursor-pointer`}
                      style={{ backgroundColor: colors.bg }}
                      onClick={props.onSelect}
                    >
                      <div className="p-4 flex flex-col h-full">
                        {/* Header */}
                        <div className="mb-3">
                          <EditableText 
                            value={props.brandName || brandData.brandName}
                            onChange={(value) => props.onTextChange?.('brandName', value)}
                            fieldName="Brand Name"
                            className="font-bold text-xl mb-1" 
                            style={{ color: colors.primary }}
                            isEditing={props.isEditing}
                          />
                          
                          <EditableText 
                            value={props.tagline || businessData.tagline}
                            onChange={(value) => props.onTextChange?.('tagline', value)}
                            fieldName="Tagline"
                            className="text-sm italic" 
                            style={{ color: colors.secondary }}
                            isEditing={props.isEditing}
                          />
                        </div>
                        
                        {/* Image area */}
                        <div className="w-full aspect-video bg-gray-200 relative overflow-hidden rounded mb-3">
                          {props.imageUrl ? (
                            <motion.div
                              className="absolute inset-0 bg-cover bg-center"
                              style={{
                                backgroundImage: `url(${props.imageUrl})`,
                                x: props.imagePosition.x,
                                y: props.imagePosition.y,
                                scale: props.imagePosition.scale,
                              }}
                              drag={props.isSelected}
                              dragMomentum={false}
                              onDragEnd={(_, info) => props.onDragEnd && props.onDragEnd({ offset: { x: info.offset.x, y: info.offset.y } })}
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                              Image placeholder
                            </div>
                          )}
                        </div>
                        
                        {/* Call to action */}
                        <div 
                          className="py-2 px-4 rounded text-center font-medium text-white mb-3"
                          style={{ backgroundColor: colors.primary }}
                        >
                          <EditableText 
                            value={props.callToAction || marketingData.callToAction}
                            onChange={(value) => props.onTextChange?.('callToAction', value)}
                            fieldName="Call to Action"
                            className="w-full text-center"
                            style={{ color: 'white' }}
                            isEditing={props.isEditing}
                          />
                        </div>
                        
                        {/* Contact info */}
                        <div className="mt-auto text-xs space-y-1" style={{ color: colors.text }}>
                          {props.contactInfo?.phone && (
                            <div className="flex items-center">
                              <span className="mr-1">📞</span>
                              <EditableText 
                                value={props.contactInfo.phone}
                                onChange={(value) => props.onTextChange?.('phone', value)}
                                fieldName="Phone"
                                className="flex-1"
                                isEditing={props.isEditing}
                              />
                            </div>
                          )}
                          
                          {props.contactInfo?.email && (
                            <div className="flex items-center">
                              <span className="mr-1">✉️</span>
                              <EditableText 
                                value={props.contactInfo.email}
                                onChange={(value) => props.onTextChange?.('email', value)}
                                fieldName="Email"
                                className="flex-1"
                                isEditing={props.isEditing}
                              />
                            </div>
                          )}
                          
                          {props.contactInfo?.website && (
                            <div className="flex items-center">
                              <span className="mr-1">🌐</span>
                              <EditableText 
                                value={props.contactInfo.website}
                                onChange={(value) => props.onTextChange?.('website', value)}
                                fieldName="Website"
                                className="flex-1"
                                isEditing={props.isEditing}
                              />
                            </div>
                          )}
                          
                          {props.contactInfo?.address && (
                            <div className="flex items-center">
                              <span className="mr-1">📍</span>
                              <EditableText 
                                value={props.contactInfo.address}
                                onChange={(value) => props.onTextChange?.('address', value)}
                                fieldName="Address"
                                className="flex-1"
                                isMultiline={true}
                                isEditing={props.isEditing}
                              />
                            </div>
                          )}
                          
                          {props.extraInfo && (
                            <EditableText 
                              value={props.extraInfo}
                              onChange={(value) => props.onTextChange?.('extraInfo', value)}
                              fieldName="Additional Info"
                              className="italic mt-2"
                              isMultiline={true}
                              isEditing={props.isEditing}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </LucideIconProvider>
                );
              };
              
              setDesignComponent(() => WrappedComponent);
            }
          } catch (err) {
            console.error('Error creating component from code:', err);
            throw new Error('Failed to create component from generated code');
          }
        } catch (err) {
          console.error('Error in regenerateDesign:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
          setLoading(false);
        }
      };
      
      generateDesign();
    }, 100);
  };

  // Show loading indicator while generating the design
  if (loading) {
    return <LoadingDesign {...postcardProps} />;
  }

  if (error || !designComponent) {
    return <ErrorDesign {...postcardProps} onReload={handleReload} error={error} debugInfo={debugInfo} />;
  }

  const DynamicComponent = designComponent;
  return <DynamicComponent {...postcardProps} />;
};

export default DynamicPostcardDesign; 