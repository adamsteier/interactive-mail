import { db } from './firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  getDocs,
  getDoc
} from 'firebase/firestore';
import type { GooglePlace } from '@/types/places';

// Maximum number of operations per batch in Firestore
const MAX_BATCH_SIZE = 500;

/**
 * Saves all search results to Firestore, grouped by business type
 * @param userId The ID of the user
 * @param places Array of all Google Places from search results
 * @returns Promise that resolves when all places are saved
 */
export const saveAllPlaces = async (userId: string, places: GooglePlace[]): Promise<void> => {
  if (!userId || !places || places.length === 0) {
    console.error('Cannot save places: Missing userId or places');
    return;
  }

  try {
    const typeToPlaces = new Map<string, GooglePlace[]>();
    
    // Group places by business type
    places.forEach(place => {
      const type = place.businessType;
      if (!typeToPlaces.has(type)) {
        typeToPlaces.set(type, []);
      }
      typeToPlaces.get(type)?.push(place);
    });
    
    let operationCount = 0;
    let batch = writeBatch(db);
    const batchPromises: Promise<void>[] = [];
    
    // Save each group to Firestore
    typeToPlaces.forEach((placesOfType, type) => {
      placesOfType.forEach(place => {
        const placeDocRef = doc(collection(db, 'users', userId, 'all_places', type, 'places'));
        batch.set(placeDocRef, {
          ...place,
          savedAt: serverTimestamp()
        });
        
        operationCount++;
        
        // If we've reached the batch limit, commit and create a new batch
        if (operationCount >= MAX_BATCH_SIZE) {
          batchPromises.push(batch.commit());
          batch = writeBatch(db);
          operationCount = 0;
        }
      });
    });
    
    // Commit any remaining operations
    if (operationCount > 0) {
      batchPromises.push(batch.commit());
    }
    
    // Wait for all batches to complete
    await Promise.all(batchPromises);
    console.log(`Saved ${places.length} places to all_places collection for user ${userId}`);
  } catch (error) {
    console.error('Error saving all places:', error);
    throw error;
  }
};

/**
 * Saves only selected places to Firestore, grouped by business type
 * @param userId The ID of the user
 * @param selectedPlaces Array of selected Google Places
 * @returns Promise that resolves when all selected places are saved
 */
