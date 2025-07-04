import { Timestamp } from 'firebase/firestore';

/**
 * V2 Brand Types
 * Enhanced brand management with logo processing, color extraction, and performance tracking
 */

// Color extraction and analysis
export interface ExtractedColors {
  primary: string;       // Dominant color as hex
  secondary: string;     // Secondary color as hex
  accent?: string;       // Optional accent color
  palette: string[];     // Full color palette (up to 8 colors)
  confidence: number;    // 0-1 confidence score from color-thief
}

export interface ColorAnalysis {
  extracted: ExtractedColors;
  contrast: {
    primaryVsWhite: number;    // WCAG contrast ratio
    primaryVsBlack: number;    // WCAG contrast ratio
    isAccessible: boolean;     // Meets WCAG AA standard
    recommendations?: string[];  // Suggested improvements
  };
  harmony: {
    scheme: 'monochromatic' | 'analogous' | 'complementary' | 'triadic' | 'custom';
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    suggestions?: string[];
  };
}

// Logo management
export interface LogoVariant {
  type: 'svg' | 'png' | 'jpg';
  url: string;
  size: {
    width: number;
    height: number;
    fileSize: number; // bytes
  };
  purpose: 'original' | 'optimized' | 'thumbnail' | 'social';
  createdAt: Timestamp;
}

export interface LogoProcessingStatus {
  stage: 'uploading' | 'processing' | 'analyzing' | 'complete' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
}

// Usage and performance tracking
export interface BrandUsageStats {
  totalCampaigns: number;
  totalLeads: number;
  totalSpent: number;
  avgResponseRate?: number;
  lastUsed?: Timestamp;
  performanceScore?: number; // 0-100 based on response rates
}

export interface BrandValidation {
  isComplete: boolean;
  missingFields: string[];
  warnings: string[];
  score: number; // 0-100 completeness score
}

// Main V2 Brand interface
export interface V2Brand {
  // Identification
  id?: string;
  name: string;
  description?: string;
  
  // Business Information
  businessInfo: {
    type?: string;         // e.g., "restaurant", "retail", etc.
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  
  // Logo and Visual Identity
  logo: {
    variants: LogoVariant[];
    processing?: LogoProcessingStatus;
    colors?: ColorAnalysis;
    hasTransparentBackground: boolean;
    preferredVariant?: 'svg' | 'png'; // Which to use in designs
  };
  
  // Brand Identity
  identity: {
    tagline?: string;
    voice?: 'professional' | 'friendly' | 'casual' | 'authoritative' | 'creative';
    keywords: string[];     // For AI prompt generation
    targetAudience?: string;
    valueProposition?: string;
  };
  
  // Social Media
  socialMedia: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
  };
  
  // Settings and Preferences
  settings: {
    isDefault: boolean;           // User's default brand
    allowPublicTemplates: boolean; // Share as community templates
    autoColorExtraction: boolean;  // Extract colors from uploads
    preferredDesignStyle?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'corporate';
  };
  
  // Usage and Performance
  usage: BrandUsageStats;
  validation: BrandValidation;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerUid: string;
  version: number; // For data migrations
}

// For creating new brands
export interface CreateBrandRequest {
  name: string;
  businessInfo?: Partial<V2Brand['businessInfo']>;
  identity?: Partial<V2Brand['identity']>;
  socialMedia?: Partial<V2Brand['socialMedia']>;
  logoFile?: File; // For direct file upload
  logoData?: { // For pre-uploaded logo data
    variants: LogoVariant[];
    analysis: ColorAnalysis;
  };
}

// For brand selection and display
export interface BrandSummary {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  totalCampaigns: number;
  lastUsed?: Timestamp;
  isDefault: boolean;
  completeness: number; // 0-100
}

// For brand switching during campaign creation
export interface BrandSwitchContext {
  currentBrandId: string;
  availableBrands: BrandSummary[];
  canSwitchWithoutLoss: boolean; // If no work would be lost
  warningMessage?: string;
}

// Logo upload and processing
export interface LogoUploadRequest {
  file: File;
  extractColors?: boolean;
  generateVariants?: boolean;
}

export interface LogoUploadResponse {
  success: boolean;
  variants: LogoVariant[];
  colors?: ExtractedColors;
  analysis?: ColorAnalysis;
  processingId?: string; // For tracking async operations
}

// Brand validation and suggestions
export interface BrandCompletionSuggestion {
  field: keyof V2Brand;
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: 'add' | 'improve' | 'verify';
}

export interface BrandHealthCheck {
  overall: 'excellent' | 'good' | 'needs_work' | 'incomplete';
  score: number; // 0-100
  suggestions: BrandCompletionSuggestion[];
  lastChecked: Timestamp;
}

// For Firestore subcollection structure - use Omit<V2Brand, 'id'> directly

// Utility types for forms and UI
export type BrandFormData = Partial<CreateBrandRequest>;
export type BrandUpdateData = Partial<Omit<V2Brand, 'id' | 'createdAt' | 'ownerUid' | 'version'>>;

// Constants for validation
export const BRAND_VALIDATION_RULES = {
  name: {
    minLength: 2,
    maxLength: 50,
    required: true
  },
  logo: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/svg+xml', 'image/png', 'image/jpeg'],
    required: false
  },
  businessInfo: {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    website: {
      pattern: /^https?:\/\/.+/
    }
  }
} as const; 