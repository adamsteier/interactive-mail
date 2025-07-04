import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  V2Brand, 
  CreateBrandRequest, 
  BrandSummary, 
  ExtractedColors, 
  ColorAnalysis, 
  LogoVariant,
  BrandValidation,
  BRAND_VALIDATION_RULES 
} from '../types/brand';

/**
 * V2 Brand Service
 * Handles all brand management operations including logo analysis and color extraction
 */

/**
 * Create a new brand for a user
 */
export async function createBrand(
  userId: string, 
  brandData: CreateBrandRequest
): Promise<{ success: boolean; brandId?: string; error?: string }> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Validate brand data
    const validation = validateBrandData(brandData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const brandsRef = collection(db, 'users', userId, 'brands');
    
    // Process logo if provided
    let logoVariants: LogoVariant[] = [];
    let colorAnalysis: ColorAnalysis | undefined;
    
    if (brandData.logoData) {
      // Logo already uploaded, use provided data
      logoVariants = brandData.logoData.variants;
      colorAnalysis = brandData.logoData.analysis;
    } else if (brandData.logoFile) {
      // Upload logo file
      const logoResult = await processLogoUpload(brandData.logoFile, userId);
      logoVariants = logoResult.variants;
      colorAnalysis = logoResult.analysis;
    }

    // Create brand document
    const newBrand: Omit<V2Brand, 'id'> = {
      name: brandData.name,
      description: brandData.businessInfo?.type || '',
      
      businessInfo: {
        type: brandData.businessInfo?.type || '',
        address: brandData.businessInfo?.address || '',
        phone: brandData.businessInfo?.phone || '',
        email: brandData.businessInfo?.email || '',
        website: brandData.businessInfo?.website || ''
      },
      
      logo: {
        variants: logoVariants,
        colors: colorAnalysis,
        hasTransparentBackground: logoVariants.some(v => v.type === 'png'),
        preferredVariant: logoVariants.find(v => v.type === 'svg') ? 'svg' : 'png'
      },
      
      identity: {
        tagline: brandData.identity?.tagline || '',
        voice: brandData.identity?.voice || 'professional',
        keywords: brandData.identity?.keywords || [],
        targetAudience: brandData.identity?.targetAudience || '',
        valueProposition: brandData.identity?.valueProposition || ''
      },
      
      socialMedia: {
        instagram: brandData.socialMedia?.instagram || '',
        facebook: brandData.socialMedia?.facebook || '',
        twitter: brandData.socialMedia?.twitter || '',
        linkedin: brandData.socialMedia?.linkedin || '',
        tiktok: brandData.socialMedia?.tiktok || '',
        youtube: brandData.socialMedia?.youtube || ''
      },
      
      settings: {
        isDefault: false, // Will be set after checking if this is the first brand
        allowPublicTemplates: false,
        autoColorExtraction: true,
        preferredDesignStyle: 'minimal'
      },
      
      usage: {
        totalCampaigns: 0,
        totalLeads: 0,
        totalSpent: 0,
        avgResponseRate: undefined,
        lastUsed: undefined,
        performanceScore: undefined
      },
      
      validation: validateBrandCompleteness({
        name: brandData.name,
        logo: { 
          variants: logoVariants,
          hasTransparentBackground: logoVariants.some(v => v.type === 'png')
        },
        businessInfo: brandData.businessInfo,
        identity: brandData.identity ? {
          ...brandData.identity,
          keywords: brandData.identity.keywords || []
        } : undefined,
        socialMedia: brandData.socialMedia
      }),
      
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      ownerUid: userId,
      version: 1
    };

    // Check if this should be the default brand (first brand)
    const existingBrands = await getUserBrands(userId);
    if (existingBrands.length === 0) {
      newBrand.settings.isDefault = true;
    }

    const docRef = await addDoc(brandsRef, newBrand);
    
    return { 
      success: true, 
      brandId: docRef.id 
    };
    
  } catch (error) {
    console.error('Error creating brand:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get all brands for a user with usage stats
 */
export async function getUserBrands(userId: string): Promise<BrandSummary[]> {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const brandsRef = collection(db, 'users', userId, 'brands');
    // Simplified query to avoid composite index requirement
    const q = query(
      brandsRef, 
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    const brands = snapshot.docs.map(doc => {
      const data = doc.data() as V2Brand;
      
      return {
        id: doc.id,
        name: data.name,
        logoUrl: data.logo.variants[0]?.url,
        primaryColor: data.logo.colors?.extracted.primary,
        totalCampaigns: data.usage.totalCampaigns,
        lastUsed: data.usage.lastUsed,
        isDefault: data.settings.isDefault,
        completeness: data.validation.score
      };
    });
    
    // Sort on client side: default brands first, then by last used
    return brands.sort((a, b) => {
      // Default brands come first
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      
      // Then sort by last used (most recent first)
      if (a.lastUsed && b.lastUsed) {
        // lastUsed is already a Timestamp in the BrandSummary type
        return (b.lastUsed as any).toMillis() - (a.lastUsed as any).toMillis();
      }
      if (a.lastUsed && !b.lastUsed) return -1;
      if (!a.lastUsed && b.lastUsed) return 1;
      
      return 0;
    });
    
  } catch (error) {
    console.error('Error fetching user brands:', error);
    return [];
  }
}

/**
 * Get a specific brand by ID
 */
export async function getBrand(userId: string, brandId: string): Promise<V2Brand | null> {
  try {
    const brandRef = doc(db, 'users', userId, 'brands', brandId);
    const brandSnap = await getDoc(brandRef);
    
    if (!brandSnap.exists()) {
      return null;
    }
    
    return { id: brandSnap.id, ...brandSnap.data() } as V2Brand;
    
  } catch (error) {
    console.error('Error fetching brand:', error);
    return null;
  }
}

/**
 * Update an existing brand
 */
export async function updateBrand(
  userId: string, 
  brandId: string, 
  updates: Partial<V2Brand>
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || !brandId) {
      throw new Error('User ID and Brand ID are required');
    }

    const brandRef = doc(db, 'users', userId, 'brands', brandId);
    
    // Add update timestamp and increment version
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
      version: (updates.version || 1) + 1
    };
    
    await updateDoc(brandRef, updateData);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error updating brand:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Set a brand as the default for a user
 */
export async function setDefaultBrand(userId: string, brandId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || !brandId) {
      throw new Error('User ID and Brand ID are required');
    }

    const batch = writeBatch(db);
    
    // First, unset all existing default brands
    const brandsRef = collection(db, 'users', userId, 'brands');
    const existingDefaults = await getDocs(query(brandsRef, where('settings.isDefault', '==', true)));
    
    existingDefaults.forEach(doc => {
      batch.update(doc.ref, { 
        'settings.isDefault': false,
        updatedAt: serverTimestamp()
      });
    });
    
    // Set the new default brand
    const newDefaultRef = doc(db, 'users', userId, 'brands', brandId);
    batch.update(newDefaultRef, { 
      'settings.isDefault': true,
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    return { success: true };
    
  } catch (error) {
    console.error('Error setting default brand:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Clone an existing brand
 */
export async function cloneBrand(
  userId: string, 
  brandId: string, 
  newName?: string
): Promise<{ success: boolean; brandId?: string; error?: string }> {
  try {
    const originalBrand = await getBrand(userId, brandId);
    if (!originalBrand) {
      throw new Error('Original brand not found');
    }

    // Create a copy without the ID and with updated name
    const clonedBrand: CreateBrandRequest = {
      name: newName || `${originalBrand.name} (Copy)`,
      businessInfo: originalBrand.businessInfo,
      identity: originalBrand.identity,
      socialMedia: originalBrand.socialMedia
    };

    return await createBrand(userId, clonedBrand);
    
  } catch (error) {
    console.error('Error cloning brand:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Soft delete a brand (mark as deleted but keep data)
 */
export async function deleteBrand(userId: string, brandId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || !brandId) {
      throw new Error('User ID and Brand ID are required');
    }

    // Check if this is the default brand
    const brand = await getBrand(userId, brandId);
    if (brand?.settings.isDefault) {
      throw new Error('Cannot delete the default brand. Please set another brand as default first.');
    }

    // For now, we'll do a hard delete
    // In the future, we might want to implement soft delete
    const brandRef = doc(db, 'users', userId, 'brands', brandId);
    await deleteDoc(brandRef);
    
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting brand:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Process logo upload and extract colors/dimensions
 */
export async function processLogoUpload(file: File, userId?: string): Promise<{
  variants: LogoVariant[];
  analysis: ColorAnalysis;
}> {
  try {
    // Create a temporary URL for processing
    const tempUrl = URL.createObjectURL(file);
    
    // Extract colors and dimensions first
    const extractedColors = await extractLogoColors(tempUrl);
    const dimensions = await getImageDimensions(tempUrl);
    
    // Generate a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'png';
    const fileName = `logo_${timestamp}_original.${fileExtension}`;
    
    // Create storage path
    // If userId is provided, store under user's folder, otherwise use temp folder
    const storagePath = userId 
      ? `users/${userId}/brands/logos/${fileName}`
      : `temp/logos/${fileName}`;
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);
    const uploadResult = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Get the download URL
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    
    // Clean up temporary URL
    URL.revokeObjectURL(tempUrl);
    
    // Analyze contrast and harmony
    const analysis: ColorAnalysis = {
      extracted: extractedColors,
      contrast: calculateLogoContrast(extractedColors),
      harmony: analyzeColorHarmony(extractedColors)
    };
    
    // Create the variant with the Firebase Storage URL
    const variant: LogoVariant = {
      type: file.type.includes('svg') ? 'svg' : file.type.includes('png') ? 'png' : 'jpg',
      url: downloadUrl,
      size: {
        width: dimensions.width,
        height: dimensions.height,
        fileSize: file.size
      },
      purpose: 'original',
      createdAt: new Date() as unknown as Timestamp
    };
    
    return {
      variants: [variant],
      analysis
    };
    
  } catch (error) {
    console.error('Error processing logo upload:', error);
    throw new Error('Failed to process logo upload');
  }
}

/**
 * Get image dimensions from a URL
 */
async function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension extraction'));
    };
    
    img.src = url;
  });
}

/**
 * Extract colors from logo using Canvas API
 */
export async function extractLogoColors(logoUrl: string): Promise<ExtractedColors> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Cannot get canvas context');
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Get image data and extract colors
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const colors = extractColorsFromImageData(imageData);
        
        resolve(colors);
        
      } catch {
        reject(new Error('Failed to extract colors from image'));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for color extraction'));
    };
    
    img.src = logoUrl;
  });
}

