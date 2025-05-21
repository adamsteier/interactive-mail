import { doc, Timestamp } from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { db } from '@/services/firebase';
import { campaignConverter } from '@/types/firestoreConverters'; // Import the converter

// Re-defining a simplified Campaign type for this hook
// Ideally, this would be imported from a central types file (e.g., src/types/campaign.ts)
// that is compatible with both client and Firebase Function Timestamp types.
export interface CampaignData {
  id: string;
  ownerUid: string;
  strategyId: string | null;
  campaignMode: 'one_off' | 'autopilot';
  status: string;
  productType: string;
  quantity: number;
  price: {
    tierApplied: string | null;
    unitCost: number | null;
    total: number | null;
    currency: string;
  };
  recurrence: string | null;
  nextRunAt: Timestamp | null; // Firestore Timestamp for client
  designIdLocked: string | null;
  createdAt: Timestamp;        // Firestore Timestamp for client
  updatedAt: Timestamp;        // Firestore Timestamp for client
  teamId: string | null;
  typeStats: Record<string, { found: number; selected: number; sent: number }>;
  // Add any other fields from your Campaign document
  [key: string]: unknown; // Allow for other fields not explicitly defined
}

/**
 * Hook to fetch and subscribe to a specific campaign document from Firestore.
 * @param campaignId The ID of the campaign to fetch.
 * @returns An object containing the campaign data, loading state, and error state.
 */
export const useCampaignDoc = (campaignId: string | null | undefined) => {
  // Apply the converter to the document reference
  const campaignRef = campaignId 
    ? doc(db, 'campaigns', campaignId).withConverter(campaignConverter) 
    : null;
  
  // When a converter is used, idField is typically not needed as the converter handles ID mapping.
  const [campaign, loading, error] = useDocumentData<CampaignData>(campaignRef);

  return { campaign, loading, error };
}; 