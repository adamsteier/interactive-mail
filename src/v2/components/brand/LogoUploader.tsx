'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { processLogoUpload } from '../../services/brandService';
import { LogoVariant, ColorAnalysis, BRAND_VALIDATION_RULES } from '../../types/brand';

interface LogoUploaderProps {
  onLogoUploaded: (variants: LogoVariant[], analysis: ColorAnalysis) => void;
  onError: (error: string) => void;
  currentLogoUrl?: string;
  className?: string;
  userId?: string; // Optional userId for Firebase Storage upload
}

const LogoUploader = ({ 
  onLogoUploaded, 
  onError, 
  currentLogoUrl,
  className = '',
  userId
}: LogoUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const [analysis, setAnalysis] = useState<ColorAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    // File type validation
    if (!BRAND_VALIDATION_RULES.logo.allowedTypes.includes(file.type as 'image/svg+xml' | 'image/png' | 'image/jpeg')) {
      return 'Please upload an SVG, PNG, or JPEG file';
    }

    // File size validation  
    if (file.size > BRAND_VALIDATION_RULES.logo.maxFileSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    try {
      setIsUploading(true);
      setProgress(0);

      // Create preview URL immediately
      const tempPreviewUrl = URL.createObjectURL(file);
      createdUrlsRef.current.add(tempPreviewUrl);
      setPreviewUrl(tempPreviewUrl);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Process the logo upload
      const result = await processLogoUpload(file, userId);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Set analysis for display
      setAnalysis(result.analysis);
      
      // Update preview URL to the Firebase Storage URL
      setPreviewUrl(result.variants[0].url);
      
      // Clean up the temporary blob URL
      URL.revokeObjectURL(tempPreviewUrl);
      createdUrlsRef.current.delete(tempPreviewUrl);
      
      // Call parent callback
      onLogoUploaded(result.variants, result.analysis);

    } catch (error) {
      console.error('Logo upload error:', error);
      onError(error instanceof Error ? error.message : 'Failed to upload logo');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, [validateFile, onLogoUploaded, onError, previewUrl]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/svg+xml': ['.svg'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    onDropAccepted: () => setDragActive(false),
    onDropRejected: () => setDragActive(false)
  });

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveLogo = () => {
    if (previewUrl && createdUrlsRef.current.has(previewUrl)) {
      URL.revokeObjectURL(previewUrl);
      createdUrlsRef.current.delete(previewUrl);
    }
    setPreviewUrl(null);
    setAnalysis(null);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer
          ${isDragActive || dragActive
            ? 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_0_20px_rgba(0,240,255,0.3)]'
            : 'border-[#2F2F2F] hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/5'
          }
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <div className="p-8 text-center">
          {isUploading ? (
            /* Upload Progress */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[#00F0FF]/20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full"
                />
              </div>
              <div>
                <p className="text-[#00F0FF] font-medium">Processing logo...</p>
                <div className="w-64 h-2 bg-[#2F2F2F] rounded-full mx-auto mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-[#00F0FF] rounded-full"
                  />
                </div>
                <p className="text-[#EAEAEA]/60 text-sm mt-1">{progress}%</p>
              </div>
            </motion.div>
          ) : previewUrl ? (
            /* Preview */
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto bg-[#2F2F2F]/50 rounded-lg border border-[#00F0FF]/20 flex items-center justify-center p-2">
                <img 
                  src={previewUrl} 
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <p className="text-[#EAEAEA] font-medium mb-2">Logo uploaded successfully!</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseClick();
                    }}
                    className="px-4 py-2 text-sm bg-[#00F0FF]/20 text-[#00F0FF] rounded-lg hover:bg-[#00F0FF]/30 transition-all duration-200 border border-[#00F0FF]/40"
                  >
                    Replace
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLogo();
                    }}
                    className="px-4 py-2 text-sm bg-[#FF00B8]/20 text-[#FF00B8] rounded-lg hover:bg-[#FF00B8]/30 transition-all duration-200 border border-[#FF00B8]/40"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Upload Prompt */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                <svg className="w-8 h-8 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-[#EAEAEA] font-medium mb-1">
                  {isDragActive ? 'Drop your logo here' : 'Upload your logo'}
                </p>
                <p className="text-[#EAEAEA]/60 text-sm mb-4">
                  Drag & drop or click to browse
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseClick();
                  }}
                  className="bg-[#00F0FF] text-[#1A1A1A] px-6 py-2 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)]"
                >
                  Choose File
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Drag overlay */}
        <AnimatePresence>
          {isDragActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#00F0FF]/20 rounded-lg flex items-center justify-center backdrop-blur-sm"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#00F0FF]/30 flex items-center justify-center border-2 border-[#00F0FF] mb-4">
                  <svg className="w-8 h-8 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-[#00F0FF] font-semibold text-lg">Drop logo here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File Requirements */}
      <div className="text-xs text-[#EAEAEA]/60 space-y-1">
        <p>• SVG preferred for perfect scaling</p>
        <p>• PNG and JPEG also supported</p>
        <p>• Maximum file size: 5MB</p>
        <p>• Colors will be automatically extracted</p>
      </div>

      {/* Color Analysis Display */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20"
          >
            <h4 className="text-[#EAEAEA] font-medium mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-[#00F0FF] rounded-full"></div>
              Color Analysis
            </h4>
            
            {/* Color Palette */}
            <div className="space-y-3">
              <div>
                <p className="text-[#EAEAEA]/60 text-sm mb-2">Extracted Colors</p>
                <div className="flex gap-2">
                  {analysis.extracted.palette.slice(0, 6).map((color, index) => (
                    <div
                      key={index}
                      className="relative group"
                    >
                      <div
                        className="w-8 h-8 rounded border border-[#2F2F2F] cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                      {index === 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#00F0FF] rounded-full border border-[#1A1A1A]"></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contrast Analysis */}
              <div>
                <p className="text-[#EAEAEA]/60 text-sm mb-2">Accessibility</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    analysis.contrast.isAccessible ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className={`text-sm ${
                    analysis.contrast.isAccessible ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {analysis.contrast.isAccessible ? 'WCAG Compliant' : 'Needs Attention'}
                  </span>
                </div>
                {analysis.contrast.recommendations?.map((rec, index) => (
                  <p key={index} className="text-xs text-[#EAEAEA]/60 mt-1">• {rec}</p>
                ))}
              </div>

              {/* Color Harmony */}
              <div>
                <p className="text-[#EAEAEA]/60 text-sm mb-1">Color Harmony</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#00F0FF]/20 text-[#00F0FF] px-2 py-1 rounded capitalize">
                    {analysis.harmony.scheme}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${
                    analysis.harmony.quality === 'excellent' ? 'bg-green-500/20 text-green-400' :
                    analysis.harmony.quality === 'good' ? 'bg-blue-500/20 text-blue-400' :
                    analysis.harmony.quality === 'fair' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {analysis.harmony.quality}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogoUploader; 