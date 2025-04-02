import { useState, useEffect } from 'react';
import { Business, MarketingStrategyDocument } from './businessService';
import { Campaign, CampaignLead } from './campaignService';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

/**
 * Network status tracker
 * @returns Whether the browser is currently online
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(
    isBrowser ? navigator.onLine : true
  );

  useEffect(() => {
    if (!isBrowser) return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * Open and get the offline database
 * @returns A promise that resolves to the IDBDatabase
 */
export const openOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isBrowser) {
      reject(new Error('Not in browser environment'));
      return;
    }

    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open('InteractiveMailOfflineDB', 1);

    request.onerror = () => {
      reject(new Error('Failed to open offline database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      
      // Create object stores for our data
      if (!db.objectStoreNames.contains('pendingOperations')) {
        db.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains('businessData')) {
        db.createObjectStore('businessData', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('marketingStrategy')) {
        db.createObjectStore('marketingStrategy', { keyPath: 'id' });
      }
    };
  });
};

// Update the type definition for operation
export interface PendingOperation {
  id?: string; // Changed to string to match Firestore document IDs
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// Store pending operation
export const storePendingOperation = async (operation: {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data: Record<string, unknown>;
}): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('pendingOperations', 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    
    // Add timestamp to track when operation was created
    const operationWithTimestamp = {
      ...operation,
      timestamp: Date.now()
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(operationWithTimestamp);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  } catch (error) {
    console.error('Failed to store pending operation:', error);
    throw error;
  }
};

/**
 * Store business data for offline access
 * @param id The business ID
 * @param data The business data to store
 */
export const storeBusinessData = async (id: string, data: Business): Promise<void> => {
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction('businessData', 'readwrite');
    const store = transaction.objectStore('businessData');
    
    await store.put({
      id,
      data,
      timestamp: new Date().toISOString()
    });
    
    console.log('Stored business data for offline access');
  } catch (error) {
    console.error('Failed to store business data:', error);
  }
};

/**
 * Get business data from offline storage
 * @param id The business ID
 * @returns The business data
 */
export const getBusinessDataOffline = async (id: string): Promise<Business | null> => {
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction('businessData', 'readonly');
    const store = transaction.objectStore('businessData');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data as Business);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get business data from offline storage'));
      };
    });
  } catch (error) {
    console.error('Failed to get business data from offline storage:', error);
    return null;
  }
};

/**
 * Store marketing strategy for offline access
 * @param id The strategy ID
 * @param data The strategy data
 */
export const storeMarketingStrategy = async (id: string, data: MarketingStrategyDocument): Promise<void> => {
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction('marketingStrategy', 'readwrite');
    const store = transaction.objectStore('marketingStrategy');
    
    await store.put({
      id,
      data,
      timestamp: new Date().toISOString()
    });
    
    console.log('Stored marketing strategy for offline access');
  } catch (error) {
    console.error('Failed to store marketing strategy:', error);
  }
};

/**
 * Get marketing strategy from offline storage
 * @param id The strategy ID
 * @returns The strategy data
 */
export const getMarketingStrategyOffline = async (id: string): Promise<MarketingStrategyDocument | null> => {
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction('marketingStrategy', 'readonly');
    const store = transaction.objectStore('marketingStrategy');
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data as MarketingStrategyDocument);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get marketing strategy from offline storage'));
      };
    });
  } catch (error) {
    console.error('Failed to get marketing strategy from offline storage:', error);
    return null;
  }
};

