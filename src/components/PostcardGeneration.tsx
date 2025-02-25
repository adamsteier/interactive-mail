'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { generateImages, generateImagePrompt } from '../services/openai';
import DynamicPostcardDesign from './DynamicPostcardDesign';

// Type definitions
type BrandStylePreference = 'playful' | 'professional' | 'modern' | 'traditional';
type ImageStyle = 'photograph' | 'illustration' | 'abstract' | 'minimal';
type LayoutStyle = 'clean' | 'bold' | 'elegant' | 'playful';

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
  audienceAgeRange: string[];
  incomeLevel: string[];
  interests: string[];
  customAudience: boolean;
  customAudienceDescription: string;
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
  imageSource: string;
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
  onBack: () => void;
  onComplete: (selectedPostcards: PostcardDesign[], images: string[]) => void;
}

interface ImagePosition {
  x: number;
  y: number;
  scale: number;
}

interface PostcardDesign {
  id: string;
  layout: 'layout1' | 'layout2' | 'layout3';
  selectedImageIndex: number | null;
  imagePosition: ImagePosition;
}

const PostcardGeneration: React.FC<PostcardGenerationProps> = ({
  brandData,
  marketingData,
  audienceData,
  businessData,
  visualData,
  onBack,
  onComplete
}) => {
  // State for managing generated images
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // State for managing postcard designs - update the layout mapping to match Claude API design styles
  const [postcardDesigns, setPostcardDesigns] = useState<PostcardDesign[]>([
    { 
      id: 'postcard1', 
      layout: 'layout1', // maps to 'professional' in Claude API
      selectedImageIndex: null, 
      imagePosition: { x: 0, y: 0, scale: 1 } 
    },
    { 
      id: 'postcard2', 
      layout: 'layout2', // maps to 'modern' in Claude API
      selectedImageIndex: null, 
      imagePosition: { x: 0, y: 0, scale: 1 } 
    },
    { 
      id: 'postcard3', 
      layout: 'layout3', // maps to 'elegant' in Claude API
      selectedImageIndex: null, 
      imagePosition: { x: 0, y: 0, scale: 1 } 
    },
  ]);

  // State for selected postcard (the one being edited)
  const [selectedPostcardIndex, setSelectedPostcardIndex] = useState<number | null>(null);

  // Refs for drag constraints
  const postcardRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Generate images on component mount
  useEffect(() => {
    const generateAIImages = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Generating AI images for postcards...');
        
        // Create a prompt based on the data
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
        
        // Simulate progress updates (for smoother UX)
        const progressInterval = setInterval(() => {
          setLoadingProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 1000);
        
        // Call the API to generate images
        const response = await generateImages(prompt, 3);
        
        clearInterval(progressInterval);
        
        if (response.success) {
          console.log('Successfully generated images:', response.images.length);
          setGeneratedImages(response.images);
          setLoadingProgress(100);
        } else {
          console.error('Failed to generate images:', response.error);
          setError(response.error || 'Failed to generate images');
          
          // For demo/testing, use placeholder images when API fails
          setGeneratedImages([
            'https://placehold.co/600x400/e83e8c/FFFFFF?text=Demo+Image+1',
            'https://placehold.co/600x400/e83e8c/FFFFFF?text=Demo+Image+2',
            'https://placehold.co/600x400/e83e8c/FFFFFF?text=Demo+Image+3',
          ]);
        }
      } catch (err) {
        console.error('Error in generateAIImages:', err);
        setError('An unexpected error occurred while generating images. Using demo images instead.');
        
        // For demo/testing, use placeholder images on error
        setGeneratedImages([
          'https://placehold.co/600x400/e83e8c/FFFFFF?text=Demo+Image+1',
          'https://placehold.co/600x400/e83e8c/FFFFFF?text=Demo+Image+2',
          'https://placehold.co/600x400/e83e8c/FFFFFF?text=Demo+Image+3',
        ]);
      } finally {
        // Ensure loading completes even if there's an error
        setTimeout(() => {
          setIsLoading(false);
          setLoadingProgress(100);
        }, 500); // Small delay for smooth transition
      }
    };
    
    generateAIImages();
  }, [
    brandData.brandName, 
    brandData.stylePreferences,
    brandData.primaryColor,
    brandData.accentColor,
    audienceData.industry,
    audienceData.targetDescription,
    visualData.imageStyle,
    visualData.imagePrimarySubject,
    visualData.layoutStyle
  ]);
  
  // Handle selecting an image for a postcard
  const handleSelectImage = (postcardIndex: number, imageIndex: number) => {
    setPostcardDesigns(prev => 
      prev.map((design, idx) => 
        idx === postcardIndex
          ? { ...design, selectedImageIndex: imageIndex, imagePosition: { x: 0, y: 0, scale: 1 } }
          : design
      )
    );
    setSelectedPostcardIndex(postcardIndex);
  };
  
  // Handle image position changes (drag)
  const handleDragEnd = (postcardIndex: number, info: { offset: { x: number; y: number } }) => {
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
    
    onComplete(postcardDesigns, generatedImages);
  };

  // Render loading animation
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-electric-teal mb-6">
          Generating Your Postcard Designs
        </h2>
        
        <div className="space-y-8">
          {/* Progress bar */}
          <div className="w-full bg-charcoal-light rounded-full h-4 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-pink-400 via-electric-teal to-pink-500"
              initial={{ width: '0%' }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ duration: 0.5 }}
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
          
          <p className="text-center text-electric-teal">
            Crafting your unique postcard designs with AI...
          </p>
        </div>
      </div>
    );
  }

  // Helper function to map layout to design style
  const getDesignStyle = (layout: string) => {
    switch (layout) {
      case 'layout1': return 'professional';
      case 'layout2': return 'modern';
      case 'layout3': return 'elegant';
      default: return 'professional';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-charcoal rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-electric-teal mb-2">
        Select Images for Your Postcards
      </h2>
      
      <p className="text-electric-teal/70 mb-8">
        Select an image for each postcard design. You can also adjust the position and scale of each image.
      </p>
      
      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-pink-400">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Postcard designs section */}
        <div className="space-y-8">
          <h3 className="text-xl font-semibold text-electric-teal">Postcard Designs</h3>
          
          <div className="space-y-12">
            {/* Replace the static designs with dynamic designs */}
            {postcardDesigns.map((design, index) => (
              <div key={design.id} ref={(el) => { postcardRefs.current[index] = el; return undefined; }}>
                <p className="text-electric-teal mb-2 font-medium">
                  Design {index + 1}: {getDesignStyle(design.layout).charAt(0).toUpperCase() + getDesignStyle(design.layout).slice(1)}
                </p>
                
                <DynamicPostcardDesign
                  designStyle={getDesignStyle(design.layout) as 'professional' | 'modern' | 'elegant'}
                  brandData={brandData}
                  marketingData={marketingData}
                  audienceData={audienceData}
                  businessData={businessData}
                  visualData={visualData}
                  postcardProps={{
                    imageUrl: design.selectedImageIndex !== null ? generatedImages[design.selectedImageIndex] : null,
                    isSelected: selectedPostcardIndex === index,
                    onSelect: () => setSelectedPostcardIndex(index),
                    imagePosition: design.imagePosition,
                    onDragEnd: (info) => handleDragEnd(index, info),
                    isLoading: false,
                    brandName: brandData.brandName,
                    tagline: businessData.tagline,
                    contactInfo: {
                      phone: businessData.contactInfo.phone,
                      email: businessData.contactInfo.email,
                      website: businessData.contactInfo.website,
                      address: businessData.contactInfo.address
                    },
                    callToAction: marketingData.callToAction,
                    extraInfo: businessData.extraInfo
                  }}
                />
                
                {/* Image adjustment controls (only show when selected) */}
                {selectedPostcardIndex === index && design.selectedImageIndex !== null && (
                  <div className="mt-2 flex justify-end space-x-2">
                    <button 
                      onClick={() => handleScaleChange(index, Math.max(0.5, design.imagePosition.scale - 0.1))}
                      className="w-8 h-8 rounded-full bg-charcoal-light text-electric-teal flex items-center justify-center"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleScaleChange(index, Math.min(2, design.imagePosition.scale + 0.1))}
                      className="w-8 h-8 rounded-full bg-charcoal-light text-electric-teal flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setPostcardDesigns(prev => 
                        prev.map((d, idx) => 
                          idx === index
                            ? { ...d, imagePosition: { x: 0, y: 0, scale: 1 } }
                            : d
                        )
                      )}
                      className="w-8 h-8 rounded-full bg-charcoal-light text-electric-teal flex items-center justify-center text-xs"
                    >
                      R
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Generated images section */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-electric-teal">AI-Generated Images</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generatedImages.map((imageUrl, imageIndex) => (
              <div 
                key={imageIndex}
                className={`relative aspect-square overflow-hidden rounded-lg cursor-pointer
                  transition-all duration-200 hover:ring-2 hover:ring-electric-teal
                  ${selectedPostcardIndex !== null && 
                    postcardDesigns[selectedPostcardIndex].selectedImageIndex === imageIndex ? 
                    'ring-4 ring-electric-teal' : 'ring-0'}`}
                onClick={() => {
                  if (selectedPostcardIndex !== null) {
                    handleSelectImage(selectedPostcardIndex, imageIndex);
                  }
                }}
              >
                <img 
                  src={imageUrl} 
                  alt={`Generated image ${imageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-charcoal-light rounded-lg">
            <h4 className="text-electric-teal font-semibold mb-2">Instructions</h4>
            <ol className="text-electric-teal/70 list-decimal list-inside space-y-1 text-sm">
              <li>Click on a postcard design to select it</li>
              <li>Then click on an image to apply it to the selected postcard</li>
              <li>Adjust the position by dragging the image (when selected)</li>
              <li>Use the + and - buttons to resize the image</li>
              <li>Click R to reset the image position</li>
            </ol>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-between mt-8">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          className="px-6 py-3 border border-electric-teal text-electric-teal rounded-lg"
        >
          Back to Review
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleComplete}
          className="px-8 py-3 bg-electric-teal text-charcoal font-semibold rounded-lg"
        >
          Complete Design
        </motion.button>
      </div>
    </div>
  );
};

export default PostcardGeneration; 