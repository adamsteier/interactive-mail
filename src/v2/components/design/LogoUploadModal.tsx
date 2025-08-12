'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { processLogoUpload } from '../../services/brandService';
import { LogoVariant, ColorAnalysis } from '../../types/brand';

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoUploaded: (logoUrl: string, analysis?: ColorAnalysis) => void;
  currentLogoUrl?: string;
  userId: string;
  campaignId: string;
  designId: string;
}

const LogoUploadModal = ({
  isOpen,
  onClose,
  onLogoUploaded,
  currentLogoUrl,
  userId,
  campaignId,
  designId
}: LogoUploadModalProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)';
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return 'File size must be less than 5MB';
    }

    return null;
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Create preview URL immediately
      const tempPreviewUrl = URL.createObjectURL(file);
      setPreviewUrl(tempPreviewUrl);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Process the logo upload with campaign-specific path
      const result = await processLogoUpload(file, userId, `${campaignId}_${designId}`);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Clean up temporary URL
      URL.revokeObjectURL(tempPreviewUrl);
      
      // Update preview to Firebase URL
      setPreviewUrl(result.variants[0].url);
      
      // Notify parent component
      onLogoUploaded(result.variants[0].url, result.analysis);
      
      // Auto-close after successful upload
      setTimeout(() => {
        onClose();
        setPreviewUrl(null);
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Logo upload error:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload logo');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, userId, campaignId, designId, onLogoUploaded, onClose]);

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false,
    disabled: isUploading
  });

  // Handle manual file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    if (!isUploading) {
      setPreviewUrl(null);
      setError(null);
      setUploadProgress(0);
      onClose();
    }
  }, [isUploading, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1A1A1A] rounded-lg p-6 max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[#EAEAEA]">
              Upload Different Logo
            </h3>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="text-[#EAEAEA]/60 hover:text-[#EAEAEA] transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Logo Preview */}
          {currentLogoUrl && !previewUrl && (
            <div className="mb-4">
              <p className="text-sm text-[#EAEAEA]/60 mb-2">Current logo:</p>
              <div className="w-20 h-20 bg-white rounded-lg p-2 mx-auto">
                <img
                  src={currentLogoUrl}
                  alt="Current logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                : 'border-[#2F2F2F] hover:border-[#00F0FF]/50'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            
            {previewUrl ? (
              <div className="space-y-3">
                <div className="w-24 h-24 bg-white rounded-lg p-2 mx-auto">
                  <img
                    src={previewUrl}
                    alt="Logo preview"
                    className="w-full h-full object-contain"
                  />
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <div className="w-full bg-[#2F2F2F] rounded-full h-2">
                      <div
                        className="bg-[#00F0FF] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-[#00F0FF]">
                      {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-12 h-12 mx-auto text-[#EAEAEA]/60">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-[#EAEAEA] font-medium mb-1">
                    {isDragActive ? 'Drop logo here' : 'Upload a different logo'}
                  </p>
                  <p className="text-sm text-[#EAEAEA]/60">
                    Drag & drop or click to browse
                  </p>
                  <p className="text-xs text-[#EAEAEA]/40 mt-2">
                    JPEG, PNG, GIF, WebP • Max 5MB
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Manual File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] py-2 px-4 rounded-lg font-medium hover:bg-[#00F0FF]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Choose File
            </button>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 bg-[#2F2F2F] text-[#EAEAEA] py-2 px-4 rounded-lg font-medium hover:bg-[#2F2F2F]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-400 text-xs">
              <strong>Note:</strong> This logo will only be used for this specific design. 
              Your brand's main logo remains unchanged.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LogoUploadModal;
