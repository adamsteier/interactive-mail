import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot,
  Unsubscribe,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// Key for storing session ID in localStorage
const SESSION_ID_KEY = 'interactive_mail_session_id';

// Session status types
export type SessionStatus = 'anonymous' | 'converted' | 'abandoned';

// Business data interface
export interface BusinessData {
  targetArea?: string;
  businessName?: string;
  industry?: string;
  description?: string;
  boundingBox?: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
  businessAnalysis?: Record<string, unknown>;
}

// Session data interface
export interface SessionData {
  createdAt: Timestamp | FieldValue;
  lastActive: Timestamp | FieldValue;
  status: SessionStatus;
  convertedToUserId?: string;
  businessData?: BusinessData;
  marketingStrategy?: Record<string, unknown>;
  selectedBusinessTypes?: string[];
}

/**
 * Initialize or retrieve the session ID
 * @returns The session ID
 */
export const getSessionId = (): string => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return '';
  }

  const sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  // If no session ID exists, create one
  if (!sessionId) {
    const newSessionId = uuidv4();
    localStorage.setItem(SESSION_ID_KEY, newSessionId);
    return newSessionId;
  }
  
  return sessionId;
};

/**
 * Create a new session document in Firestore
 * @returns The created session data
 */
export const createSession = async (): Promise<SessionData> => {
  const sessionId = getSessionId();
  
  // Skip if we're not in a browser or don't have a session ID
  if (!sessionId) {
    throw new Error('Could not create or retrieve session ID');
  }
  
  const sessionData: SessionData = {
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp(),
    status: 'anonymous',
  };
  
  // Create the session document in Firestore
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await setDoc(sessionRef, sessionData);
    console.log('Session created with ID:', sessionId);
    return sessionData;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

/**
 * Get an existing session by ID
 * @returns The session data or null if not found
 */
export const getSession = async (): Promise<SessionData | null> => {
  const sessionId = getSessionId();
  
  if (!sessionId) {
    return null;
  }
  
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (sessionSnap.exists()) {
      return sessionSnap.data() as SessionData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

/**
 * Update session with business data
 * @param businessData The business data to update
 */
export const updateSessionBusinessData = async (businessData: BusinessData): Promise<void> => {
  const sessionId = getSessionId();
  
  if (!sessionId) {
    throw new Error('No session ID available');
  }
  
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      'businessData': businessData,
      'lastActive': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating session business data:', error);
    throw error;
  }
};

/**
 * Update session with marketing strategy
 * @param marketingStrategy The marketing strategy data to update
 */
export const updateSessionMarketingStrategy = async (marketingStrategy: Record<string, unknown>): Promise<void> => {
  const sessionId = getSessionId();
  
  if (!sessionId) {
    throw new Error('No session ID available');
  }
  
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      'marketingStrategy': marketingStrategy,
      'lastActive': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating session marketing strategy:', error);
    throw error;
  }
};

/**
 * Update session with selected business types
 * @param businessTypes Array of selected business types
 */
export const updateSessionBusinessTypes = async (businessTypes: string[]): Promise<void> => {
  const sessionId = getSessionId();
  
  if (!sessionId) {
    throw new Error('No session ID available');
  }
  
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      'selectedBusinessTypes': businessTypes,
      'lastActive': serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating session business types:', error);
    throw error;
  }
};

/**
 * Update session status
 * @param status The new session status
 * @param userId Optional user ID for converted sessions
 */
export const updateSessionStatus = async (
  status: SessionStatus,
  userId?: string
): Promise<void> => {
  const sessionId = getSessionId();
  
  if (!sessionId) {
    throw new Error('No session ID available');
  }
  
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const updateData: {
      status: SessionStatus;
      lastActive: FieldValue;
      convertedToUserId?: string;
    } = {
      status: status,
      lastActive: serverTimestamp()
    };
    
    if (status === 'converted' && userId) {
      updateData.convertedToUserId = userId;
    }
    
    await updateDoc(sessionRef, updateData);
  } catch (error) {
    console.error('Error updating session status:', error);
    throw error;
  }
};

/**
 * Set up real-time updates for a session
 * @param onUpdate Callback for session updates
 * @returns Unsubscribe function to stop listening for updates
 */
export const listenToSessionUpdates = (
  onUpdate: (session: SessionData) => void
): Unsubscribe => {
  const sessionId = getSessionId();
  
  if (!sessionId) {
    throw new Error('No session ID available');
  }
  
  const sessionRef = doc(db, 'sessions', sessionId);
  
  return onSnapshot(sessionRef, (doc) => {
    if (doc.exists()) {
      onUpdate(doc.data() as SessionData);
    }
  }, (error) => {
    console.error('Error listening to session updates:', error);
  });
};

/**
 * Initialize session if needed
 * Checks if a session exists and creates one if it doesn't
 */
export const initializeSession = async (): Promise<SessionData> => {
  try {
    const existingSession = await getSession();
    
    if (existingSession) {
      // Update the lastActive timestamp for existing sessions
      const sessionId = getSessionId();
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        'lastActive': serverTimestamp()
      });
      
      return existingSession;
    } else {
      // Create a new session if none exists
      return await createSession();
    }
  } catch (error) {
    console.error('Error initializing session:', error);
    // Fallback to creating a new session in case of errors
    return await createSession();
  }
};

/**
 * Cleanup a session by marking it as converted or abandoned
 * @param sessionId The session ID to cleanup
 * @param userId Optional user ID for converted sessions
 * @param action The cleanup action ('convert' or 'abandon')
 */
export const cleanupSession = async (
  sessionId: string,
  action: 'convert' | 'abandon',
  userId?: string
): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('No session ID provided');
    }
    
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }
    
    // If the session is already converted or abandoned, do nothing
    const sessionData = sessionSnap.data();
    if (sessionData.status === 'converted' || sessionData.status === 'abandoned') {
      return;
    }
    
    if (action === 'convert') {
      if (!userId) {
        throw new Error('User ID is required for session conversion');
      }
      
      // Mark the session as converted
      await updateDoc(sessionRef, {
        status: 'converted',
        convertedToUserId: userId,
        lastActive: serverTimestamp()
      });
      
      console.log('Session converted successfully:', sessionId);
    } else {
      // Mark the session as abandoned
      await updateDoc(sessionRef, {
        status: 'abandoned',
        lastActive: serverTimestamp()
      });
      
      console.log('Session abandoned successfully:', sessionId);
    }
  } catch (error) {
    console.error('Error cleaning up session:', error);
    throw error;
  }
};

/**
 * Cleanup old or abandoned sessions (useful for scheduled cleanup)
 * @param olderThan Timestamp for sessions older than this to be cleaned up
 */
export const cleanupOldSessions = async (olderThan: Date): Promise<void> => {
  // This function would be implemented with Firestore queries
  // to find and clean up old sessions. It's a placeholder for now
  // as it would typically be run by a server-side process.
  console.log('Cleaning up sessions older than:', olderThan);
}; 