export const saveSelectedPlaces = async (userId: string, selectedPlaces: GooglePlace[]): Promise<void> => {
  if (!userId || !selectedPlaces || selectedPlaces.length === 0) {
    console.error('Cannot save selected places: Missing userId or places');
    return;
  }

  try {
    const typeToPlaces = new Map<string, GooglePlace[]>();
    
    // Group places by business type
    selectedPlaces.forEach(place => {
      const type = place.businessType;
      if (!typeToPlaces.has(type)) {
        typeToPlaces.set(type, []);
      }
      typeToPlaces.get(type)?.push(place);
    });
    
    let operationCount = 0;
    let batch = writeBatch(db);
    const batchPromises: Promise<void>[] = [];
    
    // First, create/update the businessType documents
    typeToPlaces.forEach((_, type) => {
      const typeDocRef = doc(db, 'users', userId, 'selected_places', type);
      batch.set(typeDocRef, {
        businessType: type,
        associatedCampaignIds: [],
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      operationCount++;
      
      // If we've reached the batch limit, commit and create a new batch
      if (operationCount >= MAX_BATCH_SIZE) {
        batchPromises.push(batch.commit());
        batch = writeBatch(db);
        operationCount = 0;
      }
    });
    
    // Then save each place
    typeToPlaces.forEach((placesOfType, type) => {
      placesOfType.forEach(place => {
        const placeDocRef = doc(collection(db, 'users', userId, 'selected_places', type, 'places'), place.place_id);
        batch.set(placeDocRef, {
          ...place,
          savedAt: serverTimestamp()
        });
        
        operationCount++;
        
        // If we've reached the batch limit, commit and create a new batch
        if (operationCount >= MAX_BATCH_SIZE) {
          batchPromises.push(batch.commit());
          batch = writeBatch(db);
          operationCount = 0;
        }
      });
    });
    
    // Commit any remaining operations
    if (operationCount > 0) {
      batchPromises.push(batch.commit());
    }
    
    // Wait for all batches to complete
    await Promise.all(batchPromises);
    console.log(`Saved ${selectedPlaces.length} selected places for user ${userId}`);
  } catch (error) {
    console.error('Error saving selected places:', error);
    throw error;
  }
};

/**
 * Associates a campaign ID with business types
 * @param userId The ID of the user
 * @param campaignId The ID of the campaign
 * @param businessTypes Array of business types to associate with the campaign
 */
export const associateCampaignWithBusinessTypes = async (
  userId: string, 
  campaignId: string, 
  businessTypes: string[]
): Promise<void> => {
  if (!userId || !campaignId || !businessTypes || businessTypes.length === 0) {
    console.error('Cannot associate campaign: Missing userId, campaignId, or businessTypes');
    return;
  }

  try {
    // For this operation, we're unlikely to exceed batch limits
    // but we'll handle it just in case
    let operationCount = 0;
    let batch = writeBatch(db);
    const batchPromises: Promise<void>[] = [];
    
    // Update each business type document with the campaign ID
    businessTypes.forEach(type => {
      const typeDocRef = doc(db, 'users', userId, 'selected_places', type);
      batch.update(typeDocRef, {
        associatedCampaignIds: arrayUnion(campaignId),
        updatedAt: serverTimestamp()
      });
      
      operationCount++;
      
      if (operationCount >= MAX_BATCH_SIZE) {
        batchPromises.push(batch.commit());
        batch = writeBatch(db);
        operationCount = 0;
      }
    });
    
    // Update the campaign document with the business types
    const campaignDocRef = doc(db, 'users', userId, 'campaigns', campaignId);
    batch.update(campaignDocRef, {
      associatedBusinessTypes: businessTypes,
      updatedAt: serverTimestamp()
    });
    
    operationCount++;
    
    // Commit any remaining operations
    if (operationCount > 0) {
      batchPromises.push(batch.commit());
    }
    
    // Wait for all batches to complete
    await Promise.all(batchPromises);
    console.log(`Associated campaign ${campaignId} with ${businessTypes.length} business types`);
  } catch (error) {
    console.error('Error associating campaign with business types:', error);
    throw error;
  }
};

/**
 * Retrieves selected places for a specific business type
 * @param userId The ID of the user
 * @param businessType The business type to retrieve places for
 * @returns Promise that resolves to an array of GooglePlace objects
 */
export const getSelectedPlacesByType = async (userId: string, businessType: string): Promise<GooglePlace[]> => {
  if (!userId || !businessType) {
    console.error('Cannot get selected places: Missing userId or businessType');
    return [];
  }

  try {
    const placesCollectionRef = collection(db, 'users', userId, 'selected_places', businessType, 'places');
    const querySnapshot = await getDocs(placesCollectionRef);
    
    const places: GooglePlace[] = [];
    querySnapshot.forEach(doc => {
      // Exclude the savedAt field which is not part of the GooglePlace type
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { savedAt, ...placeData } = doc.data();
      places.push(placeData as GooglePlace);
    });
    
    console.log(`Retrieved ${places.length} selected places for business type ${businessType}`);
    return places;
  } catch (error) {
    console.error(`Error getting selected places for business type ${businessType}:`, error);
    throw error;
  }
};

/**
 * Retrieves selected places for a specific campaign
 * @param userId The ID of the user
 * @param campaignId The ID of the campaign
 * @returns Promise that resolves to a Map of business types to arrays of GooglePlace objects
 */
export const getSelectedPlacesByCampaign = async (
  userId: string, 
  campaignId: string
): Promise<Map<string, GooglePlace[]>> => {
  if (!userId || !campaignId) {
    console.error('Cannot get selected places: Missing userId or campaignId');
    return new Map();
  }

  try {
    // First, get the campaign to find associated business types
    const campaignDocRef = doc(db, 'users', userId, 'campaigns', campaignId);
    const campaignDoc = await getDoc(campaignDocRef);
    
    if (!campaignDoc.exists()) {
      console.error(`Campaign ${campaignId} not found`);
      return new Map();
    }
    
    const campaignData = campaignDoc.data();
    const businessTypes = campaignData.associatedBusinessTypes || [];
    
    // Create a map to store places by business type
    const placesByType = new Map<string, GooglePlace[]>();
    
    // Retrieve places for each business type
    const typePromises = businessTypes.map(async (type: string) => {
      const places = await getSelectedPlacesByType(userId, type);
      placesByType.set(type, places);
    });
    
    await Promise.all(typePromises);
    
    console.log(`Retrieved selected places for campaign ${campaignId} across ${businessTypes.length} business types`);
    return placesByType;
  } catch (error) {
    console.error(`Error getting selected places for campaign ${campaignId}:`, error);
    throw error;
  }
}; 