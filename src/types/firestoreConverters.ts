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

// Updated CampaignLeadData interface for client-side Firestore data
export interface CampaignLeadData {
  id: string; // Document ID from Firestore
  status: 'found' | 'selected' | 'autopilot_found' | 'autopilot_selected' | 'removed';
  
  searchBusinessType: string;    // The category that was searched for
  aiReasoning: string;           // AI's reasoning for targeting this searchBusinessType

  googlePlaceId: string;         // Google's unique Place ID
  googleBusinessName: string;    // Business name from Google
  googleFormattedAddress: string; // Full address from Google
  googleTypes: string[];         // Array of types from Google Places API
  googlePostalCode?: string;     // Explicitly stored postal code
  googlePhoneNumber?: string;    // Phone number from Google
  googleWebsite?: string;        // Website from Google
  googleRating?: number;         // Rating from Google
  
  createdAt: Timestamp;          // Firestore Timestamp
  selectedAt: Timestamp | null;  // Firestore Timestamp
  
  [key: string]: unknown;        // Allow for other fields not explicitly defined
}

export const leadConverter: FirestoreDataConverter<CampaignLeadData> = {
  toFirestore(lead: CampaignLeadData): DocumentData {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...data } = lead;
    // Ensure Timestamps are correctly formatted if they were JS Dates client-side before saving
    // For this example, we assume they are already Firestore Timestamps if being written back
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
      searchBusinessType: data.searchBusinessType,
      aiReasoning: data.aiReasoning,
      googlePlaceId: data.googlePlaceId,
      googleBusinessName: data.googleBusinessName,
      googleFormattedAddress: data.googleFormattedAddress,
      googleTypes: data.googleTypes || [], // Default to empty array if undefined
      googlePostalCode: data.googlePostalCode,
      googlePhoneNumber: data.googlePhoneNumber,
      googleWebsite: data.googleWebsite,
      googleRating: data.googleRating,
      createdAt: data.createdAt as Timestamp, // Ensure correct type from Firestore
      selectedAt: data.selectedAt as Timestamp | null, // Ensure correct type
      ...data // Spread other fields that might exist, but known ones take precedence
    } as CampaignLeadData; // Cast to ensure all properties are covered
  }
}; 