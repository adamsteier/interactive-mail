import { Timestamp, FieldValue } from 'firebase/firestore';

/**
 * V2 Design Types
 * Enhanced design management with AI generation, business type assignments, and template system
 */

// AI Generation and Processing
export interface AIGenerationRequest {
  prompt: string;
  style?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'corporate';
  dimensions: {
    width: number;
    height: number;
    format: 'landscape' | 'portrait' | 'square';
  };
  brandContext: {
    brandId: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    keywords: string[];
  };
  industryContext?: string[];
  requiresLogo: boolean;
  variations: number; // How many variants to generate (1-4)
}

export interface AIGenerationStatus {
  stage: 'queued' | 'generating' | 'processing' | 'complete' | 'failed';
  progress: number; // 0-100
  currentTask?: string;
  estimatedCompletion?: Timestamp;
  error?: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  jobId?: string; // For tracking in AI jobs collection
}

export interface GeneratedVariant {
  id: string;
  url: string;
  prompt: string;
  style: string;
  dimensions: AIGenerationRequest['dimensions'];
  confidence: number; // AI confidence score 0-1
  processingTime: number; // seconds
  cost?: number; // API cost in USD
  createdAt: Timestamp;
}

// Design Assignment System
export interface BusinessTypeAssignment {
  businessType: string;
  leadCount: number;
  priority?: 'high' | 'medium' | 'low';
  notes?: string;
}

export interface DesignAssignment {
  strategy: 'one_for_all' | 'one_per_type' | 'custom';
  assignments: Array<{
    designId: string;
    businessTypes: BusinessTypeAssignment[];
    totalLeads: number;
  }>;
  rationale?: string; // Why this assignment was chosen
  estimatedCost: number;
  estimatedCompletionTime: number; // minutes
}

// User Input for Design Creation
export interface DesignInput {
  // Basic Information
  name: string;
  description?: string;
  industry?: string;
  
  // Marketing Content
  headline?: string;
  subheadline?: string;
  callToAction: string;
  offer?: string;
  
  // Target Audience
  targetAudience: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'casual' | 'authoritative';
  
  // Visual Preferences
  style: 'minimal' | 'bold' | 'elegant' | 'playful' | 'corporate';
  colorPreference?: 'brand_colors' | 'complementary' | 'custom';
  customColors?: string[];
  
  // Imagery
  imageryType: 'ai_generated' | 'stock' | 'uploaded' | 'none';
  imageryDescription?: string; // For AI generation
  uploadedImages?: string[]; // URLs of uploaded images
  
  // Advanced Options
  includeQR?: boolean;
  includeLogo?: boolean;
  logoPlacement?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right' | 'center';
  
  // Business Context
  businessTypes: string[]; // Which types this design targets
  expectedLeadCount: number;
}

// Main V2 Design interface
export interface V2Design {
  // Identification
  id?: string;
  name: string;
  description?: string;
  
  // Associations
  brandId: string;
  campaignId?: string; // If part of specific campaign
  
  // Design Content
  input: DesignInput;
  
  // Generated Content
  generation?: {
    request: AIGenerationRequest;
    status: AIGenerationStatus;
    variants: GeneratedVariant[];
    selectedVariantId?: string;
    finalImageUrl?: string;
  };
  
  // Assignment Information
  assignment: {
    businessTypes: BusinessTypeAssignment[];
    totalLeads: number;
    costPerLead: number;
    totalCost: number;
  };
  
  // Template Information
  template?: {
    isTemplate: boolean;
    isPublic: boolean;
    category?: string;
    tags: string[];
    downloads: number;
    rating?: number;
    sourceDesignId?: string; // If created from another design
  };
  
  // Performance Tracking
  performance?: {
    campaignsUsed: number;
    totalLeadsSent: number;
    avgResponseRate?: number;
    totalRevenue?: number;
    lastUsed?: Timestamp;
  };
  
  // Status and Workflow
  status: 'draft' | 'generating' | 'review' | 'approved' | 'sending' | 'sent' | 'archived';
  workflowStage: 'input' | 'generation' | 'review' | 'assignment' | 'finalization';
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerUid: string;
  version: number;
}

