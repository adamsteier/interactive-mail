import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  FieldValue,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';
import { convertSessionToBusiness } from './businessService';
import { getSessionId, getSession } from './sessionService';

// User data interface
export interface UserData {
  id: string;
  email: string;
  createdAt: Timestamp | FieldValue;
  lastLogin: Timestamp | FieldValue;
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
  photoURL?: string | null;
  businesses: string[];
  activeCampaigns: string[];
}

/**
 * Create or update a user document in Firestore
 * @param user The Firebase auth user object
 * @param firstName Optional first name, usually provided during sign up
 * @param lastName Optional last name, usually provided during sign up
 * @returns The created or updated user data
 */
export const createOrUpdateUser = async (
    user: User, 
    firstName?: string, 
    lastName?: string
): Promise<UserData> => {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // User exists, update last login and potentially profile info
      const updateData: Partial<UserData> & { lastLogin: FieldValue } = {
        lastLogin: serverTimestamp(),
        email: user.email || '',
        displayName: user.displayName || `${firstName || ''} ${lastName || ''}`.trim() || userSnap.data()?.displayName || null,
        photoURL: user.photoURL || userSnap.data()?.photoURL || null,
      };
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      
      await updateDoc(userRef, updateData);
      
      // Transfer anonymous data if logging into existing account
      try {
        const sessionId = getSessionId();
        if (sessionId) {
          const sessionData = await getSession();
          
          // Transfer campaigns and brands if we have an anonymous user ID
          if (sessionData?.anonymousUserId && sessionData.anonymousUserId !== user.uid) {
            console.log('Transferring data from anonymous user to existing account:', sessionData.anonymousUserId);
            await transferAnonymousData(sessionData.anonymousUserId, user.uid);
          }
        }
      } catch (transferError) {
        // Don't fail the login if transfer fails
        console.error('Failed to transfer anonymous data on login:', transferError);
      }
      
      const existingData = userSnap.data() as Partial<UserData>; 
      return {
        id: user.uid,
        ...existingData,
        lastLogin: updateData.lastLogin,
        email: updateData.email ?? existingData.email ?? '',
        displayName: updateData.displayName ?? existingData.displayName ?? null,
        photoURL: updateData.photoURL ?? existingData.photoURL ?? null,
        firstName: updateData.firstName ?? existingData.firstName ?? '',
        lastName: updateData.lastName ?? existingData.lastName ?? '',
        businesses: existingData.businesses || [],
        activeCampaigns: existingData.activeCampaigns || [],
        createdAt: existingData.createdAt || updateData.lastLogin,
      } as UserData;
    } else {
      // New user, create document
      const userData: UserData = {
        id: user.uid,
        email: user.email || '',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        firstName: firstName || '',
        lastName: lastName || '',
        displayName: user.displayName || `${firstName || ''} ${lastName || ''}`.trim() || null,
        photoURL: user.photoURL || null,
        businesses: [],
        activeCampaigns: []
      };
      
      await setDoc(userRef, userData);
      
      // Convert any anonymous session data and transfer campaigns/brands
      try {
        const sessionId = getSessionId();
        if (sessionId) {
          const sessionData = await getSession();
          
          // Transfer campaigns and brands if we have an anonymous user ID
          if (sessionData?.anonymousUserId && sessionData.anonymousUserId !== user.uid) {
            console.log('Transferring data from anonymous user:', sessionData.anonymousUserId);
            await transferAnonymousData(sessionData.anonymousUserId, user.uid);
          }
          
          // Convert session business data (legacy support)
          if (sessionData?.businessData) {
            const business = await convertSessionToBusiness(user.uid, sessionId);
            
            // Add the business to the user's businesses array
            await updateDoc(userRef, {
              businesses: arrayUnion(business.id)
            });
            
            console.log('Converted anonymous session to business for new user:', business.id);
          }
        }
      } catch (conversionError) {
        // Don't fail the user creation if conversion fails
        console.error('Failed to convert session data or transfer anonymous data:', conversionError);
      }
      
      return userData;
    }
  } catch (error) {
    console.error('Error creating or updating user:', error);
    throw error;
  }
};

/**
 * Get a user document by ID
 * @param userId The user ID
 * @returns The user data or null if not found
 */
export const getUserById = async (userId: string): Promise<UserData | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as UserData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

/**
 * Add a business to a user's businesses array
 * @param userId The user ID
 * @param businessId The business ID to add
 */
export const addBusinessToUser = async (userId: string, businessId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      businesses: arrayUnion(businessId),
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding business to user:', error);
    throw error;
  }
};

/**
 * Add a campaign to a user's active campaigns array
 * @param userId The user ID
 * @param campaignId The campaign ID to add
 */
export const addCampaignToUser = async (userId: string, campaignId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      activeCampaigns: arrayUnion(campaignId),
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding campaign to user:', error);
    throw error;
  }
};

/**
 * Set user metadata (display name, photo URL, etc.)
 * @param userId The user ID
 * @param metadata The metadata to update
 */
