import { collection, query, orderBy, limit, where, QueryConstraint } from 'firebase/firestore';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { db } from '@/services/firebase';
import { leadConverter, CampaignLeadData } from '@/types/firestoreConverters';

interface UseCampaignLeadsOptions {
  pageSize?: number;
  // Define filter types based on your needs, e.g.:
  status?: CampaignLeadData['status'] | Array<CampaignLeadData['status']>;
  businessType?: string;
  // Add other filter properties as needed
}

/**
 * Hook to fetch and subscribe to leads for a specific campaign, with optional pagination and filtering.
 * @param campaignId The ID of the campaign whose leads to fetch.
 * @param options Optional settings for pagination and filtering.
 * @returns An object containing the leads data, loading state, and error state.
 */
export const useCampaignLeads = (
  campaignId: string | null | undefined,
  options: UseCampaignLeadsOptions = {}
) => {
  const { pageSize = 500, status, businessType } = options; // Default pageSize to 500

  let leadsQuery;
  if (campaignId) {
    const queryConstraints: QueryConstraint[] = [
      orderBy('businessType'), // Default sort, as per your plan
      limit(pageSize)
    ];

    // Add status filter if provided
    if (status) {
      if (Array.isArray(status)) {
        queryConstraints.push(where('status', 'in', status));
      } else {
        queryConstraints.push(where('status', '==', status));
      }
    }

    // Add businessType filter if provided
    if (businessType) {
      queryConstraints.push(where('businessType', '==', businessType));
    }
    
    // Add other filters here based on options

    leadsQuery = query(
      collection(db, 'campaigns', campaignId, 'leads').withConverter(leadConverter),
      ...queryConstraints
    );
  } else {
    leadsQuery = null; // Or a query that returns no results, if preferred
  }
  
  const [leads, loading, error, snapshot] = useCollectionData<CampaignLeadData>(leadsQuery);

  // TODO: Implement pagination using `startAfter(snapshot?.docs[snapshot.docs.length - 1])`
  // when a "Load More" button is clicked or infinite scroll is triggered.

  return { leads, loading, error, snapshot };
}; 