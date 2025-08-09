import { Timestamp } from 'firebase/firestore';
import { PricingBreakdown } from '../services/pricing';

/**
 * V2 Campaign Types
 * Enhanced campaign management with brand integration, design assignments, and scheduling
 */

// Lead Management
export interface V2Lead {
  id: string;
  businessType: string;
  assignedDesignId?: string;
  
  // Place/Business Information
  placeId: string; // Google Places ID
  name: string;
  category: string[];
  
  // Address Information
  originalAddress: string; // From Places API
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isVerified: boolean;
  };
  
  // Geographic Data
  location: {
    lat: number;
    lng: number;
  };
  
  // Processing Status
  geocodingStatus: 'pending' | 'complete' | 'failed' | 'manual_review';
  geocodingError?: string;
  geocodingAttempts: number;
  lastGeocodingAttempt?: Timestamp;
  
  // Additional Data
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  
  // Campaign Context
  selectionMethod: 'auto' | 'manual' | 'imported';
  selectionCriteria?: Record<string, unknown>;
  notes?: string;
  
  // Delivery Tracking
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'failed' | 'returned';
  trackingId?: string;
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Lead chunks for scalable storage
export interface LeadChunk {
  chunkIndex: number;
  leadCount: number;
  leads: V2Lead[];
  businessTypes: string[]; // Types present in this chunk
  lastUpdated: Timestamp;
}

// Campaign scheduling
export interface CampaignScheduling {
  requestedSendDate?: Timestamp; // When customer wants it sent
  scheduledSendDate?: Timestamp; // When we'll actually send it
  estimatedArrival: {
    start: Timestamp; // +5 business days from send
    end: Timestamp;   // +10 business days from send
  };
  actualSendDate?: Timestamp;
  isRushOrder: boolean; // If customer paid for expedited
  
  // Business day calculations
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  holidaysToExclude?: string[]; // Holiday codes
  
  // Notifications
  notifications: {
    customerEmail: string;
    sendConfirmation: boolean;
    trackingUpdates: boolean;
    deliveryConfirmation: boolean;
  };
}

// Payment and pricing
export interface CampaignPayment {
  originalAmount: number;
  adjustments: Array<{
    type: 'refund' | 'credit' | 'charge';
    amount: number;
    reason: string;
    processedAt: Timestamp;
    refundId?: string;
  }>;
  finalAmount: number;
  
  // Stripe integration
  paymentIntentId: string;
  paymentStatus: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  paymentMethod: {
    type: 'card' | 'bank_transfer' | 'credit';
    last4?: string;
    brand?: string;
  };
  
  // Pricing breakdown
  pricing: PricingBreakdown;
  
  // Billing
  invoiceUrl?: string;
  receiptUrl?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Design assignments within campaign
export interface CampaignDesignAssignment {
  designId: string;
  businessTypes: string[];
  leadCount: number;
  status: 'pending' | 'generating' | 'ready' | 'approved' | 'sent';
  
  // Cost allocation
  costPerLead: number;
  totalCost: number;
  
  // Generation details
  generationStatus?: {
    stage: 'queued' | 'generating' | 'complete' | 'failed';
    progress: number;
    error?: string;
    startedAt?: Timestamp;
    completedAt?: Timestamp;
  };
  
  // Final design info
  finalDesignUrl?: string;
  thumbnailUrl?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Campaign workflow states
export type CampaignStatus = 
  | 'draft'           // Initial creation
  | 'brand_selected'  // Brand chosen
  | 'designing'       // AI generating designs
  | 'review'          // User reviewing designs
  | 'payment_pending' // Awaiting payment
  | 'paid'            // Payment completed
  | 'pending_review'  // Internal review required
  | 'approved'        // Ready to send
  | 'scheduled'       // Queued for sending
  | 'printing'        // Being printed
  | 'sent'            // Sent to customers
  | 'delivered'       // Confirmed delivery
  | 'completed'       // Campaign finished
  | 'paused'          // Temporarily stopped
  | 'canceled'        // Canceled by user
  | 'failed';         // System failure

export type CampaignWorkflowStage = 
  | 'setup'      // Brand selection, lead import
  | 'design'     // Design creation/assignment
  | 'review'     // User approval
  | 'payment'    // Checkout process
  | 'approval'   // Internal approval
  | 'production' // Printing and sending
  | 'tracking'   // Post-send monitoring
  | 'complete';  // Finished

// Main V2 Campaign interface
export interface V2Campaign {
  // Identification
  id?: string;
  name?: string; // User-friendly name
  
  // Ownership
  ownerUid: string;
  teamId?: string; // For future team features
  
  // Brand and Design
  brandId?: string;
  designAssignments: CampaignDesignAssignment[];
  
  // User's A/B testing selections (designId -> { openai?: string, ideogram?: string })
  designSelections?: Record<string, { openai?: string; ideogram?: string }>;
  
  // Lead Information
  totalLeadCount: number;
  businessTypes: string[]; // Extracted from leads
  leadChunkCount: number; // How many chunks in leadsChunks subcollection
  
  // Geographic Distribution
  geographicSummary?: {
    states: Array<{ state: string; count: number }>;
    topCities: Array<{ city: string; state: string; count: number }>;
    radius?: number; // If geo-targeted
    center?: { lat: number; lng: number; address: string };
  };
  
  // Workflow State
  status: CampaignStatus;
  workflowStage: CampaignWorkflowStage;
  
  // Progress Tracking
  progress: {
    leadsProcessed: number;
    designsCompleted: number;
    paymentCompleted: boolean;
    approvalReceived: boolean;
    overallPercent: number; // 0-100
  };
  
