import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';

// Types
export interface LeadData {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  businessName?: string;
  businessType?: string;
  address?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city: string;
  postalCode?: string;
  postcode?: string;
  country?: string;
}

export interface StannpRecipient {
  firstname: string;
  lastname: string;
  company?: string;
  address1: string;
  address2?: string;
  address3?: string;
  city: string;
  postcode: string;
  country: string; // ISO 3166-1 alpha-2 format (e.g., 'CA' for Canada)
}

export interface StannpPostcardRequest {
  test?: boolean;
  size: 'A6' | 'A5'; // A6 = 6x4 inches
  front: string; // URL to front image
  back?: string; // URL to back image (optional, can use template)
  message?: string; // Back message if not using image
  recipient: StannpRecipient;
  tags?: string; // For filtering/tracking
  addons?: string; // Comma-separated addon codes
}

export interface StannpPostcardResponse {
  success: boolean;
  data: {
    id: string;
    created: string;
    format: string;
    cost: string;
    status: string;
    pdf?: string;
  };
}

export interface MailpieceTracking {
  id?: string;
  campaignId: string;
  leadId: string;
  designId: string;
  stannpMailpieceId: string;
  status: 'submitted' | 'pending' | 'printed' | 'dispatched' | 'delivered' | 'returned' | 'failed';
  statusHistory: Array<{
    status: string;
    timestamp: Timestamp;
    details?: string;
  }>;
  cost: number;
  submittedAt: Timestamp;
  printedAt?: Timestamp;
  dispatchedAt?: Timestamp;
  deliveredAt?: Timestamp;
  returnedAt?: Timestamp;
  trackingUrl?: string;
  error?: string;
}

// Constants
const STANNP_API_BASE = process.env.NEXT_PUBLIC_STANNP_REGION === 'EU' 
  ? 'https://api-eu1.stannp.com/v1'
  : 'https://api-us1.stannp.com/v1'; // Default to US

const BATCH_SIZE = 50; // Process 50 postcards at a time
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // Start with 1 second

/**
 * Get Stannp API headers
 */
function getStannpHeaders(): HeadersInit {
  const apiKey = process.env.STANNP_API_KEY;
  if (!apiKey) {
    throw new Error('STANNP_API_KEY not configured');
  }
  
  // Stannp uses Basic Auth with API key as username, empty password
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  };
}

/**
 * Format lead data for Stannp recipient
 */
export function formatRecipient(lead: LeadData): StannpRecipient {
  return {
    firstname: lead.firstName || lead.name?.split(' ')[0] || 'Valued',
    lastname: lead.lastName || lead.name?.split(' ').slice(1).join(' ') || 'Customer',
    company: lead.businessName,
    address1: lead.address1 || lead.address || '',
    address2: lead.address2,
    address3: lead.address3,
    city: lead.city,
    postcode: lead.postalCode || lead.postcode || '',
    country: lead.country || 'CA' // Default to Canada
  };
}

/**
 * Send a single postcard via Stannp API
 */
export interface StannpApiResponse {
  id: string;
  created: string;
  format: string;
  cost: string;
  status: string;
  pdf?: string;
  tracking_url?: string;
  [key: string]: unknown;
}

