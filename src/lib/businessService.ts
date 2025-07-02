import {
  doc,
  collection,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  FieldValue,
  arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { cleanupSession } from './sessionService';
import { BusinessAnalysis } from '@/types/businessAnalysis';
import { MarketingStrategy } from '@/types/marketing';

// Business data interfaces
export interface Business {
  id?: string;
  userId: string;
  ownerUid: string; // Required by Firestore rules
  createdAt: Timestamp | FieldValue;
  lastModified: Timestamp | FieldValue;
  targetArea: string;
  businessName: string;
  industry?: string;
  description?: string;
  boundingBox?: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
  businessAnalysis?: BusinessAnalysis;
  marketingStrategies?: string[]; // References to strategy IDs
}

// Define typed structures for strategy analysis
export interface Method1Analysis {
  businessTargets: Array<{
    type: string;
    estimatedReach?: number;
    reasoning?: string;
  }>;
  overallReasoning?: string;
}

export interface Method2Analysis {
  databaseTargets?: Array<{
    name: string;
    type: string;
    reasoning?: string;
    estimatedReach?: number;
  }>;
  overallReasoning?: string;
}

export interface Method3Analysis {
  reasoning?: string;
}

export interface MarketingStrategyDocument {
  id?: string;
  businessId: string;
  createdAt: Timestamp | FieldValue;
  recommendedMethods: string[];
  primaryRecommendation: string;
  totalEstimatedReach: number;
  method1Analysis: Method1Analysis;
  method2Analysis?: Method2Analysis;
  method3Analysis?: Method3Analysis;
  campaigns: string[]; // References to campaign IDs
}

/**
 * Create a new business document
 * @param userId The user ID who owns the business
 * @param businessData The business data
 * @returns The created business with ID
 */
export const createBusiness = async (
  userId: string,
  businessData: Omit<Business, 'id' | 'userId' | 'createdAt' | 'lastModified' | 'marketingStrategies'>
): Promise<Business> => {
  try {
    // Create a new document reference with auto-generated ID
    const businessRef = doc(collection(db, 'businesses'));
    
    const business: Business = {
      id: businessRef.id,
      userId,
      ownerUid: userId, // Add ownerUid for Firestore rules
      createdAt: serverTimestamp(),
      lastModified: serverTimestamp(),
      targetArea: businessData.targetArea,
      businessName: businessData.businessName,
      industry: businessData.industry,
      description: businessData.description,
      boundingBox: businessData.boundingBox,
      businessAnalysis: businessData.businessAnalysis,
      marketingStrategies: []
    };
    
    // Save to Firestore
    await setDoc(businessRef, business);
    console.log('Business created with ID:', businessRef.id);
    
    return business;
  } catch (error) {
    console.error('Error creating business:', error);
    throw error;
  }
};

/**
 * Get a business by ID
 * @param businessId The business ID
 * @returns The business data or null if not found
 */
export const getBusinessById = async (businessId: string): Promise<Business | null> => {
  try {
    const businessRef = doc(db, 'businesses', businessId);
    const businessSnap = await getDoc(businessRef);
    
    if (businessSnap.exists()) {
      return { id: businessSnap.id, ...businessSnap.data() } as Business;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting business:', error);
    throw error;
  }
};

/**
 * Get all businesses for a user
 * @param userId The user ID
 * @returns Array of businesses owned by the user
 */
export const getUserBusinesses = async (userId: string): Promise<Business[]> => {
  try {
    const businessesQuery = query(
      collection(db, 'businesses'),
      where('ownerUid', '==', userId)
    );
    
    const querySnapshot = await getDocs(businessesQuery);
    const businesses: Business[] = [];
    
    querySnapshot.forEach((doc) => {
      businesses.push({ id: doc.id, ...doc.data() } as Business);
    });
    
    return businesses;
  } catch (error) {
    console.error('Error getting user businesses:', error);
    return [];
  }
};

/**
 * Update a business document
 * @param businessId The business ID
 * @param updates The updates to apply
 */
export const updateBusiness = async (
  businessId: string,
  updates: Partial<Omit<Business, 'id' | 'userId' | 'createdAt' | 'lastModified'>>
): Promise<void> => {
  try {
    const businessRef = doc(db, 'businesses', businessId);
    await updateDoc(businessRef, {
      ...updates,
      lastModified: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating business:', error);
    throw error;
  }
};

/**
 * Create a marketing strategy for a business
 * @param businessId The business ID
 * @param strategyData The marketing strategy data
 * @returns The created strategy with ID
 */
export const createMarketingStrategy = async (
  businessId: string,
  strategyData: MarketingStrategy
): Promise<MarketingStrategyDocument> => {
  try {
    // Create a new document reference with auto-generated ID
    const strategyRef = doc(collection(db, 'marketingStrategies'));
    
    const strategy: MarketingStrategyDocument = {
      id: strategyRef.id,
      businessId,
      createdAt: serverTimestamp(),
      recommendedMethods: strategyData.recommendedMethods,
      primaryRecommendation: strategyData.primaryRecommendation,
      totalEstimatedReach: strategyData.totalEstimatedReach,
      method1Analysis: strategyData.method1Analysis as Method1Analysis,
      method2Analysis: strategyData.method2Analysis as Method2Analysis,
      method3Analysis: strategyData.method3Analysis as Method3Analysis,
      campaigns: []
    };
    
    // Save to Firestore
    await setDoc(strategyRef, strategy);
    
    // Update business to reference this strategy
    const businessRef = doc(db, 'businesses', businessId);
    await updateDoc(businessRef, {
      marketingStrategies: arrayUnion(strategyRef.id),
      lastModified: serverTimestamp()
    });
    
    return strategy;
  } catch (error) {
    console.error('Error creating marketing strategy:', error);
    throw error;
  }
};

/**
 * Get a marketing strategy by ID
 * @param strategyId The strategy ID
 * @returns The strategy data or null if not found
 */
export const getMarketingStrategyById = async (strategyId: string): Promise<MarketingStrategyDocument | null> => {
  try {
    const strategyRef = doc(db, 'marketingStrategies', strategyId);
    const strategySnap = await getDoc(strategyRef);
    
    if (strategySnap.exists()) {
      return { id: strategySnap.id, ...strategySnap.data() } as MarketingStrategyDocument;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting marketing strategy:', error);
    throw error;
  }
};

/**
 * Convert session data to a business document
 * @param userId The user ID who owns the business
 * @param sessionId The session ID to convert
 * @returns The created business
 */
export const convertSessionToBusiness = async (
  userId: string,
  sessionId: string
): Promise<Business> => {
  try {
    // First, get the session document
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }
    
    const sessionData = sessionSnap.data();
    
    if (!sessionData.businessData) {
      throw new Error('Session has no business data');
    }
    
    // Create a new business document from session data
    const business = await createBusiness(userId, {
      ownerUid: userId,
      targetArea: sessionData.businessData.targetArea || '',
      businessName: sessionData.businessData.businessName || '',
      industry: sessionData.businessData.industry,
      description: sessionData.businessData.description,
      boundingBox: sessionData.businessData.boundingBox,
      businessAnalysis: sessionData.businessData.businessAnalysis as unknown as BusinessAnalysis
    });
    
    // If there's a marketing strategy, create it as well
    if (sessionData.marketingStrategy) {
      await createMarketingStrategy(
        business.id!,
        sessionData.marketingStrategy as unknown as MarketingStrategy
      );
    }
    
    // Clean up the session by marking it as converted
    await cleanupSession(sessionId, 'convert', userId);
    
    return business;
  } catch (error) {
    console.error('Error converting session to business:', error);
    throw error;
  }
};

/**
 * Get all marketing strategies for a business
 * @param businessId The business ID
 * @returns Array of marketing strategies for the business
 */
export const getBusinessStrategies = async (businessId: string): Promise<MarketingStrategyDocument[]> => {
  try {
    const strategiesQuery = query(
      collection(db, 'marketingStrategies'),
      where('businessId', '==', businessId)
    );
    
    const querySnapshot = await getDocs(strategiesQuery);
    const strategies: MarketingStrategyDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      strategies.push({ id: doc.id, ...doc.data() } as MarketingStrategyDocument);
    });
    
    return strategies;
  } catch (error) {
    console.error('Error getting business strategies:', error);
    return [];
  }
};

/**
 * Sync offline changes when the app comes back online
 * Uses IndexedDB as a local cache
 */
export const syncOfflineChanges = async (): Promise<void> => {
  // This would be a more complex implementation that uses indexedDB
  // to store data offline and then sync it when online again
  // For now, we'll just log a placeholder message
  console.log('Syncing offline changes (placeholder for full implementation)');
}; 