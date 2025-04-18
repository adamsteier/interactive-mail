import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';
import { convertSessionToBusiness } from './businessService';
import { getSessionId } from './sessionService';

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
      
      // Convert any anonymous session data to a business for this user
      try {
        const sessionId = getSessionId();
        if (sessionId) {
          const business = await convertSessionToBusiness(user.uid, sessionId);
          
          // Add the business to the user's businesses array
          await updateDoc(userRef, {
            businesses: arrayUnion(business.id)
          });
          
          console.log('Converted anonymous session to business for new user:', business.id);
        }
      } catch (conversionError) {
        // Don't fail the user creation if conversion fails
        console.error('Failed to convert session to business:', conversionError);
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