import { useState, useEffect } from 'react';
import { Business, MarketingStrategyDocument } from './businessService';

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

// Define types for operations
interface PendingOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data: unknown;
  timestamp?: string;
  synced?: boolean;
}

/**
 * Store a pending operation for later sync
 * @param operation The operation to store
 */
export const storePendingOperation = async (operation: PendingOperation): Promise<void> => {
  try {
    const db = await openOfflineDB();
    const transaction = db.transaction('pendingOperations', 'readwrite');
    const store = transaction.objectStore('pendingOperations');
    
    // Add a timestamp to the operation
    const timestamp = new Date().toISOString();
    await store.add({
      ...operation,
      timestamp,
      synced: false
    });
    
    console.log('Stored pending operation:', operation.type, operation.collection);
  } catch (error) {
    console.error('Failed to store pending operation:', error);
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

/**
 * Synchronize all pending operations with the server
 * @returns A promise that resolves when sync is complete
 */
export const syncPendingOperations = async (): Promise<void> => {
  // This would interact with the Firebase services to sync data
  // It's a placeholder for now, as the actual implementation would
  // require more complexity and interaction with Firebase
  console.log('Synchronizing pending operations (placeholder)');

  // In a real implementation, this would:
  // 1. Get all pending operations from IndexedDB
  // 2. Sort them by timestamp
  // 3. Apply them to Firebase in order
  // 4. Mark them as synced if successful
};

/**
 * Hook to auto-sync when online status changes
 */
export const useSyncOnReconnect = (): void => {
  const isOnline = useOnlineStatus();
  
  useEffect(() => {
    if (isOnline) {
      syncPendingOperations()
        .then(() => console.log('Successfully synced pending operations'))
        .catch((error) => console.error('Failed to sync pending operations:', error));
    }
  }, [isOnline]);
}; 