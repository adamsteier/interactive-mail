'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMarketingStore } from '@/store/marketingStore';

export type ImageStyle = 'photograph' | 'illustration' | 'abstract' | 'minimal';
export type ImageSource = 'ai' | 'stock' | 'upload';
export type LayoutStyle = 'clean' | 'bold' | 'elegant' | 'playful';

interface VisualData {
  imageStyle: ImageStyle[];
  imageSource: ImageSource;
  imagePrimarySubject: string;
  useCustomImage: boolean;
  customImageDescription: string;
  layoutStyle: LayoutStyle;
  colorSchemeConfirmed: boolean;
  customColorNotes: string;
}

interface VisualElementsProps {
  onComplete: (visualData: VisualData) => void;
  initialData?: Partial<VisualData>;
  brandColors?: { primaryColor: string; accentColor: string };
  segment?: string;
}

const imageStyleOptions = [
  {
    id: 'photograph',
    label: 'Photography',
    description: 'Real-world photos with authentic appeal'
  },
  {
    id: 'illustration',
    label: 'Illustration',
    description: 'Creative, drawn visuals with a distinct style'
  },
  {
    id: 'abstract',
    label: 'Abstract',
    description: 'Non-representational shapes, patterns, and colors'
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean, simple designs with plenty of space'
  }
];

const layoutStyleOptions = [
  {
    id: 'clean',
    label: 'Clean & Organized',
    description: 'Well-structured layout with clear hierarchy'
  },
  {
    id: 'bold',
    label: 'Bold & Attention-Grabbing',
    description: 'High-contrast design that stands out'
  },
  {
    id: 'elegant',
    label: 'Elegant & Refined',
    description: 'Sophisticated layout with thoughtful spacing'
  },
  {
    id: 'playful',
    label: 'Playful & Dynamic',
    description: 'Fun, energetic layout with creative elements'
  }
];

// Fix apostrophe issue in placeholder
const colorNotesPlaceholder = "Provide any color scheme notes or adjustments (e.g., 'I&apos;d like a darker shade of the primary color' or 'Please add some green accents')";

