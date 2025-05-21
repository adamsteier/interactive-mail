import { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot, SnapshotOptions, Timestamp } from 'firebase/firestore';
import { CampaignData } from '@/features/campaignBuild/hooks/useCampaignDoc'; // Adjust path as needed

export const campaignConverter: FirestoreDataConverter<CampaignData> = {
  toFirestore(campaign: CampaignData): DocumentData {
    // When writing data, ensure Timestamp fields are handled correctly if they were JS Dates
    // For this example, assuming campaign object is already using Firestore Timestamps
    // Remove 'id' field before writing to Firestore as it's the document ID
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = campaign;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    options?: SnapshotOptions
  ): CampaignData {
    const data = snapshot.data(options);
    // Ensure all fields are correctly typed, especially Timestamps
    return {
      id: snapshot.id,
      ownerUid: data.ownerUid,
      strategyId: data.strategyId,
      campaignMode: data.campaignMode,
      status: data.status,
      productType: data.productType,
      quantity: data.quantity,
      price: data.price,
      recurrence: data.recurrence,
      nextRunAt: data.nextRunAt as Timestamp | null, // Cast if necessary
      designIdLocked: data.designIdLocked,
      createdAt: data.createdAt as Timestamp, // Cast if necessary
      updatedAt: data.updatedAt as Timestamp, // Cast if necessary
      teamId: data.teamId,
      typeStats: data.typeStats,
      // Spread any other unknown fields if your model allows for it
      ...data
    } as CampaignData;
  }
};

// Define CampaignLeadData type for client-side use (similar to functions/src/types/campaign.ts CampaignLead)
export interface CampaignLeadData {
  id: string; // Document ID from Firestore
  status: 'found' | 'selected' | 'autopilot_found' | 'autopilot_selected' | 'removed'; // Add 'removed' for soft delete
  businessType: string;
  createdAt: Timestamp;
  selectedAt: Timestamp | null;
  place_id: string;        // Google Maps place ID
  name: string;
  vicinity: string;        // Address
  phoneNumber?: string;
  website?: string;
  rating?: number;
  // Add any other fields from your Lead document
  [key: string]: unknown; // Allow for other fields not explicitly defined
}

export const leadConverter: FirestoreDataConverter<CampaignLeadData> = {
  toFirestore(lead: CampaignLeadData): DocumentData {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = lead;
    return data;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot<DocumentData>,
    options?: SnapshotOptions
  ): CampaignLeadData {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      status: data.status,
      businessType: data.businessType,
      createdAt: data.createdAt as Timestamp,
      selectedAt: data.selectedAt as Timestamp | null,
      place_id: data.place_id,
      name: data.name,
      vicinity: data.vicinity,
      phoneNumber: data.phoneNumber,
      website: data.website,
      rating: data.rating,
      ...data // Spread other fields that might exist
    } as CampaignLeadData;
  }
}; 