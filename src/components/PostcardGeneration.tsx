'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { generateImages, generateImagePrompt } from '../services/gemini';
import DynamicPostcardDesign from './DynamicPostcardDesign';
import ZoomablePostcard from './ZoomablePostcard';
import Image from 'next/image';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Type definitions
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type ImageStyle = 'photograph' | 'illustration' | 'abstract' | 'minimal';
type LayoutStyle = 'clean' | 'bold' | 'elegant' | 'playful';
type CreativityLevel = 'template' | 'creative' | 'very_creative';

interface BrandData {
  brandName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  brandValues: string[];
  stylePreferences: BrandStylePreference[];
  useExistingGuidelines: boolean;
  guidelinesNotes: string;
}

interface MarketingData {
  objectives: string[];
  callToAction: string;
  promotionDetails: string;
  eventDate: string;
  offerDetails: string;
  marketingObjectives: string;
  objectiveDetails?: {
    awareness?: string;
    promotion?: string;
    traffic?: string;
    event?: string;
    other?: string;
  };
}

interface AudienceData {
  industry: string;
  targetDescription: string;
}

interface BusinessData {
  tagline: string;
  useAiTagline: boolean;
  contactInfo: {
    phone: string;
    email: string;
    website: string;
    address: string;
    includeQR: boolean;
  };
  disclaimer: string;
  includeDisclaimer: boolean;
  extraInfo: string;
}

interface VisualData {
  imageStyle: ImageStyle[];
  imageSource: 'ai' | 'stock' | 'upload';
  imagePrimarySubject: string;
  useCustomImage: boolean;
  customImageDescription: string;
  layoutStyle: LayoutStyle;
  colorSchemeConfirmed: boolean;
  customColorNotes: string;
}

interface PostcardGenerationProps {
  brandData: BrandData;
  marketingData: MarketingData;
  audienceData: AudienceData;
  businessData: BusinessData;
  visualData: VisualData;
  templateStyle?: BrandStylePreference;
  onComplete?: (postcards: PostcardDesign[], images: string[], usesFallback?: boolean) => void;
  onBack?: () => void;
}

interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

interface PostcardDesign {
  id: string;
  creativityLevel: CreativityLevel;
  selectedImageIndex: number | null;
  imagePosition: ImagePosition;
  textContent?: {
    brandName?: string;
    tagline?: string;
    callToAction?: string;
    extraInfo?: string;
    contactInfo?: {
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
    };
  };
}

// Define type for position change events
interface PositionChangeInfo {
  offset: { x: number; y: number };
}