export async function createPostcard(
  request: StannpPostcardRequest
): Promise<{ success: boolean; data?: StannpApiResponse; error?: string }> {
  try {
    // Build form data
    const formData = new URLSearchParams();
    formData.append('test', request.test ? '1' : '0');
    formData.append('size', request.size);
    formData.append('front', request.front);
    
    if (request.back) {
      formData.append('back', request.back);
    } else if (request.message) {
      formData.append('message', request.message);
    }
    
    // Add recipient data
    Object.entries(request.recipient).forEach(([key, value]) => {
      if (value) {
        formData.append(`recipient[${key}]`, value);
      }
    });
    
    if (request.tags) {
      formData.append('tags', request.tags);
    }
    
    if (request.addons) {
      formData.append('addons', request.addons);
    }
    
    // Make API request
    const response = await fetch(`${STANNP_API_BASE}/postcards/create`, {
      method: 'POST',
      headers: getStannpHeaders(),
      body: formData.toString()
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Stannp API error: ${response.status}`);
    }
    
    return { success: true, data: result.data };
    
  } catch (error) {
    console.error('Stannp createPostcard error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get postcard status from Stannp
 */
export async function getPostcardStatus(
  mailpieceId: string
): Promise<{ success: boolean; data?: StannpApiResponse; error?: string }> {
  try {
    const response = await fetch(`${STANNP_API_BASE}/postcards/get/${mailpieceId}`, {
      method: 'GET',
      headers: getStannpHeaders()
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Stannp API error: ${response.status}`);
    }
    
    return { success: true, data: result.data };
    
  } catch (error) {
    console.error('Stannp getPostcardStatus error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export interface StannpListResponse {
  data: StannpApiResponse[];
  total: number;
  page: number;
  per_page: number;
  [key: string]: unknown;
}

/**
 * Get postcards by campaign tag
 */
export async function getPostcardsByCampaign(
  campaignId: string,
  page: number = 1
): Promise<{ success: boolean; data?: StannpListResponse; error?: string }> {
  try {
    const params = new URLSearchParams({
      tags: campaignId,
      page: page.toString(),
      per_page: '100'
    });
    
    const response = await fetch(`${STANNP_API_BASE}/postcards/list?${params}`, {
      method: 'GET',
      headers: getStannpHeaders()
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Stannp API error: ${response.status}`);
    }
    
    return { success: true, data: result };
    
  } catch (error) {
    console.error('Stannp getPostcardsByCampaign error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Cancel a postcard if not yet processed
 */
export async function cancelPostcard(
  mailpieceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new URLSearchParams();
    formData.append('id', mailpieceId);
    
    const response = await fetch(`${STANNP_API_BASE}/postcards/cancel`, {
      method: 'POST',
      headers: getStannpHeaders(),
      body: formData.toString()
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Stannp API error: ${response.status}`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Stannp cancelPostcard error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Process a batch of postcards for a campaign
 */
export async function batchCreatePostcards(
  campaignId: string,
  postcards: Array<{
    lead: LeadData;
    frontUrl: string;
    backUrl?: string;
    designId: string;
  }>,
  test: boolean = false
): Promise<{
  successful: MailpieceTracking[];
  failed: Array<{ lead: LeadData; error: string }>;
}> {
  const successful: MailpieceTracking[] = [];
  const failed: Array<{ lead: LeadData; error: string }> = [];
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < postcards.length; i += BATCH_SIZE) {
    const batch = postcards.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const promises = batch.map(async ({ lead, frontUrl, backUrl, designId }) => {
      let attempts = 0;
      let lastError: string | null = null;
      
      // Retry logic
      while (attempts < RETRY_ATTEMPTS) {
        attempts++;
        
        try {
          const result = await createPostcard({
            test,
            size: 'A6', // 6x4 inches
            front: frontUrl,
            back: backUrl,
            recipient: formatRecipient(lead),
            tags: campaignId
          });
          
          if (result.success && result.data) {
            // Create tracking record
            const tracking: MailpieceTracking = {
              campaignId,
              leadId: lead.id,
              designId,
              stannpMailpieceId: result.data.id,
              status: 'submitted',
              statusHistory: [{
                status: 'submitted',
                timestamp: Timestamp.now(),
                details: `Created with Stannp ID: ${result.data.id}`
              }],
              cost: parseFloat(result.data.cost || '0'),
              submittedAt: Timestamp.now()
            };
            
            // Save to Firestore
            await saveMailpieceTracking(tracking);
            successful.push(tracking);
            break; // Success, exit retry loop
          } else {
            lastError = result.error || 'Unknown error';
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error';
        }
        
        // Wait before retry (exponential backoff)
        if (attempts < RETRY_ATTEMPTS) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempts - 1)));
        }
      }
      
      // If all attempts failed
      if (lastError) {
        failed.push({ lead, error: lastError });
      }
    });
    
    await Promise.all(promises);
    
    // Rate limiting between batches
    if (i + BATCH_SIZE < postcards.length) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
    }
  }
  
  return { successful, failed };
}

/**
 * Save mailpiece tracking to Firestore
 */
async function saveMailpieceTracking(tracking: MailpieceTracking): Promise<void> {
  const docRef = doc(
    collection(db, 'campaigns', tracking.campaignId, 'mailpieces'),
    tracking.leadId
  );
  
  await setDoc(docRef, tracking);
}

/**
 * Update mailpiece status from webhook
 */
export interface WebhookDetails {
  tracking_url?: string;
  [key: string]: unknown;
}

export async function updateMailpieceStatus(
  stannpMailpieceId: string,
  newStatus: string,
  details?: WebhookDetails
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the mailpiece by Stannp ID
    const campaigns = await getDocs(collection(db, 'campaigns'));
    let found = false;
    
    for (const campaignDoc of campaigns.docs) {
      const mailpiecesQuery = query(
        collection(db, 'campaigns', campaignDoc.id, 'mailpieces'),
        where('stannpMailpieceId', '==', stannpMailpieceId)
      );
      
      const mailpieces = await getDocs(mailpiecesQuery);
      
      if (!mailpieces.empty) {
        const mailpieceDoc = mailpieces.docs[0];
        const tracking = mailpieceDoc.data() as MailpieceTracking;
        
        // Update status
        const updates: Partial<MailpieceTracking> = {
          status: newStatus as MailpieceTracking['status'],
          statusHistory: [...tracking.statusHistory, {
            status: newStatus,
            timestamp: Timestamp.now(),
            details: JSON.stringify(details)
          }]
        };
        
        // Update specific timestamp fields
        switch (newStatus) {
          case 'printed':
            updates.printedAt = Timestamp.now();
            break;
          case 'dispatched':
            updates.dispatchedAt = Timestamp.now();
            if (details?.tracking_url) {
              updates.trackingUrl = details.tracking_url;
            }
            break;
          case 'delivered':
            updates.deliveredAt = Timestamp.now();
            break;
          case 'returned':
            updates.returnedAt = Timestamp.now();
            break;
        }
        
        await updateDoc(mailpieceDoc.ref, updates);
        found = true;
        break;
      }
    }
    
    if (!found) {
      throw new Error(`Mailpiece ${stannpMailpieceId} not found in database`);
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('updateMailpieceStatus error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get campaign mailpiece statistics
 */
export async function getCampaignMailpieceStats(
  campaignId: string
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalCost: number;
  avgDeliveryTime?: number;
}> {
  const mailpieces = await getDocs(
    collection(db, 'campaigns', campaignId, 'mailpieces')
  );
  
  const stats = {
    total: 0,
    byStatus: {} as Record<string, number>,
    totalCost: 0,
    deliveryTimes: [] as number[]
  };
  
  mailpieces.forEach(doc => {
    const tracking = doc.data() as MailpieceTracking;
    stats.total++;
    stats.totalCost += tracking.cost || 0;
    
    // Count by status
    stats.byStatus[tracking.status] = (stats.byStatus[tracking.status] || 0) + 1;
    
    // Calculate delivery time if delivered
    if (tracking.deliveredAt && tracking.dispatchedAt) {
      const deliveryTime = tracking.deliveredAt.toMillis() - tracking.dispatchedAt.toMillis();
      stats.deliveryTimes.push(deliveryTime / (1000 * 60 * 60 * 24)); // Convert to days
    }
  });
  
  // Calculate average delivery time
  const avgDeliveryTime = stats.deliveryTimes.length > 0
    ? stats.deliveryTimes.reduce((a, b) => a + b, 0) / stats.deliveryTimes.length
    : undefined;
  
  return {
    total: stats.total,
    byStatus: stats.byStatus,
    totalCost: stats.totalCost,
    avgDeliveryTime
  };
}

/**
 * Retry failed postcards
 */
export async function retryFailedPostcards(
  campaignId: string
): Promise<{ retried: number; stillFailed: number }> {
  const failedQuery = query(
    collection(db, 'campaigns', campaignId, 'mailpieces'),
    where('status', '==', 'failed')
  );
  
  const failedDocs = await getDocs(failedQuery);
  const retried = 0;
  const stillFailed = failedDocs.size; // Use the actual count of failed docs
  
  // TODO: Process failed postcards
  // Implementation depends on storing original request data
  
  return { retried, stillFailed };
} 