/**
 * Extract colors from ImageData using simple sampling
 */
function extractColorsFromImageData(imageData: ImageData): ExtractedColors {
  const data = imageData.data;
  const colorMap = new Map<string, number>();
  
  // Sample every 4th pixel to speed up processing
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    const hex = rgbToHex(r, g, b);
    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
  }
  
  // Sort colors by frequency
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex)
    .slice(0, 8);
  
  return {
    primary: sortedColors[0] || '#000000',
    secondary: sortedColors[1] || sortedColors[0] || '#000000',
    accent: sortedColors[2],
    palette: sortedColors,
    confidence: Math.min(colorMap.size / 20, 1) // Simple confidence based on color variety
  };
}

/**
 * Calculate WCAG contrast ratios for accessibility
 */
export function calculateLogoContrast(colors: ExtractedColors): ColorAnalysis['contrast'] {
  const primaryLuminance = getLuminance(colors.primary);
  
  const contrastVsWhite = getContrastRatio(primaryLuminance, 1); // White luminance = 1
  const contrastVsBlack = getContrastRatio(primaryLuminance, 0); // Black luminance = 0
  
  const isAccessible = contrastVsWhite >= 4.5 || contrastVsBlack >= 4.5; // WCAG AA standard
  
  const recommendations: string[] = [];
  if (!isAccessible) {
    if (contrastVsWhite > contrastVsBlack) {
      recommendations.push('Use white or light backgrounds for better contrast');
    } else {
      recommendations.push('Use dark backgrounds for better contrast');
    }
  }
  
  return {
    primaryVsWhite: contrastVsWhite,
    primaryVsBlack: contrastVsBlack,
    isAccessible,
    recommendations
  };
}

