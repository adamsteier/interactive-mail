import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  serverTimestamp,
  doc,
  Timestamp,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { BrandingData } from '@/types/firestoreTypes'; // Import the interface

// --- Service functions for BrandingData (users/{userId}/brandingData) ---

/**
 * Fetches all branding data profiles for a specific user.
 * @param userId - The ID of the user whose branding data to fetch.
 * @returns A promise that resolves to an array of BrandingData objects, including their Firestore IDs.
 */
export const getBrandDataForUser = async (userId: string): Promise<BrandingData[]> => {
  if (!userId) {
    console.error("User ID is required to fetch branding data.");
    return [];
  }
  try {
    const brandsColRef = collection(db, 'users', userId, 'brandingData');
    const q = query(brandsColRef); // Can add ordering later if needed, e.g., orderBy('createdAt')
    const querySnapshot = await getDocs(q);
    
    const brands: BrandingData[] = [];
    querySnapshot.forEach((doc) => {
      brands.push({ id: doc.id, ...doc.data() } as BrandingData);
    });
    console.log(`Fetched ${brands.length} brand profiles for user ${userId}`);
    return brands;
  } catch (error) {
    console.error(`Error fetching branding data for user ${userId}:`, error);
    throw new Error("Failed to fetch branding profiles.");
  }
};

/**
 * Adds a new branding data profile to a user's subcollection.
 * @param userId - The ID of the user.
 * @param brandData - The BrandingData object to add (without id, createdAt, updatedAt).
 * @returns A promise that resolves to the newly created BrandingData object, including its Firestore ID.
 */
export const addBrandData = async (userId: string, brandData: Omit<BrandingData, 'id' | 'createdAt' | 'updatedAt'>): Promise<BrandingData> => {
  if (!userId) {
    throw new Error("User ID is required to add branding data.");
  }
  try {
    const brandsColRef = collection(db, 'users', userId, 'brandingData');
    const timestamp = serverTimestamp() as Timestamp; // Cast for type safety

    const docRef = await addDoc(brandsColRef, {
      ...brandData,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    console.log(`Added new brand profile with ID: ${docRef.id} for user ${userId}`);
    
    // Fetch the newly created document to return it with the ID and timestamps
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Failed to retrieve newly added brand data.");
    }
    
    return { id: newDocSnap.id, ...newDocSnap.data() } as BrandingData;

  } catch (error) {
    console.error(`Error adding branding data for user ${userId}:`, error);
    throw new Error("Failed to save branding profile.");
  }
};

/**
 * Updates an existing branding data profile.
 * @param userId - The ID of the user.
 * @param brandId - The ID of the branding profile document to update.
 * @param updates - An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export const updateBrandData = async (
    userId: string, 
    brandId: string, 
    updates: Partial<Omit<BrandingData, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!userId || !brandId) {
    throw new Error("User ID and Brand ID are required to update branding data.");
  }
  try {
    const brandDocRef = doc(db, 'users', userId, 'brandingData', brandId);
    await setDoc(brandDocRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true }); // Use merge: true to only update specified fields
    console.log(`Updated brand profile ${brandId} for user ${userId}`);
  } catch (error) {
    console.error(`Error updating brand profile ${brandId} for user ${userId}:`, error);
    throw new Error("Failed to update branding profile.");
  }
};

/**
 * Deletes a branding data profile.
 * @param userId - The ID of the user.
 * @param brandId - The ID of the branding profile document to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteBrandData = async (userId: string, brandId: string): Promise<void> => {
  if (!userId || !brandId) {
    throw new Error("User ID and Brand ID are required to delete branding data.");
  }
  try {
    const brandDocRef = doc(db, 'users', userId, 'brandingData', brandId);
    await deleteDoc(brandDocRef);
    console.log(`Deleted brand profile ${brandId} for user ${userId}`);
  } catch (error) {
    console.error(`Error deleting brand profile ${brandId} for user ${userId}:`, error);
    throw new Error("Failed to delete branding profile.");
  }
};

// Potential future function: Get a single brand profile by ID
export const getBrandDataById = async (userId: string, brandId: string): Promise<BrandingData | null> => {
    if (!userId || !brandId) {
        console.error("User ID and Brand ID are required.");
        return null;
    }
    try {
        const brandDocRef = doc(db, 'users', userId, 'brandingData', brandId);
        const docSnap = await getDoc(brandDocRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as BrandingData;
        }
        console.log(`No brand profile found with ID ${brandId} for user ${userId}`);
        return null;
    } catch (error) {
        console.error(`Error fetching brand profile ${brandId}:`, error);
        throw new Error("Failed to fetch branding profile.");
    }
}; 