// For creating new designs
export interface CreateDesignRequest {
  name: string;
  brandId: string;
  campaignId?: string;
  input: DesignInput;
  generateImmediately?: boolean;
}

// For design selection and display
export interface DesignSummary {
  id: string;
  name: string;
  thumbnailUrl?: string;
  brandName: string;
  businessTypes: string[];
  totalLeads: number;
  status: V2Design['status'];
  lastUpdated: Timestamp;
  isTemplate: boolean;
}

// For the design assignment interface
export interface AssignmentOption {
  type: 'one_for_all' | 'one_per_type' | 'custom';
  title: string;
  description: string;
  designCount: number;
  totalCost: number;
  estimatedTime: number; // minutes
  pros: string[];
  cons: string[];
  recommended?: boolean;
}

// For template browsing
export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon?: string;
  designCount: number;
  popular: boolean;
}

export interface DesignTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory['id'];
  thumbnailUrl: string;
  previewUrls: string[];
  tags: string[];
  industry: string[];
  rating: number;
  downloads: number;
  isPremium: boolean;
  createdBy: 'system' | 'community';
  createdAt: Timestamp;
}

// For design editing and customization
export interface DesignCustomization {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  text?: {
    headline?: string;
    subheadline?: string;
    callToAction?: string;
    offer?: string;
  };
  logo?: {
    include: boolean;
    placement?: DesignInput['logoPlacement'];
    size?: 'small' | 'medium' | 'large';
  };
  layout?: {
    style?: DesignInput['style'];
    alignment?: 'left' | 'center' | 'right';
  };
}

