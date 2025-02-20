import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

// Only import what we're currently using
// Remove unused imports: query, where, updateDoc, deleteDoc, doc

const firebaseConfig = {
  // your config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Type the data parameter properly instead of using any
export const createDocument = async (collectionName: string, data: Record<string, unknown>) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

export default db; 