/**
 * Analyze color harmony and quality
 */
export function analyzeColorHarmony(colors: ExtractedColors): ColorAnalysis['harmony'] {
  // Simple harmony analysis - in production, this would be more sophisticated
  const paletteSize = colors.palette.length;
  
  let scheme: ColorAnalysis['harmony']['scheme'] = 'custom';
  let quality: ColorAnalysis['harmony']['quality'] = 'good';
  
  // Basic scheme detection
  if (paletteSize <= 2) {
    scheme = 'monochromatic';
  } else if (paletteSize <= 4) {
    scheme = 'analogous';
  }
  
  // Quality assessment based on color diversity and balance
  if (colors.confidence > 0.9 && paletteSize >= 4) {
    quality = 'excellent';
  } else if (colors.confidence < 0.5) {
    quality = 'poor';
  }
  
  const suggestions: string[] = [];
  if (quality === 'poor') {
    suggestions.push('Consider using a logo with more distinct colors');
  }
  
  return {
    scheme,
    quality,
    suggestions
  };
}

/**
 * Validate brand data before creation/update
 */
function validateBrandData(data: CreateBrandRequest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Name validation
  if (!data.name || data.name.trim().length < BRAND_VALIDATION_RULES.name.minLength) {
    errors.push(`Brand name must be at least ${BRAND_VALIDATION_RULES.name.minLength} characters`);
  }
  
  if (data.name && data.name.length > BRAND_VALIDATION_RULES.name.maxLength) {
    errors.push(`Brand name must be less than ${BRAND_VALIDATION_RULES.name.maxLength} characters`);
  }
  
  // Email validation
  if (data.businessInfo?.email && !BRAND_VALIDATION_RULES.businessInfo.email.pattern.test(data.businessInfo.email)) {
    errors.push('Please enter a valid email address');
  }
  
  // Website validation
  if (data.businessInfo?.website && !BRAND_VALIDATION_RULES.businessInfo.website.pattern.test(data.businessInfo.website)) {
    errors.push('Please enter a valid website URL (starting with http:// or https://)');
  }
  
  // Logo validation
  if (data.logoFile) {
    if (data.logoFile.size > BRAND_VALIDATION_RULES.logo.maxFileSize) {
      errors.push('Logo file must be smaller than 5MB');
    }
    
    if (!BRAND_VALIDATION_RULES.logo.allowedTypes.includes(data.logoFile.type as 'image/svg+xml' | 'image/png' | 'image/jpeg')) {
      errors.push('Logo must be SVG, PNG, or JPEG format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate brand completeness score
 */
function validateBrandCompleteness(brand: Partial<V2Brand>): BrandValidation {
  const missingFields: string[] = [];
  const warnings: string[] = [];
  let score = 0;
  
  // Required fields (20 points each)
  if (brand.name) score += 20;
  else missingFields.push('name');
  
  // Important fields (15 points each)
  if (brand.logo?.variants?.length) score += 15;
  else missingFields.push('logo');
  
  if (brand.businessInfo?.email) score += 15;
  else missingFields.push('email');
  
  // Optional but valuable fields (10 points each)
  if (brand.businessInfo?.phone) score += 10;
  else warnings.push('Phone number helps with credibility');
  
  if (brand.businessInfo?.website) score += 10;
  else warnings.push('Website link increases engagement');
  
  if (brand.identity?.tagline) score += 10;
  else warnings.push('Tagline helps communicate your value proposition');
  
  if (brand.businessInfo?.address) score += 10;
  else warnings.push('Address builds local trust');
  
  // Social media (5 points total)
  const socialCount = Object.values(brand.socialMedia || {}).filter(Boolean).length;
  score += Math.min(socialCount * 1, 5);
  
  if (socialCount === 0) {
    warnings.push('Social media links increase brand credibility');
  }
  
  return {
    isComplete: score >= 85,
    missingFields,
    warnings,
    score: Math.min(score, 100)
  };
}

// Utility functions
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(lum1: number, lum2: number): number {
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
} 