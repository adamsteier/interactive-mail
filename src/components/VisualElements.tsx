'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type ImageStyle = 'photo-realistic' | 'illustration' | 'abstract' | 'none';

interface VisualElementsData {
  imageStyle: ImageStyle;
  useAiGenerated: boolean;
  imagePrompt: string;
  uploadedImage?: File | null;
  includeProductImage: boolean;
  layoutPreference: string;
  colorTheme: string;
}

interface VisualElementsProps {
  onComplete: (visualData: VisualElementsData) => void;
  initialData?: Partial<VisualElementsData>;
  currentSegment?: string;
  brandColors?: { primary: string; accent: string };
}

const imageStyleOptions = [
  {
    id: 'photo-realistic',
    label: 'Photo-Realistic',
    description: 'Realistic photography style images'
  },
  {
    id: 'illustration',
    label: 'Illustrated / Vector',
    description: 'Digital artwork and vector-style illustrations'
  },
  {
    id: 'abstract',
    label: 'Abstract / Artistic',
    description: 'Creative, abstract imagery and designs'
  },
  {
    id: 'none',
    label: 'No Image',
    description: 'Focus on text and design elements only'
  }
];

const layoutOptions = [
  'Balanced (equal text and imagery)',
  'Image Dominant (large imagery, minimal text)',
  'Text Dominant (large text, small or no imagery)',
  'Minimalist (clean with lots of whitespace)'
];

const colorThemeOptions = [
  'Match Brand Colors',
  'Bold and Vibrant',
  'Soft and Muted',
  'Monochromatic',
  'High Contrast'
];

