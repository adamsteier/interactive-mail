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
  where // Import where for potential future filtering
} from 'firebase/firestore';
import { CampaignDesignData } from '@/types/firestoreTypes'; // Import the interface

// --- Service functions for CampaignDesignData (users/{userId}/campaignDesignData) ---

/**
 * Fetches all campaign designs for a specific user.
 * Optionally filters by associatedBrandId.
 * @param userId - The ID of the user whose campaign designs to fetch.
 * @param brandIdFilter - (Optional) Filter designs associated with a specific brand ID.
 * @returns A promise that resolves to an array of CampaignDesignData objects, including their Firestore IDs.
 */
export const getCampaignDesignsForUser = async (userId: string, brandIdFilter?: string): Promise<CampaignDesignData[]> => {
  if (!userId) {
    console.error("User ID is required to fetch campaign designs.");
    return [];
  }
  try {
    const designsColRef = collection(db, 'users', userId, 'campaignDesignData');
    let q = query(designsColRef); // Base query

    // Apply filter if provided
    if (brandIdFilter) {
        q = query(designsColRef, where("associatedBrandId", "==", brandIdFilter));
    }
    // Can add ordering later, e.g., orderBy('createdAt')
    
    const querySnapshot = await getDocs(q);
    
    const designs: CampaignDesignData[] = [];
    querySnapshot.forEach((doc) => {
      designs.push({ id: doc.id, ...doc.data() } as CampaignDesignData);
    });
    console.log(`Fetched ${designs.length} campaign designs for user ${userId}${brandIdFilter ? ` (filtered by brand ${brandIdFilter})` : ''}`);
    return designs;
  } catch (error) {
    console.error(`Error fetching campaign designs for user ${userId}:`, error);
    throw new Error("Failed to fetch campaign designs.");
  }
};

/**
 * Adds a new campaign design to a user's subcollection.
 * @param userId - The ID of the user.
 * @param designData - The CampaignDesignData object to add (without id, createdAt, updatedAt).
 * @returns A promise that resolves to the newly created CampaignDesignData object, including its Firestore ID.
 */
export const addCampaignDesign = async (userId: string, designData: Omit<CampaignDesignData, 'id' | 'createdAt' | 'updatedAt'>): Promise<CampaignDesignData> => {
  if (!userId) {
    throw new Error("User ID is required to add a campaign design.");
  }
  if (!designData.associatedBrandId) {
      throw new Error("associatedBrandId is required when adding a campaign design.");
  }
  try {
    const designsColRef = collection(db, 'users', userId, 'campaignDesignData');
    const timestamp = serverTimestamp() as Timestamp; // Cast for type safety

    const docRef = await addDoc(designsColRef, {
      ...designData,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    console.log(`Added new campaign design with ID: ${docRef.id} for user ${userId}`);
    
    // Fetch the newly created document to return it with the ID and timestamps
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
        throw new Error("Failed to retrieve newly added campaign design.");
    }
    
    return { id: newDocSnap.id, ...newDocSnap.data() } as CampaignDesignData;

  } catch (error) {
    console.error(`Error adding campaign design for user ${userId}:`, error);
    throw new Error("Failed to save campaign design.");
  }
};

/**
 * Updates an existing campaign design.
 * @param userId - The ID of the user.
 * @param designId - The ID of the campaign design document to update.
 * @param updates - An object containing the fields to update.
 * @returns A promise that resolves when the update is complete.
 */
export const updateCampaignDesign = async (
    userId: string, 
    designId: string, 
    updates: Partial<Omit<CampaignDesignData, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!userId || !designId) {
    throw new Error("User ID and Design ID are required to update a campaign design.");
  }
  try {
    const designDocRef = doc(db, 'users', userId, 'campaignDesignData', designId);
    await setDoc(designDocRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true }); // Use merge: true to only update specified fields
    console.log(`Updated campaign design ${designId} for user ${userId}`);
  } catch (error) {
    console.error(`Error updating campaign design ${designId} for user ${userId}:`, error);
    throw new Error("Failed to update campaign design.");
  }
};

/**
 * Deletes a campaign design.
 * @param userId - The ID of the user.
 * @param designId - The ID of the campaign design document to delete.
 * @returns A promise that resolves when the deletion is complete.
 */
export const deleteCampaignDesign = async (userId: string, designId: string): Promise<void> => {
  if (!userId || !designId) {
    throw new Error("User ID and Design ID are required to delete a campaign design.");
  }
  try {
    const designDocRef = doc(db, 'users', userId, 'campaignDesignData', designId);
    await deleteDoc(designDocRef);
    console.log(`Deleted campaign design ${designId} for user ${userId}`);
  } catch (error) {
    console.error(`Error deleting campaign design ${designId} for user ${userId}:`, error);
    throw new Error("Failed to delete campaign design.");
  }
};

// Potential future function: Get a single campaign design by ID
export const getCampaignDesignById = async (userId: string, designId: string): Promise<CampaignDesignData | null> => {
    if (!userId || !designId) {
        console.error("User ID and Design ID are required.");
        return null;
    }
    try {
        const designDocRef = doc(db, 'users', userId, 'campaignDesignData', designId);
        const docSnap = await getDoc(designDocRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as CampaignDesignData;
        }
        console.log(`No campaign design found with ID ${designId} for user ${userId}`);
        return null;
    } catch (error) {
        console.error(`Error fetching campaign design ${designId}:`, error);
        throw new Error("Failed to fetch campaign design.");
    }
}; 