// Sync pending operations with the server
export const syncPendingOperations = async (): Promise<void> => {
  try {
    const pendingOps = await getPendingOperations();
    
    if (pendingOps.length === 0) {
      return;
    }
    
    console.log(`Syncing ${pendingOps.length} pending operations`);
    
    // Process each pending operation in sequence
    for (const operation of pendingOps) {
      try {
        console.log(`Syncing operation: ${operation.type} on ${operation.collection}`);
        
        // Handle the operation based on its type and collection
        if (operation.id) {
          await removePendingOperation(operation.id);
        }
      } catch (error) {
        console.error(`Failed to sync operation:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to sync pending operations:', error);
  }
};

// Non-hook version for initialization
export const setupSyncOnReconnect = (): void => {
  const handleOnline = () => {
    if (typeof window !== 'undefined' && navigator.onLine) {
      syncPendingOperations()
        .then(() => console.log('Successfully synced pending operations'))
        .catch((error) => console.error('Failed to sync pending operations:', error));
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    
    // Initial sync if we're already online
    if (navigator.onLine) {
      handleOnline();
    }
  }
};

// Open a new instance of IndexedDB
export const openDB = async () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open('interactive_mail', 2); // Increment version for schema upgrade

    request.onerror = () => {
      reject('Failed to open database');
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('businesses')) {
        db.createObjectStore('businesses', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('marketingStrategies')) {
        db.createObjectStore('marketingStrategies', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('pendingOperations')) {
        db.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });
      }

      // Add new stores for campaigns and leads
      if (!db.objectStoreNames.contains('campaigns')) {
        db.createObjectStore('campaigns', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('campaignLeads')) {
        db.createObjectStore('campaignLeads', { keyPath: 'id' });
      }
    };
  });
};

// Store campaign in IndexedDB
export const storeCampaign = async (id: string, campaign: Campaign): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('campaigns', 'readwrite');
    const store = transaction.objectStore('campaigns');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(campaign);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  } catch (error) {
    console.error('Failed to store campaign offline:', error);
    throw error;
  }
};

// Get campaign from IndexedDB
export const getCampaignOffline = async (id: string): Promise<Campaign | null> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('campaigns', 'readonly');
    const store = transaction.objectStore('campaigns');
    
    const campaign = await new Promise<Campaign | null>((resolve, reject) => {
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    return campaign;
  } catch (error) {
    console.error('Failed to get campaign offline:', error);
    return null;
  }
};

// Get all campaigns for a business from IndexedDB
export const getBusinessCampaignsOffline = async (businessId: string): Promise<Campaign[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('campaigns', 'readonly');
    const store = transaction.objectStore('campaigns');
    
    const campaigns = await new Promise<Campaign[]>((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const allCampaigns = request.result || [];
        const businessCampaigns = allCampaigns.filter(campaign => campaign.businessId === businessId);
        resolve(businessCampaigns);
      };
      
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    return campaigns;
  } catch (error) {
    console.error('Failed to get business campaigns offline:', error);
    return [];
  }
};

// Store campaign lead in IndexedDB
export const storeCampaignLead = async (id: string, lead: CampaignLead): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('campaignLeads', 'readwrite');
    const store = transaction.objectStore('campaignLeads');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(lead);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  } catch (error) {
    console.error('Failed to store campaign lead offline:', error);
    throw error;
  }
};

// Store multiple campaign leads in IndexedDB (batch operation)
export const storeCampaignLeads = async (leads: Array<CampaignLead & { id: string }>): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('campaignLeads', 'readwrite');
    const store = transaction.objectStore('campaignLeads');
    
    await Promise.all(leads.map(lead => {
      return new Promise<void>((resolve, reject) => {
        const request = store.put(lead);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }));
    
    db.close();
  } catch (error) {
    console.error('Failed to store campaign leads offline:', error);
    throw error;
  }
};

// Get all leads for a campaign from IndexedDB
export const getCampaignLeadsOffline = async (campaignId: string): Promise<CampaignLead[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('campaignLeads', 'readonly');
    const store = transaction.objectStore('campaignLeads');
    
    const leads = await new Promise<CampaignLead[]>((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => {
        const allLeads = request.result || [];
        const campaignLeads = allLeads.filter(lead => lead.campaignId === campaignId);
        resolve(campaignLeads);
      };
      
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    return leads;
  } catch (error) {
    console.error('Failed to get campaign leads offline:', error);
    return [];
  }
};

// Get all pending operations
export const getPendingOperations = async (): Promise<PendingOperation[]> => {
  try {
    const db = await openDB();
    const transaction = db.transaction('pendingOperations', 'readonly');
    const store = transaction.objectStore('pendingOperations');
    
    const operations = await new Promise<PendingOperation[]>((resolve, reject) => {
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    db.close();
    
    // Sort by timestamp
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error('Failed to get pending operations:', error);
    return [];
  }
};

// Remove a pending operation
export const removePendingOperation = async (id: string): Promise<void> => {
  if (!id) return;
  
  try {
    const db = await openDB();
    const transaction = db.transaction('pendingOperations', 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    db.close();
  } catch (error) {
    console.error('Failed to remove pending operation:', error);
  }
}; 