export const updateUserMetadata = async (
  userId: string,
  metadata: { displayName?: string; photoURL?: string }
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...metadata,
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user metadata:', error);
    throw error;
  }
};

/**
 * Transfer campaigns and brands from anonymous user to authenticated user
 * This handles both sign-up and log-in scenarios
 * @param anonymousUserId The anonymous user ID 
 * @param authenticatedUserId The authenticated user ID
 */
export const transferAnonymousData = async (
  anonymousUserId: string,
  authenticatedUserId: string
): Promise<{ transferredCampaigns: number; transferredBrands: number }> => {
  let transferredCampaigns = 0;
  let transferredBrands = 0;
  
  try {
    console.log(`Starting data transfer from ${anonymousUserId} to ${authenticatedUserId}`);
    
    // Create a batch for atomic operations
    const batch = writeBatch(db);
    
    // 1. Find and transfer campaigns owned by anonymous user
    // Check both V1 (userId) and V2 (ownerUid) campaign structures
    const v1CampaignsQuery = query(
      collection(db, 'campaigns'),
      where('userId', '==', anonymousUserId)
    );
    
    const v2CampaignsQuery = query(
      collection(db, 'campaigns'),
      where('ownerUid', '==', anonymousUserId)
    );
    
    const [v1CampaignSnap, v2CampaignSnap] = await Promise.all([
      getDocs(v1CampaignsQuery),
      getDocs(v2CampaignsQuery)
    ]);
    
    const campaignIds: string[] = [];
    
    // Handle V1 campaigns
    v1CampaignSnap.forEach((campaignDoc) => {
      const campaignId = campaignDoc.id;
      campaignIds.push(campaignId);
      
      // Update campaign ownership (V1 structure)
      const campaignRef = campaignDoc.ref;
      batch.update(campaignRef, {
        userId: authenticatedUserId,
        updatedAt: serverTimestamp(),
        transferredFrom: anonymousUserId,
        transferredAt: serverTimestamp()
      });
      
      transferredCampaigns++;
    });
    
    // Handle V2 campaigns
    v2CampaignSnap.forEach((campaignDoc) => {
      const campaignId = campaignDoc.id;
      campaignIds.push(campaignId);
      
      // Update campaign ownership (V2 structure)
      const campaignRef = campaignDoc.ref;
      batch.update(campaignRef, {
        ownerUid: authenticatedUserId,
        updatedAt: serverTimestamp(),
        transferredFrom: anonymousUserId,
        transferredAt: serverTimestamp()
      });
      
      transferredCampaigns++;
    });
    
    // 2. Find and transfer brands owned by anonymous user
    // Check both V2 brands and old brandingData collections
    const v2BrandsQuery = query(
      collection(db, 'users', anonymousUserId, 'brands')
    );
    
    const oldBrandingQuery = query(
      collection(db, 'users', anonymousUserId, 'brandingData')
    );
    
    const [v2BrandsSnap, oldBrandingSnap] = await Promise.all([
      getDocs(v2BrandsQuery),
      getDocs(oldBrandingQuery)
    ]);
    
    // Transfer V2 brands
    v2BrandsSnap.forEach((brandDoc) => {
      const brandData = brandDoc.data();
      const brandId = brandDoc.id;
      
      // Create brand in authenticated user's collection
      const newBrandRef = doc(db, 'users', authenticatedUserId, 'brands', brandId);
      batch.set(newBrandRef, {
        ...brandData,
        ownerUid: authenticatedUserId,
        updatedAt: serverTimestamp(),
        transferredFrom: anonymousUserId,
        transferredAt: serverTimestamp()
      });
      
      transferredBrands++;
    });
    
    // Transfer old branding data
    oldBrandingSnap.forEach((brandingDoc) => {
      const oldBrandData = brandingDoc.data();
      const brandId = brandingDoc.id;
      
      // Create brand in authenticated user's brandingData collection (keep structure)
      const newBrandingRef = doc(db, 'users', authenticatedUserId, 'brandingData', brandId);
      batch.set(newBrandingRef, {
        ...oldBrandData,
        updatedAt: serverTimestamp(),
        transferredFrom: anonymousUserId,
        transferredAt: serverTimestamp()
      });
      
      transferredBrands++;
    });
    
    // 3. Update authenticated user's activeCampaigns array
    if (campaignIds.length > 0) {
      const userRef = doc(db, 'users', authenticatedUserId);
      batch.update(userRef, {
        activeCampaigns: arrayUnion(...campaignIds),
        lastLogin: serverTimestamp()
      });
    }
    
    // 4. Commit all changes atomically
    await batch.commit();
    
    console.log(`Transfer completed: ${transferredCampaigns} campaigns, ${transferredBrands} brands`);
    
    return { transferredCampaigns, transferredBrands };
    
  } catch (error) {
    console.error('Error transferring anonymous data:', error);
    throw error;
  }
}; 