import { httpsCallable } from 'firebase/functions';
import { ulid } from 'ulid';
import { doc, setDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { functions } from '@/services/firebase';

// Define types for client-side use
export enum CampaignMode {
  ONE_OFF = "one_off",
  AUTOPILOT = "autopilot"
}

export enum CampaignStatus {
  DRAFT = "draft",
  APPROVED = "approved",
  SCHEDULED = "scheduled",
  SENT = "sent",
  CANCELLED = "cancelled"
}

// Updated LeadData for client-to-CF communication
export interface LeadData {
  searchBusinessType: string;
  aiReasoning: string;

  googlePlaceId: string;
  googleBusinessName: string;
  googleFormattedAddress: string;
  googleTypes: string[];         // Array of types from Google Places API
  googlePostalCode?: string;     // Explicitly stored postal code
  googlePhoneNumber?: string;    // Phone number from Google
  googleWebsite?: string;        // Website from Google
  googleRating?: number;         // Rating from Google

  // Any other fields that might be directly passed through from Google or client-side processing
  [key: string]: unknown; 
}

export interface CreateCampaignRequest {
  cid: string;
  mode: CampaignMode;
  allFoundLeadsData: LeadData[]; // This now expects the new LeadData structure
  selectedPlaceIds: string[];    // Array of googlePlaceId
  strategyId: string | null;
  recurrence?: string;
  nextRunAt?: Date; // JS Date for client-side, CF handles Timestamp conversion for Firestore if needed for campaign doc
  designIdLocked?: string;
}

export interface CreateCampaignResponse {
  success: boolean;
  campaignId: string;
  status?: "already_exists";
}

export interface DraftCampaign {
  id: string;
  ownerUid: string;
  status: CampaignStatus;
  mode: CampaignMode;
  createdAt: FieldValue;
  updatedAt: FieldValue;
  isAnonymous?: boolean;
  businessData?: {
    targetArea?: string;
    businessName?: string;
    industry?: string;
    description?: string;
  };
}

/**
 * Creates a draft campaign for collecting leads
 * Works for both anonymous and authenticated users
 */
export const createDraftCampaign = async (
  userId: string,
  businessData?: {
    targetArea?: string;
    businessName?: string;
    industry?: string;
    description?: string;
  },
  isAnonymous: boolean = false
): Promise<DraftCampaign> => {
  try {
    const campaignId = ulid();
    const draftCampaign: DraftCampaign = {
      id: campaignId,
      ownerUid: userId,
      status: CampaignStatus.DRAFT,
      mode: CampaignMode.ONE_OFF,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isAnonymous,
      ...(businessData && { businessData })
    };

    // Create the campaign document in Firestore
    const campaignRef = doc(db, 'campaigns', campaignId);
    await setDoc(campaignRef, draftCampaign);

    console.log('Draft campaign created:', campaignId);
    return { ...draftCampaign, id: campaignId };
  } catch (error) {
    console.error('Error creating draft campaign:', error);
    throw error;
  }
};

/**
 * Creates a new campaign with leads
 */
export const createCampaign = async (
  allFoundLeadsData: LeadData[], // This function signature now expects the new LeadData
  selectedPlaceIds: string[],
  strategyId: string | null,
  mode: CampaignMode = CampaignMode.ONE_OFF,
  // Add autopilot specific fields if creating autopilot campaign directly here
  recurrence?: string,
  nextRunAt?: Date, 
  designIdLocked?: string 
): Promise<CreateCampaignResponse> => {
  try {
    const cid = ulid();
    
    // Debug: Check current auth state
    const { auth } = await import('@/lib/firebase');
    const currentUser = auth.currentUser;
    console.log('Creating campaign with auth state:', {
      hasUser: !!currentUser,
      isAnonymous: currentUser?.isAnonymous,
      uid: currentUser?.uid,
      providerId: currentUser?.providerId
    });
    
    // Ensure user is authenticated before making the function call
    if (!currentUser) {
      throw new Error('Authentication required. Please ensure you are signed in before creating a campaign.');
    }
    
    const createCampaignFn = httpsCallable<CreateCampaignRequest, CreateCampaignResponse>(
      functions,
      'createCampaignWithLeads'
    );
    
    const requestData: CreateCampaignRequest = {
      cid,
      mode,
      allFoundLeadsData,
      selectedPlaceIds,
      strategyId,
    };

    if (mode === CampaignMode.AUTOPILOT) {
      requestData.recurrence = recurrence;
      requestData.nextRunAt = nextRunAt; // JS Date is fine for CF payload if CF converts to Timestamp for Campaign doc
      requestData.designIdLocked = designIdLocked;
    }

    const result = await createCampaignFn(requestData);
    return result.data;
  } catch (error: any) {
    console.error('Error creating campaign:', error);
    
    // Provide more detailed error messages based on error type
    if (error?.code === 'functions/unauthenticated') {
      throw new Error('Authentication required. Please wait for authentication to complete and try again.');
    } else if (error?.code === 'functions/permission-denied') {
      throw new Error('Permission denied. Please ensure you are properly authenticated.');
    } else if (error?.code === 'functions/unavailable') {
      throw new Error('Service temporarily unavailable. Please try again in a moment.');
    } else if (error?.code === 'functions/internal') {
      console.error('Internal error details:', error.details || error.message);
      throw new Error('Server error occurred. Please try again in a moment.');
    }
    
    // For other errors, throw the original error with more context
    throw new Error(error?.message || 'Failed to create campaign. Please try again.');
  }
};

/**
 * Navigates to the V2 campaign build page
 * 🚨 V2 SYSTEM IS NOW LIVE - All new campaigns use the enhanced V2 flow
 */
export const navigateToCampaignBuild = (campaignId: string): void => {
  window.location.href = `/v2/build/${campaignId}/brand`;
}; 