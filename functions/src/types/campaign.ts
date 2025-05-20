export enum CampaignMode {
  ONE_OFF = "one_off",
  AUTOPILOT = "autopilot"
}

export enum LeadStatus {
  FOUND = "found", 
  SELECTED = "selected",
  AUTOPILOT_FOUND = "autopilot_found",
  AUTOPILOT_SELECTED = "autopilot_selected"
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
}

// Minimal lead data for client-to-CF communication
export interface LeadData {
  place_id: string;
  name: string;
  vicinity: string;
  businessType: string;
  [key: string]: any; // Allow for additional fields
}

export interface CampaignLead {
  status: LeadStatus;
  businessType: string;
  createdAt: FirebaseFirestore.Timestamp;
  selectedAt: FirebaseFirestore.Timestamp | null;
  place_id: string;
  name: string;
  vicinity: string;
  [key: string]: any; // Allow for additional trimmed business data fields
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