import { Functions, getFunctions, httpsCallable } from 'firebase/functions';
import { ulid } from 'ulid';

// Define types for client-side use
export enum CampaignMode {
  ONE_OFF = "one_off",
  AUTOPILOT = "autopilot"
}

export interface LeadData {
  place_id: string;
  name: string;
  vicinity: string;
  businessType: string;
  [key: string]: unknown;
}

export interface CreateCampaignRequest {
  cid: string;
  mode: CampaignMode;
  allFoundLeadsData: LeadData[];
  selectedPlaceIds: string[];
  strategyId: string | null;
  recurrence?: string;
  nextRunAt?: Date;
  designIdLocked?: string;
}

export interface CreateCampaignResponse {
  success: boolean;
  campaignId: string;
  status?: "already_exists";
}

let functionsInstance: Functions | null = null;

/**
 * Initialize the Firebase Functions instance
 */
const getFunctionsInstance = (): Functions => {
  if (!functionsInstance) {
    functionsInstance = getFunctions();
  }
  return functionsInstance;
};

/**
 * Creates a new campaign with leads
 */
export const createCampaign = async (
  allFoundLeadsData: LeadData[],
  selectedPlaceIds: string[],
  strategyId: string | null,
  mode: CampaignMode = CampaignMode.ONE_OFF
): Promise<CreateCampaignResponse> => {
  try {
    // Generate a unique campaign ID
    const cid = ulid();
    
    // Get the functions instance
    const functions = getFunctionsInstance();
    
    // Create the callable function
    const createCampaignFn = httpsCallable<CreateCampaignRequest, CreateCampaignResponse>(
      functions,
      'createCampaignWithLeads'
    );
    
    // Call the function with the data
    const result = await createCampaignFn({
      cid,
      mode,
      allFoundLeadsData,
      selectedPlaceIds,
      strategyId,
    });
    
    return result.data;
  } catch (error) {
    console.error('Error creating campaign:', error);
    throw error;
  }
};

/**
 * Navigates to the campaign build page
 */
export const navigateToCampaignBuild = (campaignId: string): void => {
  window.location.href = `/build/${campaignId}`;
}; 