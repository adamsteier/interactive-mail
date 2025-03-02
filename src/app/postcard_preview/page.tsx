'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import Link from 'next/link';
import LucideIconProvider from '@/components/LucideIconProvider';

// Define PostcardTemplate interface based on the data structure in Firebase
interface PostcardTemplate {
  id: string;
  designStyle: string;
  brandName: string;
  code: string;
  usedFallback: boolean;
  createdAt: Timestamp;
  primaryColor: string;
  accentColor: string;
}

// Define props interface for the postcard component
interface PostcardProps {
  imageUrl: string;
  isSelected: boolean;
  onSelect: () => void;
  brandName: string;
  tagline: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  callToAction: string;
  extraInfo: string;
  [key: string]: unknown; // Allow for additional props
}

// This component will render a single postcard using the stored code
const DynamicPostcard: React.FC<{ template: PostcardTemplate }> = ({ template }) => {
  const [Component, setComponent] = useState<React.ComponentType<PostcardProps> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    try {
      // The code in the database starts with "const PostcardDesign = (props) => {...}"
      // We need to extract just the function part without the const declaration
      
      // First, log the code for debugging
      console.log("Code snippet from database:", template.code.substring(0, 100) + "...");
      
      // Try different approaches to extract the function
      let codeToEvaluate = "";
      let success = false;
      
      // Remove any initial comments (often causing issues)
      let cleanedCode = template.code;
      // Remove any line comments (start with //)
      cleanedCode = cleanedCode.replace(/\/\/.*$/gm, '');
      // Remove any block comments (/* ... */)
      cleanedCode = cleanedCode.replace(/\/\*[\s\S]*?\*\//g, '');
      // Trim any excess whitespace
      cleanedCode = cleanedCode.trim();
      
      // Fix common CSS property issues that cause evaluation errors
      // Look for unquoted CSS properties like linear-gradient, etc.
      cleanedCode = cleanedCode.replace(/linear-gradient\(/g, "'linear-gradient(");
      cleanedCode = cleanedCode.replace(/radial-gradient\(/g, "'radial-gradient(");
      // Fix closing parenthesis for gradients
      cleanedCode = cleanedCode.replace(/gradient\([^)]+\)/g, (match) => {
        if (!match.endsWith("'")) {
          return match + "'";
        }
        return match;
      });
      
      console.log("Cleaned code (no comments):", cleanedCode.substring(0, 100) + "...");
      
      // Approach 1: Try to directly evaluate the code as-is
      try {
        const directEval = new Function('React', `return ${cleanedCode}`);
        const testComponent = directEval(React);
        if (typeof testComponent === 'function') {
          codeToEvaluate = cleanedCode;
          success = true;
          console.log("Direct evaluation successful");
        }
      } catch (directError: unknown) {
        console.log("Direct evaluation failed:", directError instanceof Error ? directError.message : String(directError));
      }
      
      // Approach 2: If direct eval failed, try to extract function from const declaration
      if (!success) {
        // Remove the "const PostcardDesign = " part if it exists
        let extractedCode = cleanedCode;
        if (extractedCode.includes("const PostcardDesign = ")) {
          extractedCode = extractedCode.replace("const PostcardDesign = ", "");
          success = true;
          codeToEvaluate = extractedCode;
          console.log("Extracted function after removing const PostcardDesign =");
        } else if (extractedCode.startsWith("const ")) {
          // Find the position of the first equals sign and arrow function start
          const equalsPos = extractedCode.indexOf("=");
          const arrowPos = extractedCode.indexOf("=>", equalsPos);
          
          if (equalsPos > 0 && arrowPos > equalsPos) {
            extractedCode = extractedCode.substring(equalsPos + 1).trim();
            success = true;
            codeToEvaluate = extractedCode;
            console.log("Extracted function after removing const declaration");
          }
        }
      }
      
      // Approach 3: Try to extract just the function body for simpler cases
      if (!success) {
        const arrowPos = cleanedCode.indexOf("=>");
        const openBracePos = cleanedCode.indexOf("{", arrowPos);
        
        if (arrowPos > 0 && openBracePos > arrowPos) {
          // Create a simple wrapper function
          codeToEvaluate = `(props) => ${cleanedCode.substring(openBracePos)}`;
          success = true;
          console.log("Created wrapper function with body extraction");
        }
      }
      
      // Approach 4: Check if it might be a React.createElement structure directly
      if (!success && cleanedCode.includes("React.createElement")) {
        // Try to wrap the code in a function if it's just React.createElement calls
        codeToEvaluate = `(props) => { 
          const { brandName, designStyle, imageUrl, contactInfo } = props;
          return ${cleanedCode.replace(/return\s+/g, '')};
        }`;
        success = true;
        console.log("Extracted React.createElement structure");
      }
      
      // If all attempts failed, use a simple fallback function
      if (!success) {
        // Try a completely different approach with a hard-coded template
        // This bypasses the need to evaluate the stored code at all
        try {
          // Extract the style details using regex
          const extractStyle = (codeStr: string) => {
            const result = {
              colors: {
                primary: template.primaryColor || "#1a1a1a",
                accent: template.accentColor || "#4fc3f7",
                white: '#ffffff',
                black: '#000000'
              },
              layout: 'standard',
              fonts: ['Montserrat', 'Arial', 'sans-serif'],
              hasImage: codeStr.includes('imageContainer') || codeStr.includes('objectFit: "cover"') || codeStr.includes('objectFit: \'cover\'')
            };
            
            // Try to extract colors
            const colorMatch = codeStr.match(/colors\s*=\s*{[^}]+}/);
            if (colorMatch) {
              const primaryMatch = colorMatch[0].match(/primary\s*:\s*['"]([^'"]+)['"]/);
              const accentMatch = colorMatch[0].match(/accent\s*:\s*['"]([^'"]+)['"]/);
              if (primaryMatch) result.colors.primary = primaryMatch[1];
              if (accentMatch) result.colors.accent = accentMatch[1];
            }
            
            // Try to extract fonts
            const fontMatch = codeStr.match(/fontFamily\s*:\s*['"]([^'"]+)['"]/);
            if (fontMatch) {
              result.fonts = fontMatch[1].split(/,\s*/).map((f: string) => f.replace(/['"]/g, ''));
            }
            
            // Try to determine layout
            if (codeStr.includes('diagonalLayout') || codeStr.includes('clipPath')) {
              result.layout = 'diagonal';
            } else if (codeStr.includes('grid-template-columns') || codeStr.includes('gridTemplateColumns')) {
              result.layout = 'grid';
            }
            
            return result;
          };
          
          // Extract styling information
          const style = extractStyle(cleanedCode);
          
          // Create a simplified template that mimics the design without requiring evaluation
          codeToEvaluate = `(props) => {
            // Use extracted style information
            const colors = {
              primary: "${style.colors.primary}",
              accent: "${style.colors.accent}",
              white: "${style.colors.white}",
              black: "${style.colors.black}"
            };
            
            // Create a container with the right aspect ratio
            return React.createElement('div', {
              style: {
                width: '1872px',
                height: '1271px',
                fontFamily: "${style.fonts.join(', ')}",
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: colors.white
              }
            }, [
              // Background elements
              ${style.layout === 'diagonal' ? 
                `React.createElement('div', {
                  key: 'background',
                  style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    clipPath: 'polygon(0 0, 65% 0, 45% 100%, 0 100%)',
                    backgroundColor: colors.primary,
                    zIndex: 1
                  }
                }),` : 
                `React.createElement('div', {
                  key: 'background',
                  style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '30%',
                    backgroundColor: colors.primary,
                    zIndex: 1
                  }
                }),`
              }
              
              // Brand section
              React.createElement('div', {
                key: 'content',
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  padding: '60px',
                  display: 'flex',
                  flexDirection: 'column',
                  zIndex: 2
                }
              }, [
                // Brand name
                React.createElement('h1', {
                  key: 'brand',
                  style: {
                    fontSize: '90px',
                    fontWeight: 'bold',
                    color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.primary'},
                    marginBottom: '16px',
                    zIndex: 3
                  }
                }, props.brandName || "${template.brandName || 'Brand Name'}"),
                
                // Tagline
                React.createElement('p', {
                  key: 'tagline',
                  style: {
                    fontSize: '36px',
                    color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.black'},
                    marginBottom: '40px',
                    opacity: 0.9,
                    zIndex: 3
                  }
                }, props.tagline || "Your brand tagline"),
                
                // Main content area with flex layout
                React.createElement('div', {
                  key: 'mainContent',
                  style: {
                    display: 'flex',
                    flexDirection: ${style.layout === 'diagonal' ? '"row"' : '"column"'},
                    flex: 1,
                    zIndex: 3
                  }
                }, [
                  // Left content
                  React.createElement('div', {
                    key: 'leftContent',
                    style: {
                      flex: ${style.layout === 'diagonal' ? '0.45' : '0.6'},
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      paddingRight: ${style.layout === 'diagonal' ? '40px' : '0'}
                    }
                  }, [
                    // Benefits list
                    React.createElement('div', {
                      key: 'benefits',
                      style: {
                        marginBottom: '40px'
                      }
                    }, [
                      // Benefit items
                      React.createElement('div', {
                        key: 'benefit1',
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '20px'
                        }
                      }, [
                        React.createElement('div', {
                          className: 'icon',
                          'data-icon': 'CheckCircle',
                          'data-size': 42,
                          'data-class': ${style.layout === 'diagonal' ? '"text-white"' : '"text-primary"'},
                          style: {
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.primary'}
                          }
                        }),
                        React.createElement('span', {
                          style: {
                            fontSize: '28px',
                            marginLeft: '16px',
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.black'}
                          }
                        }, "Professional Service")
                      ]),
                      React.createElement('div', {
                        key: 'benefit2',
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          marginBottom: '20px'
                        }
                      }, [
                        React.createElement('div', {
                          className: 'icon',
                          'data-icon': 'Clock',
                          'data-size': 42,
                          'data-class': ${style.layout === 'diagonal' ? '"text-white"' : '"text-primary"'},
                          style: {
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.primary'}
                          }
                        }),
                        React.createElement('span', {
                          style: {
                            fontSize: '28px',
                            marginLeft: '16px',
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.black'}
                          }
                        }, "Fast Turnaround")
                      ])
                    ]),
                    
                    // Call to action
                    React.createElement('div', {
                      key: 'cta',
                      style: {
                        marginTop: 'auto'
                      }
                    }, [
                      React.createElement('div', {
                        style: {
                          backgroundColor: colors.accent,
                          color: colors.white,
                          padding: '20px 30px',
                          fontSize: '32px',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          borderRadius: '4px'
                        }
                      }, props.callToAction || "Visit our website")
                    ]),
                    
                    // Contact info
                    React.createElement('div', {
                      key: 'contact',
                      style: {
                        marginTop: '30px',
                        display: 'flex',
                        flexWrap: 'wrap'
                      }
                    }, [
                      React.createElement('div', {
                        key: 'contactPhone',
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: '30px',
                          marginBottom: '10px'
                        }
                      }, [
                        React.createElement('div', {
                          className: 'icon',
                          'data-icon': 'Phone',
                          'data-size': 24,
                          'data-class': ${style.layout === 'diagonal' ? '"text-white"' : '"text-primary"'},
                          style: {
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.primary'}
                          }
                        }),
                        React.createElement('span', {
                          style: {
                            fontSize: '18px',
                            marginLeft: '8px',
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.black'}
                          }
                        }, props.contactInfo?.phone || "555-123-4567")
                      ]),
                      React.createElement('div', {
                        key: 'contactEmail',
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                          marginRight: '30px',
                          marginBottom: '10px'
                        }
                      }, [
                        React.createElement('div', {
                          className: 'icon',
                          'data-icon': 'Mail',
                          'data-size': 24,
                          'data-class': ${style.layout === 'diagonal' ? '"text-white"' : '"text-primary"'},
                          style: {
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.primary'}
                          }
                        }),
                        React.createElement('span', {
                          style: {
                            fontSize: '18px',
                            marginLeft: '8px',
                            color: ${style.layout === 'diagonal' ? 'colors.white' : 'colors.black'}
                          }
                        }, props.contactInfo?.email || "example@example.com")
                      ])
                    ])
                  ]),
                  
                  // Right content with image
                  ${style.hasImage ? `React.createElement('div', {
                    key: 'rightContent',
                    style: {
                      flex: ${style.layout === 'diagonal' ? '0.55' : '0.4'},
                      paddingLeft: ${style.layout === 'diagonal' ? '40px' : '0'},
                      paddingTop: ${style.layout === 'diagonal' ? '0' : '40px'}
                    }
                  }, [
                    // Image container
                    React.createElement('div', {
                      style: {
                        width: '100%',
                        height: '65%',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
                      }
                    }, [
                      // Image element
                      React.createElement('img', {
                        src: props.imageUrl || "/images/placeholder-image.png",
                        alt: "Brand image",
                        style: {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }
                      })
                    ]),
                    
                    // Additional text content
                    React.createElement('div', {
                      style: {
                        marginTop: '30px'
                      }
                    }, [
                      React.createElement('h2', {
                        style: {
                          fontSize: '36px',
                          fontWeight: 'bold',
                          color: colors.accent,
                          marginBottom: '16px'
                        }
                      }, "Quality Service"),
                      React.createElement('p', {
                        style: {
                          fontSize: '24px',
                          color: colors.black
                        }
                      }, props.extraInfo || "We provide exceptional service for all your needs.")
                    ])
                  ])` : ''}
                ])
              ]),
              
              // Accent element
              React.createElement('div', {
                key: 'accent',
                style: {
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '100%',
                  height: '20px',
                  backgroundColor: colors.accent
                }
              })
            ]);
          }`;
          
          success = true;
          console.log("Using extracted template structure");
          
        } catch (extractError) {
          console.error("Error creating custom template:", extractError);
          
          // If the smart template fails, use the simple fallback
          codeToEvaluate = `(props) => {
            return React.createElement('div', { 
              style: { 
                padding: '20px', 
                backgroundColor: '${template.primaryColor || "#1a1a1a"}',
                color: 'white',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                fontFamily: 'Arial, sans-serif',
                borderRadius: '8px'
              } 
            }, [
              React.createElement('h2', { 
                key: 'title', 
                style: { 
                  color: '${template.accentColor || "#4fc3f7"}',
                  marginBottom: '12px'
                } 
              }, '${template.brandName || "Brand Name"}'),
              React.createElement('p', { 
                key: 'style',
                style: {
                  fontSize: '14px',
                  marginBottom: '16px'
                }
              }, 'Style: ${template.designStyle || "modern"}'),
              React.createElement('div', {
                key: 'created-at',
                style: {
                  fontSize: '12px',
                  opacity: 0.7,
                  marginTop: '12px'
                }
              }, 'Created: ${template.createdAt?.toDate().toLocaleDateString() || "Unknown"}')
            ]);
          }`;
          console.log("Using simple fallback function");
        }
      }
      
      // Now we should have a usable function representation
      console.log("Code to evaluate:", codeToEvaluate.substring(0, 100) + "...");
      
      // Add safety wrapping to handle missing props gracefully
      const safeCodeToEvaluate = `
        (props) => {
          try {
            // Ensure all potentially used props exist with safe defaults
            props = {
              ...props,
              // Basic props
              imagePosition: props.imagePosition || { x: 0, y: 0 },
              imageScale: props.imageScale || 1,
              
              // Event handlers
              onDragEnd: props.onDragEnd || (() => {}),
              onDragStart: props.onDragStart || (() => {}),
              onDrag: props.onDrag || (() => {}),
              onImageChange: props.onImageChange || (() => {}),
              onScaleChange: props.onScaleChange || (() => {}),
              
              // Color theme
              colors: props.colors || {
                primary: '${template.primaryColor || "#1a1a1a"}',
                accent: '${template.accentColor || "#4fc3f7"}',
                text: "#ffffff",
                background: "#ffffff"
              },
              
              // Font families and styles
              fonts: props.fonts || {
                heading: 'Arial, sans-serif',
                body: 'Arial, sans-serif',
                accent: 'Arial, sans-serif'
              },
              
              // Extended properties based on PostcardPreview.tsx
              brandData: props.brandData || {
                stylePreferences: ['${template.designStyle || "professional"}'],
                name: props.brandName || '${template.brandName || "Brand Name"}',
                colors: {
                  primary: '${template.primaryColor || "#1a1a1a"}',
                  accent: '${template.accentColor || "#4fc3f7"}'
                }
              },
              
              // Marketing and business data
              marketingData: props.marketingData || {},
              audienceData: props.audienceData || {},
              businessData: props.businessData || {},
              visualData: props.visualData || {},
              
              // Additional layout options
              layout: props.layout || "standard",
              textOptions: props.textOptions || {
                brandName: { fontSize: '28px', fontWeight: 'bold' },
                tagline: { fontSize: '18px' },
                contact: { fontSize: '14px' }
              },
              designStyle: props.designStyle || '${template.designStyle || "modern"}',
              creativityLevel: props.creativityLevel || 'template',
              customOptions: props.customOptions || {}
            };
            
            // Main component function
            const PostcardFunction = ${codeToEvaluate};
            return PostcardFunction(props);
          } catch (err) {
            console.error('Runtime error in postcard component:', err);
            // Return a simple fallback element if the component fails
            return React.createElement('div', {
              style: {
                padding: '20px',
                backgroundColor: '${template.primaryColor || "#333"}',
                color: 'white',
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }
            }, [
              React.createElement('h3', { key: 'error-title' }, 'Rendering Error'),
              React.createElement('p', { key: 'error-message' }, err.message || 'Unknown error'),
              React.createElement('p', { key: 'brand' }, '${template.brandName || "Brand"}')
            ]);
          }
        }
      `;
      
      // Convert the function string to a function
      const constructorFunction = new Function('React', `return ${safeCodeToEvaluate}`);
      const PostcardComponent = constructorFunction(React);
      setComponent(() => PostcardComponent);
    } catch (error) {
      console.error('Error creating component from code:', error);
      setError(`Failed to render component: ${error instanceof Error ? error.message : String(error)}`);
      setUseFallback(true);
    }
  }, [template.code]);

  // Render a fallback card if dynamic rendering fails
  if (useFallback) {
    return (
      <div className="w-full h-64 relative overflow-hidden bg-charcoal-light rounded-lg">
        <div className="absolute inset-0 p-4 flex flex-col">
          <div className="w-full flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-electric-teal">{template.brandName || "Brand Name"}</h3>
              <p className="text-xs text-electric-teal/70">Style: {template.designStyle || "modern"}</p>
            </div>
            <div className="flex space-x-2">
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: template.primaryColor || '#cccccc' }} 
              />
              <div 
                className="w-5 h-5 rounded-full" 
                style={{ backgroundColor: template.accentColor || '#cccccc' }} 
              />
            </div>
          </div>
          
          <div className="mt-auto flex justify-between items-end">
            <div className="text-xs text-electric-teal/70">
              {template.createdAt?.toDate().toLocaleDateString() || "No date"}
            </div>
            <div className="text-xs bg-electric-teal/20 px-2 py-1 rounded text-electric-teal">
              {template.usedFallback ? "Fallback Design" : "Custom Design"}
            </div>
          </div>
        </div>
        <div 
          className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-electric-teal/30 m-2 rounded bg-charcoal-dark/30"
        >
          <p className="text-electric-teal text-center px-4">
            Dynamic rendering unavailable<br />
            <span className="text-xs opacity-70">See console for details</span>
          </p>
        </div>
      </div>
    );
  }

  if (error && !useFallback) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-charcoal-light rounded-lg border border-red-500/50">
        <div className="text-red-500 p-4 text-center">
          <p className="font-semibold mb-2">Error rendering postcard</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-charcoal-light rounded-lg border border-electric-teal/30">
        <p className="text-electric-teal">Loading postcard...</p>
      </div>
    );
  }

  // Create a container to properly size and display the postcard
  return (
    <div className="postcard-container relative w-full overflow-hidden rounded-lg border border-electric-teal/30">
      {/* Create an aspect ratio container matching the postcard dimensions */}
      <div className="relative" style={{ paddingBottom: '67.9%' }}> {/* 1271/1872 = ~0.679 aspect ratio */}
        {/* Scale the full-size postcard down to fit */}
        <div className="absolute inset-0 overflow-hidden scale-[0.15] origin-top-left transform-gpu">
          <LucideIconProvider>
            <div id="postcard-renderer" style={{ 
              width: '1872px', 
              height: '1271px', 
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: 'white'
            }}>
              <Component 
                imageUrl="/images/placeholder-image.png" 
                isSelected={false}
                onSelect={() => {}}
                brandName={template.brandName || "Brand Name"}
                tagline="Your brand tagline"
                contactInfo={{
                  phone: "555-123-4567",
                  email: "example@example.com",
                  website: "www.example.com",
                  address: "123 Main St, Anytown, USA"
                }}
                callToAction="Visit our website"
                extraInfo=""
                imagePosition={{ x: 0, y: 0 }}
                onDragEnd={() => {}}
                onDragStart={() => {}}
                onDrag={() => {}}
                onImageChange={() => {}}
                imageScale={1}
                onScaleChange={() => {}}
                colors={{
                  primary: template.primaryColor || "#1a1a1a",
                  accent: template.accentColor || "#4fc3f7",
                  text: "#ffffff",
                  background: "#ffffff"
                }}
                fonts={{
                  heading: "Arial, sans-serif",
                  body: "Arial, sans-serif",
                  accent: "Arial, sans-serif"
                }}
                layout="standard"
                textOptions={{
                  brandName: { fontSize: '28px', fontWeight: 'bold' },
                  tagline: { fontSize: '18px' },
                  contact: { fontSize: '14px' }
                }}
                designStyle={template.designStyle || "modern"}
                customOptions={{}}
                // Add extended props matching PostcardPreview.tsx
                brandData={{
                  stylePreferences: [template.designStyle || "professional"],
                  name: template.brandName || "Brand Name",
                  colors: {
                    primary: template.primaryColor || "#1a1a1a",
                    accent: template.accentColor || "#4fc3f7"
                  }
                }}
                marketingData={{}}
                audienceData={{}}
                businessData={{}}
                visualData={{}}
                creativityLevel="template"
              />
            </div>
          </LucideIconProvider>
        </div>
      </div>
    </div>
  );
};