const PostcardGeneration: React.FC<PostcardGenerationProps> = ({
  brandData,
  marketingData,
  audienceData,
  businessData,
  visualData,
  templateStyle: propTemplateStyle,
  onComplete,
  onBack,
}) => {
  // Use provided templateStyle or default to the first style preference from brandData
  const templateStyle = propTemplateStyle || 
    (brandData.stylePreferences.length > 0 ? brandData.stylePreferences[0] : 'modern');

  // State for managing generated images
  const [isImagesLoading, setIsImagesLoading] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [originalDataUrls, setOriginalDataUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usingFallbackImages, setUsingFallbackImages] = useState(false);
  
  // Text editing state
  const [isEditing, setIsEditing] = useState(false);
  
  // Countdown timer state
  const [countdown, setCountdown] = useState(180); // 3 minutes in seconds
  
  // State for managing postcard designs - now using a single template style with varying creativity levels
  const [postcardDesigns, setPostcardDesigns] = useState<PostcardDesign[]>([
    { 
      id: 'postcard1', 
      creativityLevel: 'template', // First design closely matches the template
      selectedImageIndex: null, 
      imagePosition: { x: 0, y: 0, scale: 1 },
      textContent: {
        brandName: brandData.brandName,
        tagline: businessData.tagline,
        callToAction: marketingData.callToAction,
        extraInfo: businessData.extraInfo,
        contactInfo: {
          phone: businessData.contactInfo.phone,
          email: businessData.contactInfo.email,
          website: businessData.contactInfo.website,
          address: businessData.contactInfo.address
        }
      }
    },
    { 
      id: 'postcard2', 
      creativityLevel: 'creative', // Second design is more creative
      selectedImageIndex: null, 
      imagePosition: { x: 0, y: 0, scale: 1 },
      textContent: {
        brandName: brandData.brandName,
        tagline: businessData.tagline,
        callToAction: marketingData.callToAction,
        extraInfo: businessData.extraInfo,
        contactInfo: {
          phone: businessData.contactInfo.phone,
          email: businessData.contactInfo.email,
          website: businessData.contactInfo.website,
          address: businessData.contactInfo.address
        }
      }
    },
    { 
      id: 'postcard3', 
      creativityLevel: 'very_creative', // Third design is most creative
      selectedImageIndex: null, 
      imagePosition: { x: 0, y: 0, scale: 1 },
      textContent: {
        brandName: brandData.brandName,
        tagline: businessData.tagline,
        callToAction: marketingData.callToAction,
        extraInfo: businessData.extraInfo,
        contactInfo: {
          phone: businessData.contactInfo.phone,
          email: businessData.contactInfo.email,
          website: businessData.contactInfo.website,
          address: businessData.contactInfo.address
        }
      }
    },
  ]);

  // State for tracking overall loading state (only for initial loading screen)
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Refs for drag constraints
  const postcardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Store template IDs for reference
  const [postcardTemplateIds, setPostcardTemplateIds] = useState<string[]>([]);
  
  // State for success messages
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Effect to generate AI images on component mount
  useEffect(() => {
    // Set a short timeout to show the initial loading screen
    // This gives the user feedback that something is happening
    setTimeout(() => {
      setIsInitialLoading(false);
    }, 1500);
    
    // Start a timer to count down to the generation
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    // Clean up the timer
    return () => clearInterval(timer);
  }, []);

  // Generate AI images based on the data
  const generateAIImages = useCallback(async () => {
    try {
      // Set loading state
      setIsImagesLoading(true);
      setError(null);
      setUsingFallbackImages(false);

      console.log('Generating AI images with data:', 
        { brandData, audienceData, visualData, postcardTemplateIds });

      // Clear any previous images
      setGeneratedImages([]);
      setOriginalDataUrls([]);
      setSaveSuccess(null);

      // Generate a prompt using the brand and target information
      const prompt = generateImagePrompt(
        brandData.brandName,
        brandData.stylePreferences,
        audienceData.industry,
        audienceData.targetDescription,
        visualData.imageStyle,
        visualData.imagePrimarySubject,
        visualData.layoutStyle,
        { primary: brandData.primaryColor, accent: brandData.accentColor }
      );
      
      console.log('Using prompt:', prompt);
      
      // Get template IDs if they exist, otherwise pass null
      const templateId = postcardTemplateIds.length > 0 ? postcardTemplateIds[0] : undefined;
      
      // Call the API to generate images with the template ID
      const response = await generateImages(prompt, 3, templateId);
      
      if (response.success) {
        console.log('Successfully generated images:', response.images.length);
        
        // Check if we actually got images back
        if (response.images && response.images.length > 0) {
          setGeneratedImages(response.images);
          
          // If we have original data URLs for immediate display, use them
          if (response.originalDataUrls && response.originalDataUrls.length > 0) {
            setOriginalDataUrls(response.originalDataUrls);
          }
          
          // If we got a "note" back, these might be from Firestore retrieval
          if (response.note) {
            console.log('Note from API:', response.note);
            setSaveSuccess('Images loaded from previous generation');
          }
          
          // Save image IDs if they exist
          if (response.imageIds && response.imageIds.length > 0) {
            try {
              // Automatically save all designs with all images
              await autoSavePostcardDesigns(response.imageIds, prompt);
            } catch (saveError) {
              console.error('Error saving designs to Firestore:', saveError);
              // Show an error message but don't prevent the user from seeing the generated images
              setError('Images generated successfully but there was a problem saving to the database. You can still continue using the designs.');
            }
          } else {
            console.log('No image IDs returned from API, skipping save to Firestore');
          }
        } else {
          // This shouldn't happen if success is true, but just in case
          console.error('API returned success but no images');
          setError('No images were received from the generation service');
          fallbackToPlaceholders();
        }
      } else {
        console.error('Failed to generate images:', response.error);
        setError(response.error || 'Failed to generate images');
        fallbackToPlaceholders();
      }
    } catch (err) {
      console.error('Error in generateAIImages:', err);
      setError('An unexpected error occurred while generating images. Using demo images instead.');
      fallbackToPlaceholders();
    } finally {
      // Always clear the loading state, even if there were errors
      console.log('Clearing loading state');
      setIsImagesLoading(false);
    }
  }, [brandData, audienceData, visualData, postcardTemplateIds]);
  
  // Helper function to set placeholder images
  const fallbackToPlaceholders = () => {
    setGeneratedImages([
      'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Demo+Image+1',
      'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Demo+Image+2',
      'https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Demo+Image+3',
    ]);
    setOriginalDataUrls([]);
    setUsingFallbackImages(true);
  };

  // Get the best image URL to display - prefer the original data URL for immediate display
  // while the storage URL is loading
  const getDisplayImageUrl = (index: number): string => {
    if (index >= generatedImages.length) return '';
    
    // If we have an original data URL for this index, use it for immediate display
    if (originalDataUrls && originalDataUrls.length > index && originalDataUrls[index]) {
      return originalDataUrls[index];
    }
    
    // Otherwise fall back to the storage URL
    const url = generatedImages[index];
    
    // Add extra logging for debugging
    console.log(`Using image URL for index ${index}:`, 
      url.length > 100 ? `${url.substring(0, 100)}... (${url.length} chars)` : url);
    
    return url;
  };

  // Helper function to handle image loading errors
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>, imgIndex: number) => {
    console.error(`Failed to load image ${imgIndex}:`, generatedImages[imgIndex]);
    
    // Try to show a fallback if available
    if (originalDataUrls && originalDataUrls.length > imgIndex) {
      console.log(`Attempting to use original data URL as fallback for image ${imgIndex}`);
      event.currentTarget.src = originalDataUrls[imgIndex];
    } else {
      // Use a placeholder if all else fails
      event.currentTarget.src = `https://placehold.co/1872x1271/e83e8c/FFFFFF?text=Image+${imgIndex+1}+Failed`;
    }
  };

  // Generate AI images after countdown finishes
  useEffect(() => {
    if (countdown === 0) {
      generateAIImages();
    }
  }, [countdown, generateAIImages]);

  // New function to automatically save all postcard designs with all images
  const autoSavePostcardDesigns = async (imgIds: string[], prompt: string) => {
    // Add local timeout to ensure this function doesn't block UI updates
    let saveTimeout: NodeJS.Timeout | null = null;
    
    try {
      console.log('Starting autoSavePostcardDesigns with image IDs:', imgIds);
      // Set a timeout to ensure that even if this function takes too long, 
      // we eventually show success or error feedback to the user
      saveTimeout = setTimeout(() => {
        console.log('Save operation taking longer than expected');
        setSaveSuccess("Images generated! Still saving designs...");
      }, 3000);
      
      const newTemplateIds: string[] = [];
      
      // Save each design type (template, creative, very_creative)
      for (let i = 0; i < postcardDesigns.length; i++) {
        const design = postcardDesigns[i];
        
        try {
          console.log(`Saving design ${i+1} (${design.creativityLevel}) to Firestore...`);
          // Create a document in the postcard_template collection
          const docRef = await addDoc(collection(db, 'postcard_template'), {
            designStyle: templateStyle,
            code: "// Component code would be extracted here",
            brandName: brandData.brandName,
            createdAt: serverTimestamp(),
            primaryColor: brandData.primaryColor,
            accentColor: brandData.accentColor,
            creativityLevel: design.creativityLevel,
            imagePrompt: prompt,
            imageIds: imgIds, // Store all image IDs with each design
            usedFallback: usingFallbackImages
          });
          
          console.log(`Design ${i+1} (${design.creativityLevel}) saved with ID:`, docRef.id);
          newTemplateIds.push(docRef.id);
          
          // Link all images to this template
          for (const imageId of imgIds) {
            try {
              console.log(`Linking image ${imageId} to template ${docRef.id}...`);
              const imageDocRef = doc(db, 'postcard_images', imageId);
              await updateDoc(imageDocRef, {
                templateIds: [...(postcardTemplateIds || []), docRef.id]
              });
            } catch (updateErr) {
              console.error(`Error linking image ${imageId} to template:`, updateErr);
              // Continue with the next image even if one fails
            }
          }
        } catch (designErr) {
          console.error(`Error saving design ${i+1}:`, designErr);
          // Continue with the next design even if one fails
        }
      }
      
      // Clear the timeout since we completed normally
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
      
      // Update the template IDs state
      setPostcardTemplateIds(newTemplateIds);
      
      // Show a temporary success message
      setSaveSuccess("All designs automatically saved!");
      setTimeout(() => setSaveSuccess(null), 3000);
      
      return newTemplateIds;
    } catch (err) {
      // Clear the timeout if it exists
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
      
      console.error('Error auto-saving postcard designs:', err);
      setError('Failed to automatically save designs, but you can continue using them.');
      return [];
    }
  };

  // Handle selecting an image for a postcard
  const handleSelectImage = (postcardIndex: number, imageIndex: number | null) => {
    setPostcardDesigns(prev => 
      prev.map((design, idx) => 
        idx === postcardIndex
          ? { ...design, selectedImageIndex: imageIndex, imagePosition: { x: 0, y: 0, scale: 1 } }
          : design
      )
    );
  };
  
  // Handle image position changes (drag)
  const handleDragEnd = (postcardIndex: number, info: PositionChangeInfo) => {
    setPostcardDesigns(prev => 
      prev.map((design, idx) => {
        if (idx !== postcardIndex) return design;
        
        const currentPosition = { ...design.imagePosition };
        return {
          ...design,
          imagePosition: {
            ...currentPosition,
            x: currentPosition.x + info.offset.x,
            y: currentPosition.y + info.offset.y,
          }
        };
      })
    );
  };
  
  // Handle image scale changes
  const handleScaleChange = (postcardIndex: number, newScale: number) => {
    setPostcardDesigns(prev => 
      prev.map((design, idx) => 
        idx === postcardIndex
          ? { ...design, imagePosition: { ...design.imagePosition, scale: newScale } }
          : design
      )
    );
  };
  
  // Handle completing the selection
  const handleComplete = () => {
    // Ensure all postcards have an image selected
    const allSelected = postcardDesigns.every(design => design.selectedImageIndex !== null);
    
    if (!allSelected) {
      setError('Please select an image for each postcard');
      return;
    }
    
    // Call onComplete with the current postcard designs, generated images, and fallback status
    onComplete?.(postcardDesigns, generatedImages, usingFallbackImages);
  };

  // Toggle editing mode
  const toggleEditMode = () => {
    setIsEditing(prev => !prev);
  };
  
  // Helper function to get a description for creativity level
  const getCreativityDescription = (level: CreativityLevel): string => {
    switch (level) {
      case 'template': return 'Standard';
      case 'creative': return 'Creative';
      case 'very_creative': return 'Very Creative';
      default: return 'Standard';
    }
  };

  // Render initial loading animation
  if (isInitialLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-electric-teal mb-6">
          Preparing Your Postcard Designs
        </h2>
        
        <div className="space-y-8">
          {/* Progress bar - Using fixed value instead of loadingProgress */}
          <div className="w-full bg-charcoal-light rounded-full h-4 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-pink-400 via-electric-teal to-pink-500"
              initial={{ width: '0%' }}
              animate={{ width: '50%' }}
              transition={{ duration: 1 }}
            />
          </div>
          
          {/* Loading placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(index => (
              <div key={index} className="relative overflow-hidden rounded-lg h-60">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-pink-400 via-electric-teal to-pink-500"
                  animate={{
                    x: ['0%', '100%', '0%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>
            ))}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-electric-teal">
              Creating your postcard designs...
            </p>
            <p className="text-electric-teal/70 text-sm">
              This process may take up to 3 minutes. Please be patient while our AI creates your custom designs.
            </p>
            <p className="text-electric-teal font-medium">
              Time remaining: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Success message */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {saveSuccess}
        </div>
      )}

      {/* User controls section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-semibold text-charcoal-dark">Your Postcard Designs</h2>
        <div className="flex flex-wrap gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white border border-charcoal-light text-charcoal-dark rounded-lg shadow hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={generateAIImages}
            disabled={isImagesLoading}
            className={`px-4 py-2 ${isImagesLoading ? 'bg-gray-400' : 'bg-electric-teal hover:bg-electric-teal-dark'} text-white rounded-lg shadow 
              ${isImagesLoading ? 'opacity-70 cursor-not-allowed' : ''} transition-colors`}
          >
            {isImagesLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              usingFallbackImages ? 'Try Again with AI' : generatedImages.length > 0 ? 'Regenerate Images' : 'Generate Images'
            )}
          </button>
          <button
            onClick={handleComplete}
            disabled={isImagesLoading}
            className={`px-4 py-2 bg-white border border-electric-teal text-electric-teal rounded-lg shadow 
              ${isImagesLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'} transition-colors`}
          >
            Continue
          </button>
        </div>
      </div>

      {/* Loading and error states */}
      {isImagesLoading && (
        <div className="my-8 flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-electric-teal border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg text-charcoal-medium">Generating images for your postcard...</p>
          <p className="text-charcoal-light">This typically takes 15-30 seconds</p>
        </div>
      )}

      {error && (
        <div className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
          {usingFallbackImages && (
            <p className="text-charcoal-medium mt-2">Using demo images instead. You can try again or continue with these images.</p>
          )}
        </div>
      )}

      {/* Display postcard designs */}
      {!isImagesLoading && postcardDesigns.map((design, index) => (
        <div key={design.id} className="mb-12" ref={(el) => { postcardRefs.current[index] = el; return undefined; }}>
          <div className="flex flex-wrap items-center justify-between mb-4">
            <p className="text-electric-teal font-medium text-lg">
              Design {index + 1}: {templateStyle.charAt(0).toUpperCase() + templateStyle.slice(1)} - {getCreativityDescription(design.creativityLevel)}
            </p>
            
            {/* Controls for the postcard */}
            <div className="flex space-x-3">
              <button
                onClick={toggleEditMode}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isEditing 
                    ? 'bg-pink-500 text-white' 
                    : 'bg-charcoal-light text-electric-teal border border-electric-teal/30'
                }`}
              >
                {isEditing ? 'Done Editing' : 'Edit Text'}
              </button>
            </div>
          </div>

          {/* Dynamic Postcard Design Component */}
          <div className="relative bg-white p-4 rounded-xl shadow-lg">
            <div className={`relative ${
              design.selectedImageIndex !== null ? 'pb-[56.25%]' : 'aspect-[7/5]'
            }`}>
              {design.selectedImageIndex !== null ? (
                <div className="absolute inset-0">
                  {/* Using a div with children prop instead of directly passing image props */}
                  <ZoomablePostcard>
                    <div 
                      style={{ 
                        width: '1872px', 
                        height: '1271px',
                        position: 'relative',
                        backgroundImage: `url(${getDisplayImageUrl(design.selectedImageIndex)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transform: `translate(${design.imagePosition.x}px, ${design.imagePosition.y}px) scale(${design.imagePosition.scale})`,
                      }}
                    >
                      {/* Content would go here */}
                    </div>
                  </ZoomablePostcard>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <DynamicPostcardDesign
                    brandData={brandData}
                    marketingData={marketingData}
                    audienceData={audienceData}
                    businessData={businessData}
                    visualData={visualData}
                    designStyle={templateStyle}
                    creativityLevel={design.creativityLevel}
                    postcardProps={{
                      imageUrl: null,
                      isSelected: false,
                      onSelect: () => {},
                      imagePosition: { x: 0, y: 0, scale: 1 },
                      isEditing: isEditing
                    }}
                  />
                </div>
              )}
            </div>

            {/* Image selector - only show if we have generated images */}
            {generatedImages.length > 0 && (
              <div className="mt-4">
                <p className="text-charcoal-medium mb-2">Select background image:</p>
                <div className="grid grid-cols-4 gap-2">
                  {/* No image option */}
                  <div
                    className={`relative cursor-pointer rounded-md overflow-hidden border-2 ${
                      design.selectedImageIndex === null ? 'border-electric-teal' : 'border-transparent'
                    }`}
                    onClick={() => handleSelectImage(index, null)}
                  >
                    <div className="aspect-video bg-gray-200 flex items-center justify-center text-charcoal-medium">
                      No Image
                    </div>
                  </div>

                  {/* Generated images */}
                  {generatedImages.map((img, imgIndex) => (
                    <div
                      key={imgIndex}
                      className={`relative cursor-pointer rounded-md overflow-hidden border-2 ${
                        design.selectedImageIndex === imgIndex ? 'border-electric-teal' : 'border-transparent'
                      }`}
                      onClick={() => handleSelectImage(index, imgIndex)}
                    >
                      <div className="aspect-video relative">
                        <Image
                          src={getDisplayImageUrl(imgIndex)}
                          alt={`Generated image ${imgIndex + 1}`}
                          fill
                          className="object-cover"
                          onError={(event) => handleImageError(event, imgIndex)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image position controls - only show if an image is selected */}
            {design.selectedImageIndex !== null && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleScaleChange(index, Math.max(0.5, (design.imagePosition.scale - 0.1)))}
                  className="px-3 py-1 bg-charcoal-light text-white rounded"
                  title="Zoom in"
                >
                  Zoom In +
                </button>
                <button
                  onClick={() => handleScaleChange(index, Math.min(2, (design.imagePosition.scale + 0.1)))}
                  className="px-3 py-1 bg-charcoal-light text-white rounded"
                  title="Zoom out"
                >
                  Zoom Out -
                </button>
                <button
                  onClick={() => handleDragEnd(index, { offset: { x: 0, y: 0 } })}
                  className="px-3 py-1 bg-charcoal-light text-white rounded"
                  title="Reset position"
                >
                  Reset Position
                </button>
              </div>
            )}

            {/* Explanation of what each creativity level means */}
            <div className="mt-6 text-sm text-charcoal-medium">
              <p>
                {design.creativityLevel === 'template' && (
                  <span>This design uses a standard template approach with consistent layout and styling.</span>
                )}
                {design.creativityLevel === 'creative' && (
                  <span>This design incorporates creative elements while maintaining brand cohesion.</span>
                )}
                {design.creativityLevel === 'very_creative' && (
                  <span>This design pushes creative boundaries with unique layouts and visual treatments.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostcardGeneration; 