const VisualElements = ({ 
  onComplete, 
  initialData = {}, 
  currentSegment,
  brandColors = { primary: '#1ecbe1', accent: '#e11e64' }  
}: VisualElementsProps) => {
  const [visualData, setVisualData] = useState<VisualElementsData>({
    imageStyle: initialData.imageStyle ?? 'photo-realistic',
    useAiGenerated: initialData.useAiGenerated ?? false,
    imagePrompt: initialData.imagePrompt ?? '',
    uploadedImage: initialData.uploadedImage ?? null,
    includeProductImage: initialData.includeProductImage ?? false,
    layoutPreference: initialData.layoutPreference ?? 'Balanced (equal text and imagery)',
    colorTheme: initialData.colorTheme ?? 'Match Brand Colors'
  });
  
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const handleSubmit = () => {
    onComplete(visualData);
  };

  const handleImageStyleChange = (style: ImageStyle) => {
    setVisualData(prev => ({
      ...prev,
      imageStyle: style,
      // Reset to false if they select no image
      useAiGenerated: style === 'none' ? false : prev.useAiGenerated
    }));

    // Show upload section if they don't want AI-generated and didn't select "none"
    if (!visualData.useAiGenerated && style !== 'none') {
      setShowImageUpload(true);
    } else {
      setShowImageUpload(false);
    }
  };

  const handleImageSourceChange = (useAi: boolean) => {
    setVisualData(prev => ({
      ...prev,
      useAiGenerated: useAi,
      // Clear uploaded image if they switch to AI
      uploadedImage: useAi ? null : prev.uploadedImage
    }));
    
    setShowImageUpload(!useAi);
    
    // Clear preview if switching to AI
    if (useAi && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVisualData(prev => ({
        ...prev,
        uploadedImage: file
      }));
      
      // Create preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      const newPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(newPreviewUrl);
    }
  };

  // If we're focused on a specific business segment, show it
  const segmentHeader = currentSegment && (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-3 border-l-4 border-electric-teal bg-electric-teal/5 rounded-r-lg"
    >
      <p className="text-electric-teal text-sm">
        Creating postcard for segment:
      </p>
      <h3 className="text-electric-teal text-lg font-semibold">
        {currentSegment}
      </h3>
    </motion.div>
  );

  const imageStyleSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Image Style Preference</h3>
      <p className="text-electric-teal/70 mb-6">
        What type of imagery would you like for your postcard?
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {imageStyleOptions.map(option => (
          <motion.div
            key={option.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleImageStyleChange(option.id as ImageStyle)}
            className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${
              visualData.imageStyle === option.id
                ? 'border-electric-teal bg-electric-teal/10'
                : 'border-electric-teal/30 hover:border-electric-teal/70'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${visualData.imageStyle === option.id 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {visualData.imageStyle === option.id && (
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

  // Only show image source options if image style is not 'none'
  const imageSourceSection = visualData.imageStyle !== 'none' && (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Image Source</h3>
      <p className="text-electric-teal/70 mb-6">
        How would you like to source the imagery for your postcard?
      </p>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => handleImageSourceChange(true)}
          className={`px-6 py-3 rounded-lg border-2 transition-colors duration-200 ${
            visualData.useAiGenerated 
              ? 'bg-electric-teal text-charcoal border-electric-teal' 
              : 'border-electric-teal/50 text-electric-teal hover:border-electric-teal'
          }`}
        >
          Use AI-Generated Image
        </button>
        <button
          onClick={() => handleImageSourceChange(false)}
          className={`px-6 py-3 rounded-lg border-2 transition-colors duration-200 ${
            !visualData.useAiGenerated 
              ? 'bg-electric-teal text-charcoal border-electric-teal' 
              : 'border-electric-teal/50 text-electric-teal hover:border-electric-teal'
          }`}
        >
          Upload My Own Image
        </button>
      </div>

      {visualData.useAiGenerated ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6"
        >
          <label className="block text-electric-teal mb-2">
            Describe what you want in the AI-generated image:
          </label>
          <textarea
            value={visualData.imagePrompt}
            onChange={(e) => setVisualData(prev => ({ ...prev, imagePrompt: e.target.value }))}
            placeholder="E.g., 'A modern office space with people collaborating' or 'A close-up of a beautiful flower arrangement'"
            className="w-full h-32 bg-charcoal border-2 border-electric-teal/50 rounded-lg p-4
              text-electric-teal placeholder:text-electric-teal/40 focus:border-electric-teal
              focus:outline-none transition-colors"
          />
          <p className="text-sm text-electric-teal/60 mt-2">
            The more detailed your description, the better the result. Mention style, colors, and subject matter.
          </p>
        </motion.div>
      ) : showImageUpload && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6"
        >
          <div 
            className="p-4 border-2 border-dashed border-electric-teal/50 rounded-lg text-center cursor-pointer"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            {previewUrl ? (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-64 mx-auto rounded-lg object-contain" 
                />
                <div className="absolute inset-0 bg-charcoal bg-opacity-70 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-electric-teal">Click to replace</p>
                </div>
              </div>
            ) : (
              <>
                <div className="text-electric-teal mb-2">
                  <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-electric-teal/70">
                  Click to upload an image (JPEG, PNG, SVG)
                </p>
              </>
            )}
            <input 
              id="image-upload"
              type="file" 
              className="hidden" 
              accept=".jpg,.jpeg,.png,.svg"
              onChange={handleImageUpload}
            />
          </div>
          <p className="text-sm text-electric-teal/60 mt-2">
            For best results, use high-quality images with clear subjects
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  const layoutPreferenceSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Layout Preference</h3>
      <p className="text-electric-teal/70 mb-6">
        What kind of layout would you prefer for your postcard design?
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {layoutOptions.map(option => (
          <motion.div
            key={option}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setVisualData(prev => ({ ...prev, layoutPreference: option }))}
            className={`p-3 rounded-lg border-2 cursor-pointer ${
              visualData.layoutPreference === option
                ? 'border-electric-teal bg-electric-teal/10' 
                : 'border-electric-teal/30 hover:border-electric-teal/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${visualData.layoutPreference === option 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {visualData.layoutPreference === option && (
                  <div className="w-3 h-3 rounded-full bg-electric-teal"></div>
                )}
              </div>
              <p className="text-electric-teal">{option}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const colorThemeSection = (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-10"
    >
      <h3 className="text-xl font-semibold text-electric-teal mb-4">Color Theme</h3>
      <p className="text-electric-teal/70 mb-6">
        What color palette would you like for your postcard design?
      </p>
      
      <div className="grid grid-cols-1 gap-3">
        {colorThemeOptions.map(option => (
          <motion.div
            key={option}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setVisualData(prev => ({ ...prev, colorTheme: option }))}
            className={`p-3 rounded-lg border-2 cursor-pointer ${
              visualData.colorTheme === option
                ? 'border-electric-teal bg-electric-teal/10' 
                : 'border-electric-teal/30 hover:border-electric-teal/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${visualData.colorTheme === option 
                  ? 'border-electric-teal' 
                  : 'border-electric-teal/50'}`}>
                {visualData.colorTheme === option && (
                  <div className="w-3 h-3 rounded-full bg-electric-teal"></div>
                )}
              </div>
              <p className="text-electric-teal">{option}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {visualData.colorTheme === 'Match Brand Colors' && (
        <div className="mt-4 p-3 bg-charcoal/30 border border-electric-teal/30 rounded-lg">
          <p className="text-electric-teal/70 mb-2">Your brand colors:</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: brandColors.primary }}
              ></div>
              <span className="text-electric-teal text-sm">Primary</span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: brandColors.accent }}
              ></div>
              <span className="text-electric-teal text-sm">Accent</span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  const isValid = 
    (visualData.imageStyle !== 'none' && visualData.useAiGenerated ? visualData.imagePrompt.trim() !== '' : true) &&
    (visualData.imageStyle !== 'none' && !visualData.useAiGenerated ? !!visualData.uploadedImage : true);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-20">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-electric-teal mb-2">
            Visual Elements
          </h2>
          <p className="text-electric-teal/70">
            Choose the visual style and imagery for your postcard design.
          </p>
        </div>
      </motion.div>

      {segmentHeader}
      {imageStyleSection}
      {imageSourceSection}
      {layoutPreferenceSection}
      {colorThemeSection}

      <div className="flex justify-end mt-8">
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`px-8 py-3 rounded-lg font-medium transition-colors duration-200 
            ${isValid
              ? 'bg-electric-teal text-charcoal hover:bg-electric-teal/90'
              : 'bg-electric-teal/40 text-charcoal/70 cursor-not-allowed'
            }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default VisualElements; 