  // Scheduling
  scheduling?: CampaignScheduling;
  
  // Payment
  payment?: CampaignPayment;
  
  // Quality Control
  qualityChecks?: {
    addressValidation: number; // Percentage of addresses validated
    designQuality: 'excellent' | 'good' | 'needs_work' | 'poor';
    contentReview: 'approved' | 'needs_changes' | 'rejected';
    lastChecked?: Timestamp;
  };
  
  // Analytics and Performance
  analytics?: {
    deliveryRate?: number; // Percentage delivered successfully
    responseRate?: number; // If tracking enabled
    costPerResponse?: number;
    roi?: number;
    conversionTracking?: {
      method: 'qr_code' | 'landing_page' | 'promo_code' | 'phone';
      conversions: number;
      revenue: number;
    };
  };
  
  // Communication Log
  communications?: Array<{
    type: 'email' | 'sms' | 'notification';
    recipient: 'customer' | 'admin' | 'team';
    subject: string;
    status: 'sent' | 'delivered' | 'failed';
    sentAt: Timestamp;
  }>;
  
  // Error Handling
  errors?: Array<{
    type: 'geocoding' | 'payment' | 'design' | 'printing' | 'delivery';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolvedAt?: Timestamp;
    occurredAt: Timestamp;
  }>;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  
  // Source Information
  sourceType: 'v2_build' | 'v1_migration' | 'admin_created' | 'template';
  sourceId?: string; // Original campaign ID if migrated
  
  // Feature Flags
  features?: {
    rushDelivery: boolean;
    trackingEnabled: boolean;
    analyticsEnabled: boolean;
    qualityReview: boolean;
  };
}

// For creating new campaigns
export interface CreateCampaignRequest {
  leads: V2Lead[];
  businessTypes: string[];
  sourceType?: V2Campaign['sourceType'];
  sourceId?: string;
  geographicSummary?: V2Campaign['geographicSummary'];
}

export interface CreateCampaignResponse {
  success: boolean;
  campaignId: string;
  leadCount: number;
  businessTypes: string[];
  estimatedCost: number;
}

// For campaign summary and listing
export interface CampaignSummary {
  id: string;
  name?: string;
  brandName?: string;
  status: CampaignStatus;
  totalLeads: number;
  totalCost: number;
  businessTypes: string[];
  designCount: number;
  progress: number; // 0-100
  createdAt: Timestamp;
  scheduledSendDate?: Timestamp;
  lastActivity: Timestamp;
}

// For campaign dashboard
export interface CampaignDashboardData {
  summary: CampaignSummary;
  recentActivity: Array<{
    type: 'status_change' | 'design_complete' | 'payment' | 'error';
    message: string;
    timestamp: Timestamp;
  }>;
  nextActions: Array<{
    action: 'select_brand' | 'review_designs' | 'complete_payment' | 'approve';
    priority: 'high' | 'medium' | 'low';
    dueDate?: Timestamp;
  }>;
  metrics: {
    avgCostPerLead: number;
    estimatedDelivery?: { start: Timestamp; end: Timestamp };
    qualityScore?: number;
  };
}

// For campaign workflow automation
export interface WorkflowTransition {
  from: CampaignStatus;
  to: CampaignStatus;
  trigger: 'user_action' | 'system_event' | 'admin_override' | 'scheduled';
  conditions?: Array<{
    field: keyof V2Campaign;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'exists';
    value: unknown;
  }>;
  actions?: Array<{
    type: 'send_notification' | 'update_field' | 'create_task' | 'trigger_service';
    config: Record<string, unknown>;
  }>;
}

// For refund and adjustment handling
export interface RefundRequest {
  campaignId: string;
  type: 'full' | 'partial' | 'lead_removal';
  reason: string;
  amount?: number;
  leadIds?: string[]; // If specific leads being removed
  requestedBy: string;
  requestedAt: Timestamp;
  
  approval?: {
    approvedBy: string;
    approvedAt: Timestamp;
    notes?: string;
  };
  
  processing?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    stripeRefundId?: string;
    processedAt?: Timestamp;
    error?: string;
  };
}

// Utility types
export type CampaignFormData = Partial<CreateCampaignRequest>;
export type CampaignUpdateData = Partial<Omit<V2Campaign, 'id' | 'createdAt' | 'ownerUid' | 'version'>>;

// Constants for validation and business rules
export const CAMPAIGN_LIMITS = {
  maxLeadsPerCampaign: 50000,
  maxDesignsPerCampaign: 10,
  maxBusinessTypes: 20,
  minLeadsPerDesign: 1,
  
  // Timing constraints
  minSchedulingAdvance: 2, // business days
  maxSchedulingAdvance: 90, // days
  rushOrderMinAdvance: 24, // hours
  
  // Pricing
  rushOrderSurcharge: 0.25, // 25% additional
  bulkDiscountThreshold: 1000,
  bulkDiscountRate: 0.10 // 10% off
} as const;

export const WORKFLOW_STAGES = [
  { id: 'setup', name: 'Setup', description: 'Brand selection and lead import' },
  { id: 'design', name: 'Design', description: 'Create and assign designs' },
  { id: 'review', name: 'Review', description: 'Approve designs and content' },
  { id: 'payment', name: 'Payment', description: 'Complete checkout' },
  { id: 'approval', name: 'Approval', description: 'Internal quality review' },
  { id: 'production', name: 'Production', description: 'Printing and sending' },
  { id: 'tracking', name: 'Tracking', description: 'Monitor delivery' },
  { id: 'complete', name: 'Complete', description: 'Campaign finished' }
] as const; 