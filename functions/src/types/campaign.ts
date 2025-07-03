export enum CampaignMode {
  ONE_OFF = "one_off",
  AUTOPILOT = "autopilot"
}

export enum LeadStatus {
  FOUND = "found", 
  SELECTED = "selected",
  AUTOPILOT_FOUND = "autopilot_found",
  AUTOPILOT_SELECTED = "autopilot_selected",
  REMOVED = "removed"
}

export interface CampaignPrice {
  tierApplied: string | null;
  unitCost: number | null;
  total: number | null;
  currency: string;
}

export interface TypeStats {
  [businessType: string]: {
    found: number;
    selected: number;
    sent: number;
  };
}

export interface Campaign {
  ownerUid: string;
  strategyId: string | null;
  campaignMode: CampaignMode;
  status: "draft" | "approved" | "processing" | "completed" | "error";
  productType: string;
  quantity: number;
  price: CampaignPrice;
  recurrence: string | null;
  nextRunAt: FirebaseFirestore.Timestamp | null;
  designIdLocked: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  teamId: string | null;
  typeStats: TypeStats;
  isAnonymous?: boolean; // Support for anonymous users
  v2Flow?: boolean; // Indicates V2 campaign flow
}

// Updated CampaignLead interface for Cloud Function internal use
export interface CampaignLead {
  status: LeadStatus;
  searchBusinessType: string;
  aiReasoning: string;

  googlePlaceId: string;
  googleBusinessName: string;
  googleFormattedAddress: string;
  googleTypes: string[];
  googlePostalCode?: string;
  googlePhoneNumber?: string;
  googleWebsite?: string;
  googleRating?: number;
  
  createdAt: FirebaseFirestore.Timestamp;
  selectedAt: FirebaseFirestore.Timestamp | null;
  
  [key: string]: any;
}

// Minimal lead data for client-to-CF communication (this will also need updating)
export interface LeadData {
  searchBusinessType: string;
  aiReasoning: string;

  googlePlaceId: string;
  googleBusinessName: string;
  googleFormattedAddress: string;
  googleTypes: string[];
  googlePostalCode?: string;
  googlePhoneNumber?: string;
  googleWebsite?: string;
  googleRating?: number;
  
  place_id?: string;
  name?: string;
  vicinity?: string;
  businessType?: string;

  [key: string]: any;
}

export interface CreateCampaignData {
  cid: string;
  mode: CampaignMode;
  allFoundLeadsData: LeadData[];
  selectedPlaceIds: string[];
  strategyId: string | null;
  recurrence?: string;
  nextRunAt?: FirebaseFirestore.Timestamp;
  designIdLocked?: string;
}

export interface CreateCampaignResponse {
  success: boolean;
  campaignId: string;
  status?: "already_exists";
} 