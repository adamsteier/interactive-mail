'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { generatePostcardDesign, extractComponentCode } from '../services/claude';
// Remove unused import
// import dynamic from 'next/dynamic';

// Import LucideIconProvider
import LucideIconProvider, { IconWrapper } from './LucideIconProvider';

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

// Add an Error Boundary class component near the top of the file
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Error caught by ErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
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
  
  // Preload default fonts based on design style
  useEffect(() => {
    // Set default fonts immediately to start loading them
    const defaultFontInfo: FontInfo = {
      fonts: [
        { 
          name: designStyle === 'traditional' ? 'Merriweather' : 
                designStyle === 'professional' ? 'Playfair Display' : 
                designStyle === 'modern' ? 'Roboto' : 'Pacifico', 
          weights: [400, 700] 
        },
        { 
          name: designStyle === 'traditional' ? 'Lora' : 
                designStyle === 'professional' ? 'Montserrat' : 
                designStyle === 'modern' ? 'Roboto Slab' : 'Quicksand', 
          weights: [400, 500] 
        }
      ]
    };
    setFontInfo(defaultFontInfo);
  }, [designStyle]);

  // Modify the generateDesign function to be used in useEffect
  const generateDesign = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Request postcard design from Claude API
      const response = await generatePostcardDesign({
        brandData,
        marketingData,
        audienceData,
        businessData,
        visualData,
        designStyle,
        creativityLevel
      });
      
      if (!response.success || !response.completion) {
        setError('Failed to generate design. Using fallback template.');
        setDesignComponent(null);
        setLoading(false);
        return;
      }
      
      // Extract code from Claude response
      const componentCode = extractComponentCode(response.completion);
      
      if (!componentCode) {
        setError('Failed to extract component code from response.');
        setDesignComponent(null);
        setLoading(false);
        return;
      }
      
      // Set debug info with code preview
      setDebugInfo({
        codePreview: componentCode.substring(0, 500),
        hasJsx: componentCode.includes('jsx') || componentCode.includes('JSX')
      });
      
      try {
        // Try to extract font information from code
        const fontInfoRegex = /const\s+fontInfo\s*=\s*({[\s\S]*?fonts\s*:\s*\[[\s\S]*?\]\s*})/;
        const fontMatch = componentCode.match(fontInfoRegex);
        
        if (fontMatch && fontMatch[1]) {
          try {
            // Add safety measures when evaluating font info
            // First, verify it doesn't contain suspicious code
            const fontInfoCode = fontMatch[1];
            
            if (!fontInfoCode.includes('function') && 
                !fontInfoCode.includes('=>') && 
                !fontInfoCode.includes('eval') && 
                !fontInfoCode.includes('document') && 
                !fontInfoCode.includes('window')) {
              
              // Create a safer evaluation environment
              const safeEval = (code: string) => {
                // Only allow specific patterns in the code
                if (!/^{\s*fonts\s*:\s*\[\s*{\s*name\s*:\s*(['"])[\w\s]+\1\s*,\s*weights\s*:\s*\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*}(?:\s*,\s*{\s*name\s*:\s*(['"])[\w\s]+\2\s*,\s*weights\s*:\s*\[\s*\d+(?:\s*,\s*\d+)*\s*\]\s*})*\s*\]\s*}$/.test(code)) {
                  throw new Error("Invalid font info format");
                }
                // Use Function constructor instead of eval for better isolation
                return new Function(`return ${code}`)();
              };
              
              const extractedFontInfo = safeEval(fontInfoCode) as FontInfo;
              console.log("Extracted font info:", extractedFontInfo);
              
              // Validate the structure before using it
              if (extractedFontInfo && 
                  Array.isArray(extractedFontInfo.fonts) && 
                  extractedFontInfo.fonts.every(f => 
                    typeof f.name === 'string' && 
                    Array.isArray(f.weights) &&
                    f.weights.every(w => typeof w === 'number')
                  )) {
                setFontInfo(extractedFontInfo);
              }
            }
          } catch (fontError) {
            console.error("Error extracting font information:", fontError);
            setDebugInfo(prev => ({
              ...prev,
              errorMessage: `Font extraction error: ${fontError instanceof Error ? fontError.message : 'Unknown font error'}`
            }));
          }
        }
        
        // Create a safer way to transform the code into a component
        // Instead of using dynamic function or eval, use a fixed structure wrapped component
        
        // First, handle any issues with React.createElement syntax
        // Create a simplified wrapper that renders a static placeholder
        const WrappedComponent = (props: PostcardDesignProps) => {
          const {
            imageUrl,
            isSelected,
            onSelect,
            imagePosition,
            onDragEnd,
            brandName = brandData.brandName,
            tagline = businessData.tagline || '',
            contactInfo = {},
            callToAction = marketingData.callToAction || '',
            extraInfo = businessData.extraInfo || '',
            isEditing = false,
            onTextChange = () => {}
          } = props;
          
          // Create a container div that will show the image with proper scaling
          return (
            <div
              className={`relative border-2 ${isSelected ? 'border-electric-teal' : 'border-electric-teal/30'} 
                rounded-lg overflow-hidden cursor-pointer`}
              style={{ 
                width: '1872px', 
                height: '1271px',
                backgroundColor: brandData.primaryColor || '#ffffff'
              }}
              onClick={onSelect}
            >
              {/* Image or placeholder */}
              {imageUrl ? (
                <motion.div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${imageUrl})`,
                    x: imagePosition.x,
                    y: imagePosition.y,
                    scale: imagePosition.scale,
                  }}
                  drag={isSelected}
                  dragMomentum={false}
                  onDragEnd={(_, info) => onDragEnd && onDragEnd({ offset: { x: info.offset.x, y: info.offset.y } })}
                />
              ) : (
                <div className="absolute inset-0 bg-gray-100" />
              )}
              
              {/* Brand elements */}
              <div className="absolute inset-0 p-8 flex flex-col" style={{ zIndex: 10 }}>
                {/* Header with brand name and logo */}
                <div className="mb-auto">
                  <EditableText
                    value={brandName}
                    onChange={value => onTextChange('brandName', value)}
                    fieldName="Brand Name"
                    className="text-4xl font-bold text-white drop-shadow-lg"
                    style={{ fontFamily: '"Playfair Display", serif' }}
                    isEditing={isEditing}
                  />
                  
                  <EditableText
                    value={tagline}
                    onChange={value => onTextChange('tagline', value)}
                    fieldName="Tagline"
                    className="text-xl text-white drop-shadow-lg mt-2"
                    style={{ fontFamily: '"Montserrat", sans-serif' }}
                    isEditing={isEditing}
                  />
                </div>
                
                {/* Call to action */}
                <div className="mt-auto">
                  <EditableText
                    value={callToAction}
                    onChange={value => onTextChange('callToAction', value)}
                    fieldName="Call to Action"
                    className="text-2xl font-bold text-white drop-shadow-lg mb-4"
                    style={{ fontFamily: '"Montserrat", sans-serif' }}
                    isEditing={isEditing}
                  />
                  
                  {/* Contact info */}
                  <div className="flex flex-wrap gap-4 text-white drop-shadow-md">
                    {contactInfo.phone && (
                      <div className="flex items-center">
                        <IconWrapper 
                          iconName="Phone" 
                          size={18} 
                          className="text-white mr-2" 
                          strokeWidth={2} 
                        />
                        <span>{contactInfo.phone}</span>
                      </div>
                    )}
                    
                    {contactInfo.email && (
                      <div className="flex items-center">
                        <IconWrapper 
                          iconName="Mail" 
                          size={18} 
                          className="text-white mr-2" 
                          strokeWidth={2} 
                        />
                        <span>{contactInfo.email}</span>
                      </div>
                    )}
                    
                    {contactInfo.website && (
                      <div className="flex items-center">
                        <IconWrapper 
                          iconName="Globe" 
                          size={18} 
                          className="text-white mr-2" 
                          strokeWidth={2} 
                        />
                        <span>{contactInfo.website}</span>
                      </div>
                    )}
                    
                    {contactInfo.address && (
                      <div className="flex items-center">
                        <IconWrapper 
                          iconName="MapPin" 
                          size={18} 
                          className="text-white mr-2" 
                          strokeWidth={2} 
                        />
                        <span>{contactInfo.address}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Extra information */}
                  {extraInfo && (
                    <EditableText
                      value={extraInfo}
                      onChange={value => onTextChange('extraInfo', value)}
                      fieldName="Extra Information"
                      className="text-sm text-white drop-shadow-lg mt-2"
                      style={{ fontFamily: '"Montserrat", sans-serif' }}
                      isEditing={isEditing}
                      isMultiline={true}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        };
        
        // Set the wrapped component as our design component
        setDesignComponent(() => WrappedComponent);
        
      } catch (err) {
        console.error("Error creating component:", err);
        setError(`Error creating component: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setDesignComponent(null);
      }
      
    } catch (err) {
      console.error("Error in generateDesign:", err);
      setError(`Error generating design: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setDesignComponent(null);
    } finally {
      setLoading(false);
    }
  }, [designStyle, creativityLevel, brandData, marketingData, audienceData, businessData, visualData]);
  
  // Execute the generateDesign function on component mount
  useEffect(() => {
    generateDesign();
  }, [generateDesign]);

  // Show loading indicator while generating the design
  if (loading) {
    return <LoadingDesign {...postcardProps} />;
  }

  if (error || !designComponent) {
    return <ErrorDesign {...postcardProps} onReload={generateDesign} error={error} debugInfo={debugInfo} />;
  }

  const DynamicComponent = designComponent;
  return (
    <LucideIconProvider>
      <ErrorBoundary
        fallback={
          <ErrorDesign
            {...postcardProps}
            error={error || "Component failed to render due to an error"}
            debugInfo={debugInfo}
            onReload={generateDesign}
          />
        }
      >
        {loading ? (
          <LoadingDesign {...postcardProps} />
        ) : designComponent ? (
          fontsLoaded ? (
            React.createElement(DynamicComponent, postcardProps)
          ) : (
            <LoadingDesign {...postcardProps} />
          )
        ) : (
          <ErrorDesign
            {...postcardProps}
            error={error}
            debugInfo={debugInfo}
            onReload={generateDesign}
          />
        )}
      </ErrorBoundary>
    </LucideIconProvider>
  );
};

export default DynamicPostcardDesign; 