export default function PostcardPreviewPage() {
  const [postcards, setPostcards] = useState<PostcardTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [selectedPostcardIndex, setSelectedPostcardIndex] = useState(0);

  useEffect(() => {
    async function fetchPostcards() {
      try {
        // Create a query to fetch postcards sorted by creation date (newest first)
        const postcardQuery = query(
          collection(db, 'postcard_template'),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(postcardQuery);
        const postcardData: PostcardTemplate[] = [];
        
        querySnapshot.forEach((doc) => {
          postcardData.push({
            id: doc.id,
            ...doc.data()
          } as PostcardTemplate);
        });
        
        // Debug: Log the first postcard's code format
        if (postcardData.length > 0) {
          console.log("First postcard data:", {
            id: postcardData[0].id,
            designStyle: postcardData[0].designStyle,
            brandName: postcardData[0].brandName,
            codeLength: postcardData[0].code?.length || 0,
            codeStart: postcardData[0].code?.substring(0, 100) + "..." || "No code"
          });
        } else {
          console.log("No postcards found in database");
        }
        
        setPostcards(postcardData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching postcards:', err);
        setError('Failed to load postcards. Please try again later.');
        setLoading(false);
      }
    }

    fetchPostcards();
  }, []);

  // Debug panel component for development mode
  const DebugPanel = () => {
    if (process.env.NODE_ENV !== 'development' || !showDebugPanel || postcards.length === 0) return null;
    
    const currentPostcard = postcards[selectedPostcardIndex];
    
    // Function to prettify code for display
    const formatCode = (code: string) => {
      return code
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>')
        .replace(/\s{2}/g, '&nbsp;&nbsp;');
    };
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-auto flex">
        <div className="bg-charcoal-dark m-auto w-full max-w-4xl rounded-lg shadow-2xl p-6 max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-electric-teal">Debug Panel</h2>
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="text-electric-teal hover:text-white"
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-charcoal rounded p-3">
              <h3 className="font-semibold text-electric-teal mb-2">Postcard Info</h3>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">ID:</span> {currentPostcard.id}
              </p>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">Brand:</span> {currentPostcard.brandName}
              </p>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">Style:</span> {currentPostcard.designStyle}
              </p>
              <p className="text-sm text-electric-teal/80 mb-1">
                <span className="font-medium">Created:</span> {currentPostcard.createdAt?.toDate().toLocaleDateString()}
              </p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-electric-teal/80 mr-2">Colors:</span>
                <div 
                  className="w-4 h-4 rounded-full mr-1" 
                  style={{ backgroundColor: currentPostcard.primaryColor || '#cccccc' }}
                  title="Primary Color"
                />
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: currentPostcard.accentColor || '#cccccc' }}
                  title="Accent Color"
                />
              </div>
            </div>
            
            <div className="bg-charcoal rounded p-3">
              <h3 className="font-semibold text-electric-teal mb-2">View Options</h3>
              
              <div className="flex items-center mb-2">
                <span className="text-sm text-electric-teal/80 mr-2">Select Postcard:</span>
                <select 
                  value={selectedPostcardIndex}
                  onChange={(e) => setSelectedPostcardIndex(Number(e.target.value))}
                  className="bg-charcoal-light text-electric-teal border border-electric-teal/30 rounded px-2 py-1 text-sm"
                >
                  {postcards.map((postcard, index) => (
                    <option key={postcard.id} value={index}>
                      {index + 1}: {postcard.brandName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    const cleanedCode = currentPostcard.code
                      .replace(/\/\/.*$/gm, '')
                      .replace(/\/\*[\s\S]*?\*\//g, '')
                      .trim();
                    console.log("Cleaned code (no comments):", cleanedCode);
                  }}
                  className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded"
                >
                  Log Cleaned Code
                </button>
                
                <button 
                  onClick={() => {
                    const codeWithoutConst = currentPostcard.code.replace(/const\s+PostcardDesign\s*=\s*/, '');
                    console.log("Code without const declaration:", codeWithoutConst);
                  }}
                  className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded"
                >
                  Log Without Const
                </button>
                
                <button 
                  onClick={() => {
                    const debugInfo = {
                      codeLength: currentPostcard.code?.length || 0,
                      codeStart: currentPostcard.code?.substring(0, 150),
                      codeEnd: currentPostcard.code?.substring(currentPostcard.code.length - 150),
                      hasReactCreateElement: currentPostcard.code.includes('React.createElement'),
                      hasJSX: currentPostcard.code.includes('<') && currentPostcard.code.includes('/>'),
                      includesComments: currentPostcard.code.includes('//') || currentPostcard.code.includes('/*'),
                    };
                    console.table(debugInfo);
                  }}
                  className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded"
                >
                  Analyze Code
                </button>
              </div>
            </div>
            
            <div className="bg-charcoal rounded p-3">
              <h3 className="font-semibold text-electric-teal mb-2">Rendering Test</h3>
              
              <button 
                onClick={() => {
                  try {
                    // Try to run the non-const code
                    const codeWithoutConst = currentPostcard.code.replace(/const\s+PostcardDesign\s*=\s*/, '');
                    const evalFunction = new Function('React', `
                      try {
                        const fn = ${codeWithoutConst};
                        return fn;
                      } catch (err) {
                        console.error("Evaluation error:", err);
                        return null;
                      }
                    `);
                    const result = evalFunction(React);
                    console.log("Evaluation result:", result);
                    if (typeof result === 'function') {
                      console.log("Successfully evaluated as function!");
                    }
                  } catch (error) {
                    console.error("Test evaluation failed:", error);
                  }
                }}
                className="w-full text-xs bg-charcoal-light hover:bg-electric-teal/20 text-electric-teal px-2 py-1 rounded mb-2"
              >
                Test Evaluation
              </button>
              
              <div className="text-xs text-electric-teal/80 mt-2">
                <p>Code length: {currentPostcard.code?.length || 0} characters</p>
                <p>Has fallback: {currentPostcard.usedFallback ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-charcoal-light rounded-lg p-3 mb-4">
            <h3 className="font-semibold text-electric-teal mb-2">Code Preview (First 300 chars)</h3>
            <pre className="p-3 bg-charcoal overflow-auto text-xs text-electric-teal/90 rounded max-h-40">
              <code dangerouslySetInnerHTML={{ __html: formatCode(currentPostcard.code.substring(0, 300) + '...') }} />
            </pre>
          </div>
          
          <div className="text-center mt-4">
            <button 
              onClick={() => setShowDebugPanel(false)}
              className="px-4 py-2 bg-electric-teal text-charcoal rounded-md hover:bg-electric-teal/80 transition"
            >
              Close Debug Panel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-charcoal rounded-lg shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-electric-teal">Saved Postcard Designs</h1>
          <div className="flex space-x-4">
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={() => setShowDebugPanel(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
              >
                Debug Panel
              </button>
            )}
            <Link href="/" className="px-4 py-2 bg-electric-teal text-charcoal rounded-md hover:bg-electric-teal/80 transition">
              Back to Home
            </Link>
          </div>
        </div>
        
        {/* Show debug panel if enabled */}
        {showDebugPanel && <DebugPanel />}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-teal"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded-md">
            {error}
          </div>
        ) : postcards.length === 0 ? (
          <div className="text-center py-12 text-electric-teal/80">
            <p className="text-xl mb-4">No postcards found</p>
            <p>Create some designs from the home page to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postcards.map((postcard) => (
              <motion.div
                key={postcard.id}
                whileHover={{ scale: 1.02 }}
                className="bg-charcoal-light rounded-lg overflow-hidden shadow"
              >
                <DynamicPostcard template={postcard} />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-electric-teal truncate">{postcard.brandName}</h3>
                    <span className="text-xs px-2 py-1 bg-charcoal rounded-full text-electric-teal">
                      {postcard.designStyle}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: postcard.primaryColor || '#cccccc' }}
                      title="Primary Color"
                    />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: postcard.accentColor || '#cccccc' }}
                      title="Accent Color"
                    />
                    <div className="text-xs text-electric-teal/70 ml-auto">
                      {postcard.createdAt?.toDate().toLocaleDateString() || 'Unknown date'}
                    </div>
                  </div>
                  
                  {postcard.usedFallback && (
                    <div className="text-xs text-amber-500 mt-2">
                      <span>⚠️ Fallback design</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
} 