const VisualElements = ({ onComplete, initialData = {}, brandColors, segment }: VisualElementsProps) => {
  const businessAnalysis = useMarketingStore(state => state.businessInfo?.businessAnalysis);

  const [visualData, setVisualData] = useState<VisualData>({
    imageStyle: initialData.imageStyle || [],
    imageSource: initialData.imageSource || 'ai',
    imagePrimarySubject: initialData.imagePrimarySubject || '',
    useCustomImage: initialData.useCustomImage || false,
    customImageDescription: initialData.customImageDescription || '',
    layoutStyle: initialData.layoutStyle || 'clean',
    colorSchemeConfirmed: initialData.colorSchemeConfirmed || false,
    customColorNotes: initialData.customColorNotes || '',
  });

  useEffect(() => {
    // Pre-populate image subject based on business type if available
    if (businessAnalysis?.industry && !visualData.imagePrimarySubject) {
      let suggestedSubject = '';
      
      switch(businessAnalysis.industry.toLowerCase()) {
        case 'restaurant':
        case 'food':
          suggestedSubject = 'Food, dining atmosphere, signature dishes';
          break;
        case 'real estate':
          suggestedSubject = 'Homes, properties, neighborhoods';
          break;
        case 'healthcare':
          suggestedSubject = 'Medical professionals, caring environment, health';
          break;
        default:
          suggestedSubject = `An image that could be used for ${businessAnalysis.industry} marketing material.`;
      }
      
      setVisualData(prev => ({
        ...prev,
        imagePrimarySubject: suggestedSubject
      }));
    }
  }, [businessAnalysis, visualData.imagePrimarySubject]);

  const toggleImageStyle = (style: ImageStyle) => {
    setVisualData(prev => {
      const newStyles = prev.imageStyle.includes(style)
        ? prev.imageStyle.filter(s => s !== style)
        : [...prev.imageStyle, style];
      
      return {
        ...prev,
        imageStyle: newStyles
      };
    });
  };

  const handleSubmit = () => {
    onComplete(visualData);
  };

  const imageStyleSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Image Style</h3>
      <p className="text-electric-teal/70 mb-6">
        What style of imagery would you prefer? (Select one or more)
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {imageStyleOptions.map(option => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toggleImageStyle(option.id as ImageStyle)}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              visualData.imageStyle.includes(option.id as ImageStyle)
                ? 'border-electric-teal bg-electric-teal/10'
                : 'border-electric-teal/30 hover:border-electric-teal/70'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${visualData.imageStyle.includes(option.id as ImageStyle) 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {visualData.imageStyle.includes(option.id as ImageStyle) && (
                  <div className="w-3 h-3 rounded-full bg-electric-teal"></div>
                )}
              </div>
              <h4 className="text-lg font-medium text-electric-teal">{option.label}</h4>
            </div>
            <p className="text-electric-teal/70 text-sm pl-7">{option.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const imageSourceSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Image Source</h3>
      <p className="text-electric-teal/70 mb-6">
        How would you like to source images for your postcard?
      </p>
      
      <div className="flex items-center space-x-4 my-2">
        <input
          type="radio"
          id="source-ai"
          name="imageSource"
          checked={visualData.imageSource === 'ai'}
          onChange={() => setVisualData(prev => ({ ...prev, imageSource: 'ai' }))}
          className="form-radio text-electric-teal h-5 w-5"
        />
        <label htmlFor="source-ai" className="text-white">
          AI-generated (let&apos;s create something unique)
        </label>
      </div>
      <div className="flex items-center space-x-4 my-2">
        <input
          type="radio"
          id="source-stock"
          name="imageSource"
          checked={visualData.imageSource === 'stock'}
          onChange={() => setVisualData(prev => ({ ...prev, imageSource: 'stock' }))}
          className="form-radio text-electric-teal h-5 w-5"
        />
        <label htmlFor="source-stock" className="text-white">
          Stock Photos
        </label>
      </div>
      <div className="flex items-center space-x-4 my-2">
        <input
          type="radio"
          id="source-upload"
          name="imageSource"
          checked={visualData.imageSource === 'upload'}
          onChange={() => setVisualData(prev => ({ ...prev, imageSource: 'upload' }))}
          className="form-radio text-electric-teal h-5 w-5"
        />
        <label htmlFor="source-upload" className="text-white">
          Upload My Own
        </label>
      </div>

      {visualData.imageSource === 'upload' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6"
        >
          <div className="p-4 border-2 border-dashed border-electric-teal/50 rounded-lg text-center cursor-pointer">
            <div className="text-electric-teal mb-2">
              <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-electric-teal/70">
              Upload your images (JPG, PNG, SVG)
            </p>
            <input 
              type="file" 
              className="hidden" 
              accept=".jpg,.jpeg,.png,.svg"
              multiple
            />
          </div>
          <p className="text-sm text-electric-teal/60 mt-2">
            For best results, upload high-resolution images (at least 300 DPI)
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  const imageSubjectSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Image Subject</h3>
      
      {visualData.imageSource !== 'upload' && (
        <>
          <p className="text-electric-teal/70 mb-6">
            What should be the main subject of your images?
          </p>
          
          <textarea
            value={visualData.imagePrimarySubject}
            onChange={(e) => setVisualData(prev => ({ ...prev, imagePrimarySubject: e.target.value }))}
            placeholder="E.g., 'Our products, happy customers, services in action'"
            className="w-full h-24 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setVisualData(prev => ({ 
                ...prev, 
                useCustomImage: !prev.useCustomImage,
                customImageDescription: !prev.useCustomImage ? prev.customImageDescription : ''
              }))}
              className="w-6 h-6 rounded-md border-2 border-electric-teal flex items-center justify-center"
            >
              {visualData.useCustomImage && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-3 h-3 bg-electric-teal rounded-sm"
                />
              )}
            </button>
            <p className="text-electric-teal">
              I want to describe a specific custom image
            </p>
          </div>
          
          {visualData.useCustomImage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4"
            >
              <textarea
                value={visualData.customImageDescription}
                onChange={(e) => setVisualData(prev => ({ ...prev, customImageDescription: e.target.value }))}
                placeholder="Describe in detail the specific image you'd like (e.g., 'A family enjoying a meal at an outdoor restaurant table with our signature dish in the center')"
                className="w-full h-32 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
                  text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
                  focus:outline-none transition-colors"
              />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );

  const layoutStyleSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Layout Style</h3>
      <p className="text-electric-teal/70 mb-6">
        What layout style do you prefer for your postcard?
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {layoutStyleOptions.map(option => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setVisualData(prev => ({ ...prev, layoutStyle: option.id as LayoutStyle }))}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              visualData.layoutStyle === option.id
                ? 'border-electric-teal bg-electric-teal/10'
                : 'border-electric-teal/30 hover:border-electric-teal/70'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${visualData.layoutStyle === option.id 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {visualData.layoutStyle === option.id && (
                  <div className="w-3 h-3 rounded-full bg-electric-teal"></div>
                )}
              </div>
              <h4 className="text-lg font-medium text-electric-teal">{option.label}</h4>
            </div>
            <p className="text-electric-teal/70 text-sm pl-7">{option.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const colorSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Color Scheme</h3>
      
      {brandColors && (
        <div className="mb-6">
          <p className="text-electric-teal/70 mb-4">
            Your selected brand colors will be used in the design:
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full border border-white/20"
                style={{ backgroundColor: brandColors.primaryColor }}
              ></div>
              <span className="text-electric-teal text-sm">Primary: {brandColors.primaryColor}</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full border border-white/20"
                style={{ backgroundColor: brandColors.accentColor }}
              ></div>
              <span className="text-electric-teal text-sm">Accent: {brandColors.accentColor}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setVisualData(prev => ({ 
            ...prev, 
            colorSchemeConfirmed: !prev.colorSchemeConfirmed 
          }))}
          className="w-6 h-6 rounded-md border-2 border-electric-teal flex items-center justify-center"
        >
          {visualData.colorSchemeConfirmed && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-3 h-3 bg-electric-teal rounded-sm"
            />
          )}
        </button>
        <p className="text-electric-teal">
          I confirm these colors for my design
        </p>
      </div>

      {!visualData.colorSchemeConfirmed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4"
        >
          <textarea
            value={visualData.customColorNotes}
            onChange={(e) => setVisualData(prev => ({ ...prev, customColorNotes: e.target.value }))}
            placeholder={colorNotesPlaceholder}
            className="w-full h-24 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
        </motion.div>
      )}
    </motion.div>
  );

  const isValid = 
    visualData.imageStyle.length > 0 && 
    (visualData.imageSource !== 'ai' && visualData.imageSource !== 'stock' || 
      visualData.imagePrimarySubject.trim() !== '') &&
    (!visualData.useCustomImage || (visualData.useCustomImage && visualData.customImageDescription.trim() !== '')) &&
    (!visualData.colorSchemeConfirmed || (visualData.colorSchemeConfirmed || visualData.customColorNotes.trim() !== ''));

  return (
    <div className="max-w-3xl mx-auto px-4">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h2 className="text-white text-2xl font-semibold mb-2">
            Visual Elements {segment ? `for ${segment}` : ''}
          </h2>
          <p className="text-electric-teal/70">
            Let&apos;s define the visual style and imagery for your postcard design.
          </p>
        </div>
      </motion.div>

      {imageStyleSection}
      {imageSourceSection}
      {imageSubjectSection}
      {layoutStyleSection}
      {colorSection}

      <div className="flex justify-end mt-8">
        <motion.button
          onClick={handleSubmit}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className={`w-full py-3 px-6 mt-8 rounded-lg bg-electric-teal text-charcoal font-semibold
            ${isValid ? 'opacity-100' : 'opacity-60 cursor-not-allowed'}`}
          disabled={!isValid}
        >
          Looking good! Let&apos;s review
        </motion.button>
      </div>
    </div>
  );
};

export default VisualElements; 