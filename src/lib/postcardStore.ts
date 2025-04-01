import db from './db';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  Timestamp,
  deleteDoc
} from 'firebase/firestore';

// Define types for postcard design
export interface PostcardDesign {
  id?: string;
  name: string;
  campaignId: string;
  businessId: string;
  imageUrl: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  status: 'draft' | 'final';
  notes?: string;
}

// Upload a postcard image to Firebase Storage
export const uploadPostcardImage = async (
  userId: string,
  designId: string,
  file: File
): Promise<string> => {
  try {
    const storage = getStorage();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const storagePath = `users/${userId}/postcards/${designId}/${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);
    
    // Upload the file
    await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading postcard image:', error);
    throw error;
  }
};

// Create a new postcard design document
export const createPostcardDesign = async (
  businessId: string,
  campaignId: string,
  name: string,
  imageUrl: string
): Promise<PostcardDesign> => {
  try {
    const designRef = doc(collection(db, 'postcardDesigns'));
    const design: PostcardDesign = {
      businessId,
      campaignId,
      name,
      imageUrl,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      status: 'draft'
    };

    await setDoc(designRef, design);
    
    // Update the campaign to reference this design
    const campaignRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campaignRef, {
      postcardDesigns: arrayUnion(designRef.id),
      updatedAt: serverTimestamp()
    });
    
    return {
      ...design,
      id: designRef.id
    };
  } catch (error) {
    console.error('Error creating postcard design:', error);
    throw error;
  }
};

// Get a postcard design by ID
export const getPostcardDesignById = async (designId: string): Promise<PostcardDesign | null> => {
  try {
    const designDoc = await getDoc(doc(db, 'postcardDesigns', designId));
    
    if (!designDoc.exists()) {
      return null;
    }
    
    return {
      id: designDoc.id,
      ...designDoc.data()
    } as PostcardDesign;
  } catch (error) {
    console.error('Error getting postcard design:', error);
    throw error;
  }
};

// Get all postcard designs for a campaign
export const getCampaignPostcardDesigns = async (campaignId: string): Promise<PostcardDesign[]> => {
  try {
    const designsQuery = query(
      collection(db, 'postcardDesigns'),
      where('campaignId', '==', campaignId)
    );
    
    const designDocs = await getDocs(designsQuery);
    return designDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PostcardDesign));
  } catch (error) {
    console.error('Error getting campaign postcard designs:', error);
    throw error;
  }
};

// Get all postcard designs for a business
export const getBusinessPostcardDesigns = async (businessId: string): Promise<PostcardDesign[]> => {
  try {
    const designsQuery = query(
      collection(db, 'postcardDesigns'),
      where('businessId', '==', businessId)
    );
    
    const designDocs = await getDocs(designsQuery);
    return designDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PostcardDesign));
  } catch (error) {
    console.error('Error getting business postcard designs:', error);
    throw error;
  }
};

// Update a postcard design
export const updatePostcardDesign = async (
  designId: string,
  data: Partial<Omit<PostcardDesign, 'id' | 'createdAt'>>
): Promise<void> => {
  try {
    const designRef = doc(db, 'postcardDesigns', designId);
    await updateDoc(designRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating postcard design:', error);
    throw error;
  }
};

// Delete a postcard design and its image
export const deletePostcardDesign = async (
  userId: string,
  designId: string
): Promise<void> => {
  try {
    // Get the design to get the image URL
    const design = await getPostcardDesignById(designId);
    
    if (!design) {
      throw new Error('Design not found');
    }
    
    // Extract the storage path from the image URL
    // This assumes URL format contains the path after firebase storage URL
    // The extraction might need adjustment based on actual URL format
    const imageUrl = design.imageUrl;
    let imagePath;
    
    if (imageUrl.includes('firebase') && imageUrl.includes('users')) {
      // Try to extract path after the domain and before query params
      const urlParts = imageUrl.split('/');
      const userIndex = urlParts.findIndex(part => part === 'users');
      
      if (userIndex >= 0) {
        imagePath = urlParts.slice(userIndex).join('/').split('?')[0];
      }
    }
    
    // Delete from Firestore
    const designRef = doc(db, 'postcardDesigns', designId);
    await deleteDoc(designRef);
    
    // Update the campaign to remove this design reference
    const campaignRef = doc(db, 'campaigns', design.campaignId);
    await updateDoc(campaignRef, {
      postcardDesigns: arrayRemove(designId),
      updatedAt: serverTimestamp()
    });
    
    // Delete from Storage if we could extract the path
    if (imagePath) {
      const storage = getStorage();
      const storageRef = ref(storage, imagePath);
      await deleteObject(storageRef);
    }
  } catch (error) {
    console.error('Error deleting postcard design:', error);
    throw error;
  }
};

// Import missing functions from firebase
import { arrayUnion, arrayRemove } from 'firebase/firestore'; 