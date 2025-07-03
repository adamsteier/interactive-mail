import { Timestamp } from 'firebase/firestore';

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