// For AI job tracking
export interface DesignAIJob {
  id?: string;
  designId: string;
  brandId: string;
  campaignId?: string;
  type: 'generate' | 'regenerate' | 'variation';
  request: AIGenerationRequest;
  status: AIGenerationStatus;
  result?: {
    variants: GeneratedVariant[];
    selectedVariantId?: string;
    error?: string;
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// For design review and approval
export interface DesignReview {
  designId: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_changes';
  feedback?: string;
  suggestedChanges?: DesignCustomization;
  reviewedAt: Timestamp;
}

// Utility types for forms and UI
export type DesignFormData = Partial<CreateDesignRequest>;
export type DesignUpdateData = Partial<Omit<V2Design, 'id' | 'createdAt' | 'ownerUid' | 'version'>>;

// Constants for validation and UI
export const DESIGN_VALIDATION_RULES = {
  name: {
    minLength: 3,
    maxLength: 50,
    required: true
  },
  callToAction: {
    minLength: 5,
    maxLength: 30,
    required: true
  },
  targetAudience: {
    minLength: 5,
    maxLength: 100,
    required: true
  },
  uploadedImages: {
    maxCount: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB per image
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
} as const;

export const DESIGN_STYLES = [
  { id: 'minimal', name: 'Minimal', description: 'Clean, simple, lots of white space' },
  { id: 'bold', name: 'Bold', description: 'Strong colors, impactful typography' },
  { id: 'elegant', name: 'Elegant', description: 'Sophisticated, refined, premium feel' },
  { id: 'playful', name: 'Playful', description: 'Fun, energetic, creative elements' },
  { id: 'corporate', name: 'Corporate', description: 'Professional, trustworthy, conservative' }
] as const;

export const TONE_OPTIONS = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-focused' },
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
  { id: 'urgent', name: 'Urgent', description: 'Creates sense of urgency' },
  { id: 'casual', name: 'Casual', description: 'Relaxed and conversational' },
  { id: 'authoritative', name: 'Authoritative', description: 'Expert and confident' }
] as const;

// Postcard Specifications
export interface PostcardSpecs {
  width: number; // inches
  height: number; // inches
  bleed: number; // inches
  dpi: number;
  format: 'landscape' | 'portrait';
}

// Creative Brief System
export interface BriefGenerationContext {
  // Brand data
  brandName: string;
  brandColors: string[];
  logoAnalysis: {
    width: number;
    height: number;
    position: { x: number; y: number };
    backgroundRequirement: 'light' | 'dark';
    promptInstructions: string;
  };
  
  // Contact Information
  contactInfo: {
    phone?: { label: "Phone"; value: string };
    email?: { label: "Email"; value: string };
    website?: { label: "Website"; value: string };
    address?: { label: "Address"; value: string };
  };
  
  // Social Media
  socialMedia: {
    instagram?: { label: "Instagram"; value: string };
    facebook?: { label: "Facebook"; value: string };
    linkedin?: { label: "LinkedIn"; value: string };
    twitter?: { label: "Twitter"; value: string };
    tiktok?: { label: "TikTok"; value: string };
    youtube?: { label: "YouTube"; value: string };
  };
  
  // Campaign data  
  industry: string;
  businessTypes: string[];
  leadCounts: Record<string, number>;
  voice: string;
  campaignGoal: string;
  targetAudience: string;
  businessDescription?: string;
  imageryInstructions?: string;
}

export interface CreativeBrief {
  id: string;
  campaignId: string;
  brandId: string;
  userId: string;
  
  // Generation details
  model: 'gpt-4.1' | 'gpt-4o';
  temperature: number;
  // FIXED: Allow FieldValue during creation, Timestamp when read
  generatedAt: Timestamp | FieldValue;
  
  // Brief content
  briefText: string; // Full editable text
  
  // Context used for generation
  context: BriefGenerationContext;
  
  // Tracking
  selected?: boolean;
  designGenerated?: boolean;
  edited?: boolean;
  originalBriefText?: string; // If edited, keep original
  
  // Performance (if used)
  designPerformance?: {
    campaignSuccess?: boolean;
    userFeedback?: number; // 1-5 rating
    notes?: string;
  };
}

export interface BriefGenerationJob {
  id: string;
  campaignId: string;
  brandId: string;
  userId: string;
  status: 'generating' | 'complete' | 'failed';
  // FIXED: Allow FieldValue during creation, Timestamp when read
  startedAt: Timestamp | FieldValue;
  completedAt?: Timestamp | FieldValue;
  
  // Results - store brief references, not full objects (to avoid FieldValue in arrays)
  briefs: Array<{
    id: string;
    model: 'gpt-4.1' | 'gpt-4o';
    temperature: number;
    order: number;
    selected: boolean;
    briefText: string; // Preview only
  }>;
  totalBriefs: number;
  completedBriefs: number;
  
  // Error handling
  errors?: string[];
}

export interface BriefGenerationRequest {
  campaignId: string;
  brandId: string;
  formData: {
    voice: string;
    goal: string;
    industry: string;
    audience: string;
    businessDescription?: string;
    imageryInstructions?: string;
  };
  businessTypes: Array<{
    type: string;
    count: number;
  }>;
}

// For Firestore subcollection structure
export type CreateBriefRequest = Omit<CreativeBrief, 'id' | 'generatedAt'>;
export type UpdateBriefRequest = Partial<Pick<CreativeBrief, 'briefText' | 'selected' | 'edited' | 'designGenerated' | 'designPerformance'>>;

// Utility types
export type BriefFormData = Partial<BriefGenerationRequest['formData']>;

// Constants
export const BRIEF_GENERATION_CONFIG = {
  totalBriefs: 4,
  models: [
    // FIXED: Make order type more flexible (1-4 but as number, not literal union)
    { model: 'gpt-4.1' as const, temperature: 0.7, order: 1 as number }, // Fast first
    { model: 'gpt-4o' as const, temperature: 0.5, order: 2 as number }, // Conservative
    { model: 'gpt-4o' as const, temperature: 0.9, order: 3 as number }, // Creative
    { model: 'gpt-4o' as const, temperature: 1.1, order: 4 as number }  // Experimental
  ]
} as const;

export const POSTCARD_SPECS: PostcardSpecs = {
  width: 6,
  height: 4, 
  bleed: 0.125,
  dpi: 300,
  format: 'landscape'
} as const; 