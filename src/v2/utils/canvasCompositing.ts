/**
 * Canvas Compositing Utilities
 * For combining postcard images with logos client-side
 */

export interface CompositeOptions {
  // Logo positioning (in pixels)
  logoPosition: {
    x: number;
    y: number;
  };
  
  // Logo dimensions (in pixels)
  logoDimensions: {
    width: number;
    height: number;
  };
  
  // Output options
  quality?: number; // 0-1, default 0.95
  format?: 'image/jpeg' | 'image/png'; // default 'image/jpeg'
}

/**
 * Composite logo onto postcard image using HTML5 Canvas
 */
export async function compositeLogoOnImage(
  backgroundImageUrl: string,
  logoImageUrl: string,
  options: CompositeOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    const backgroundImg = new Image();
    const logoImg = new Image();
    
    let imagesLoaded = 0;
    const totalImages = 2;
    
    const checkAllLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        try {
          // Set canvas dimensions to match background image
          canvas.width = backgroundImg.width;
          canvas.height = backgroundImg.height;
          
          // Draw background image
          ctx.drawImage(backgroundImg, 0, 0);
          
          // Draw logo at specified position and size
          ctx.drawImage(
            logoImg,
            options.logoPosition.x,
            options.logoPosition.y,
            options.logoDimensions.width,
            options.logoDimensions.height
          );
          
          // Convert to data URL
          const quality = options.quality ?? 0.95;
          const format = options.format ?? 'image/jpeg';
          const dataUrl = canvas.toDataURL(format, quality);
          
          resolve(dataUrl);
        } catch (error) {
          reject(error);
        }
      }
    };
    
    const handleError = (error: Event) => {
      reject(new Error('Failed to load image'));
    };
    
    // Load background image
    backgroundImg.crossOrigin = 'anonymous';
    backgroundImg.onload = checkAllLoaded;
    backgroundImg.onerror = handleError;
    backgroundImg.src = backgroundImageUrl;
    
    // Load logo image
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = checkAllLoaded;
    logoImg.onerror = handleError;
    logoImg.src = logoImageUrl;
  });
}

/**
 * Download composited image as file
 */
export function downloadCompositedImage(
  dataUrl: string,
  filename: string = 'postcard-with-logo.jpg'
): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert data URL to Blob for upload
 */
export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          resolve(new Blob());
        }
      }, 'image/jpeg', 0.95);
    };
    
    img.src = dataUrl;
  });
}

/**
 * Upload composited image to Firebase Storage
 */
export async function uploadCompositedImage(
  dataUrl: string,
  userId: string,
  campaignId: string,
  designId: string,
  optionLabel: 'A' | 'B'
): Promise<string> {
  try {
    const blob = await dataUrlToBlob(dataUrl);
    
    // Create form data for upload
    const formData = new FormData();
    formData.append('image', blob, `${designId}-${optionLabel}-composited.jpg`);
    formData.append('userId', userId);
    formData.append('campaignId', campaignId);
    formData.append('designId', designId);
    formData.append('optionLabel', optionLabel);
    
    // Upload via API endpoint
    const response = await fetch('/api/v2/upload-composited-image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.imageUrl;
    
  } catch (error) {
    console.error('Error uploading composited image:', error);
    throw error;
  }
}

/**
 * Create a preview canvas element for display
 */
export function createPreviewCanvas(
  backgroundImageUrl: string,
  logoImageUrl: string,
  options: CompositeOptions,
  maxWidth: number = 800,
  maxHeight: number = 600
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    const backgroundImg = new Image();
    const logoImg = new Image();
    
    let imagesLoaded = 0;
    const totalImages = 2;
    
    const checkAllLoaded = () => {
      imagesLoaded++;
      if (imagesLoaded === totalImages) {
        try {
          // Calculate display dimensions while maintaining aspect ratio
          const aspectRatio = backgroundImg.width / backgroundImg.height;
          let displayWidth = Math.min(backgroundImg.width, maxWidth);
          let displayHeight = displayWidth / aspectRatio;
          
          if (displayHeight > maxHeight) {
            displayHeight = maxHeight;
            displayWidth = displayHeight * aspectRatio;
          }
          
          // Set canvas dimensions
          canvas.width = displayWidth;
          canvas.height = displayHeight;
          
          // Calculate scaling factors
          const scaleX = displayWidth / backgroundImg.width;
          const scaleY = displayHeight / backgroundImg.height;
          
          // Draw background image (scaled)
          ctx.drawImage(backgroundImg, 0, 0, displayWidth, displayHeight);
          
          // Draw logo at scaled position and size
          const scaledLogoX = options.logoPosition.x * scaleX;
          const scaledLogoY = options.logoPosition.y * scaleY;
          const scaledLogoWidth = options.logoDimensions.width * scaleX;
          const scaledLogoHeight = options.logoDimensions.height * scaleY;
          
          ctx.drawImage(
            logoImg,
            scaledLogoX,
            scaledLogoY,
            scaledLogoWidth,
            scaledLogoHeight
          );
          
          resolve(canvas);
        } catch (error) {
          reject(error);
        }
      }
    };
    
    const handleError = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load images
    backgroundImg.crossOrigin = 'anonymous';
    backgroundImg.onload = checkAllLoaded;
    backgroundImg.onerror = handleError;
    backgroundImg.src = backgroundImageUrl;
    
    logoImg.crossOrigin = 'anonymous';
    logoImg.onload = checkAllLoaded;
    logoImg.onerror = handleError;
    logoImg.src = logoImageUrl;
  });
}
