import sharp from 'sharp';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { V2Brand } from '@/v2/types/brand';
import { V2Design } from '@/v2/types/design';

// Types
interface ProcessedImage {
  url: string;
  width: number;
  height: number;
  size: number;
}

interface ProcessingResult {
  front: ProcessedImage;
  back?: ProcessedImage;
  processingTime: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

// Logo position in inches from top-left
export interface LogoPosition {
  x: number;      // inches from left
  y: number;      // inches from top
  width: number;  // logo width in inches
  height: number; // logo height in inches
}

// Constants
const STANNP_DIMENSIONS: ImageDimensions = {
  width: 1871,  // 6.24" at 300 DPI
  height: 1271  // 4.24" at 300 DPI
};

const AI_OUTPUT_DIMENSIONS: ImageDimensions = {
  width: 1800,  // 6" at 300 DPI
  height: 1200  // 4" at 300 DPI
};

const DPI = 300;
const JPEG_QUALITY = 95;

/**
 * Main function to process a postcard for print
 */
export async function processPostcardForPrint(
  aiImageUrl: string,
  brand: V2Brand,
  campaignId: string,
  designId: string
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    // 1. Download AI-generated image
    const aiImageBuffer = await downloadImage(aiImageUrl);
    
    // 2. Upscale to Stannp dimensions
    const upscaledBuffer = await upscaleImage(aiImageBuffer);
    
    // 3. Composite logo if brand has one
    let finalBuffer = upscaledBuffer;
    if (brand.logo?.variants?.length > 0) {
      const logoUrl = brand.logo.variants[0].url;
      const logoBuffer = await downloadImage(logoUrl);
      const logoPosition = calculateLogoPosition(brand);
      finalBuffer = await compositeLogoOnImage(upscaledBuffer, logoBuffer, logoPosition);
    }
    
    // 4. Upload to Firebase Storage using V2 path structure
    const frontImage = await uploadToStorage(
      finalBuffer,
      `v2/campaigns/${campaignId}/final/${designId}-front-processed.jpg`
    );
    
    // TODO: Handle back design if needed
    
    return {
      front: frontImage,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('Error processing postcard:', error);
    throw new Error(`Failed to process postcard: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Download image from URL
 */
async function downloadImage(url: string): Promise<Buffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading image:', url, error);
    throw new Error(`Failed to download image from ${url}`);
  }
}

/**
 * Upscale image to Stannp dimensions using high-quality Lanczos algorithm
 */
async function upscaleImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(imageBuffer)
      .resize(STANNP_DIMENSIONS.width, STANNP_DIMENSIONS.height, {
        kernel: sharp.kernel.lanczos3,  // High-quality upscaling
        withoutEnlargement: false,      // Allow upscaling
        fit: 'fill'                     // Exact dimensions
      })
      .jpeg({ 
        quality: JPEG_QUALITY,
        progressive: true,
        mozjpeg: true  // Better compression
      })
      .toBuffer();
  } catch (error) {
    console.error('Error upscaling image:', error);
    throw new Error('Failed to upscale image');
  }
}

/**
 * Calculate logo position based on brand settings and safe zones
 */
function calculateLogoPosition(brand: V2Brand): LogoPosition {
  // Default position from brand or fallback
  const defaultPosition: LogoPosition = {
    x: 0.25,    // 0.25" from left (in safe zone)
    y: 0.25,    // 0.25" from top (in safe zone)
    width: 1.5, // Max 1.5" width
    height: 1.0 // Will be adjusted based on aspect ratio
  };
  
  if (!brand.logo?.variants?.length) return defaultPosition;
  
  const logoVariant = brand.logo.variants[0];
  
  // Adjust height based on logo aspect ratio
  const aspectRatio = logoVariant.size.width / logoVariant.size.height;
  if (aspectRatio >= 1) {
    // Wider logo - constrain by width
    defaultPosition.height = defaultPosition.width / aspectRatio;
  } else {
    // Taller logo - constrain by height
    defaultPosition.width = defaultPosition.height * aspectRatio;
  }
  
  return defaultPosition;
}

/**
 * Composite logo onto the image
 */
async function compositeLogoOnImage(
  imageBuffer: Buffer,
  logoBuffer: Buffer,
  position: LogoPosition
): Promise<Buffer> {
  try {
    // Convert position from inches to pixels
    const pixelPosition = {
      left: Math.round(position.x * DPI),
      top: Math.round(position.y * DPI),
      width: Math.round(position.width * DPI),
      height: Math.round(position.height * DPI)
    };
    
    // Prepare logo with correct dimensions
    const preparedLogo = await sharp(logoBuffer)
      .resize(pixelPosition.width, pixelPosition.height, {
        fit: 'inside',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png() // Convert to PNG to preserve transparency
      .toBuffer();
    
    // Composite logo onto image
    return await sharp(imageBuffer)
      .composite([{
        input: preparedLogo,
        left: pixelPosition.left,
        top: pixelPosition.top,
        blend: 'over' // Proper alpha blending
      }])
      .jpeg({ 
        quality: JPEG_QUALITY,
        progressive: true
      })
      .toBuffer();
  } catch (error) {
    console.error('Error compositing logo:', error);
    throw new Error('Failed to composite logo on image');
  }
}

/**
 * Upload processed image to Firebase Storage
 */
async function uploadToStorage(
  buffer: Buffer,
  path: string
): Promise<ProcessedImage> {
  try {
    const storageRef = ref(storage, path);
    
    // Get image metadata
    const metadata = await sharp(buffer).metadata();
    
    // Upload with proper content type
    const snapshot = await uploadBytes(storageRef, buffer, {
      contentType: 'image/jpeg',
      customMetadata: {
        processedAt: new Date().toISOString(),
        width: String(metadata.width || 0),
        height: String(metadata.height || 0)
      }
    });
    
    // Get public URL
    const url = await getDownloadURL(snapshot.ref);
    
    return {
      url,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: buffer.length
    };
  } catch (error) {
    console.error('Error uploading to storage:', error);
    throw new Error('Failed to upload image to storage');
  }
}

/**
 * Process multiple designs for a campaign
 */
export async function processCampaignDesigns(
  campaignId: string,
  designs: Array<{ design: V2Design; brand: V2Brand }>
): Promise<Map<string, ProcessingResult>> {
  const results = new Map<string, ProcessingResult>();
  
  // Process designs in parallel for speed
  const processingPromises = designs.map(async ({ design, brand }) => {
    try {
      if (!design.generation?.finalImageUrl) {
        throw new Error(`Design ${design.id} has no final image URL`);
      }
      
      const result = await processPostcardForPrint(
        design.generation.finalImageUrl,
        brand,
        campaignId,
        design.id || 'unknown'
      );
      results.set(design.id || 'unknown', result);
    } catch (error) {
      console.error(`Failed to process design ${design.id}:`, error);
      throw error;
    }
  });
  
  await Promise.all(processingPromises);
  return results;
}

/**
 * Validate image before processing
 */
export async function validateImage(imageUrl: string): Promise<boolean> {
  try {
    const buffer = await downloadImage(imageUrl);
    const metadata = await sharp(buffer).metadata();
    
    // Check dimensions match expected AI output
    if (metadata.width !== AI_OUTPUT_DIMENSIONS.width || 
        metadata.height !== AI_OUTPUT_DIMENSIONS.height) {
      console.warn(`Image dimensions mismatch. Expected ${AI_OUTPUT_DIMENSIONS.width}x${AI_OUTPUT_DIMENSIONS.height}, got ${metadata.width}x${metadata.height}`);
    }
    
    return true;
  } catch (error) {
    console.error('Image validation failed:', error);
    return false;
  }
}

/**
 * Generate a preview thumbnail for quick loading
 */
export async function generateThumbnail(
  imageUrl: string,
  campaignId: string,
  designId: string,
  maxWidth: number = 400
): Promise<string> {
  try {
    const buffer = await downloadImage(imageUrl);
    
    const thumbnail = await sharp(buffer)
      .resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // Upload thumbnail to storage
    const thumbnailPath = `v2/campaigns/${campaignId}/previews/${designId}-thumbnail.jpg`;
    const thumbnailResult = await uploadToStorage(thumbnail, thumbnailPath);
    
    return thumbnailResult.url;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw new Error('Failed to generate thumbnail');
  }
}

/**
 * Save intermediate processing files (for debugging or manual review)
 */
export async function saveIntermediateFile(
  buffer: Buffer,
  campaignId: string,
  fileName: string
): Promise<string> {
  const path = `v2/campaigns/${campaignId}/working/${fileName}`;
  const result = await uploadToStorage(buffer, path);
  return result.url;
}

// Error recovery utilities
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
} 