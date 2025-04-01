'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  UserCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getSessionId, updateSessionStatus } from '@/lib/sessionService';
import { createOrUpdateUser, UserData } from '@/lib/userService';
import { useMarketingStore } from '@/store/marketingStore';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get store actions for business operations
  const { 
    loadUserBusinesses
  } = useMarketingStore();

  // Function to refresh user data from Firestore
  const refreshUserData = async () => {
    if (!user) {
      setUserData(null);
      return;
    }
    
    try {
      // This will either create a new user document or update an existing one
      const userData = await createOrUpdateUser(user);
      setUserData(userData);
      
      // Load user's businesses into the store
      await loadUserBusinesses(user.uid);
      
      // If user has businesses, set the first one as active
      if (userData.businesses.length > 0) {
        // This would typically load the business data first
        // For now, we'll just set it as the active ID
        // In a real implementation, you'd load the business data first
        console.log('User has businesses:', userData.businesses);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        // User is signed in, refresh their data
        await refreshUserData();
      } else {
        // User is signed out
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Helper function to convert anonymous session after authentication
  const handlePostAuthentication = async (user: User) => {
    try {
      // This creates or updates the user document in Firestore
      // It also automatically converts any anonymous session data
      const userData = await createOrUpdateUser(user);
      setUserData(userData);
      
      // Load user's businesses into the store
      await loadUserBusinesses(user.uid);
      
      // If user has recently converted an anonymous session, the business
      // will be in their businesses array
      if (userData.businesses.length > 0) {
        console.log('User has businesses after auth:', userData.businesses);
      }
      
      return userData;
    } catch (error) {
      console.error('Failed to handle post-authentication tasks:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Handle post-authentication tasks
    await handlePostAuthentication(credential.user);
    return credential;
  };

  const signUp = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    // Handle post-authentication tasks
    await handlePostAuthentication(credential.user);
    return credential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    // Handle post-authentication tasks
    await handlePostAuthentication(credential.user);
    return credential;
  };

  const logout = async () => {
    // Before signing out, mark any active session as anonymous or abandoned
    try {
      const sessionId = getSessionId();
      if (sessionId) {
        await updateSessionStatus('anonymous');
      }
    } catch (error) {
      console.error('Error updating session status on logout:', error);
    }
    
    await signOut(auth);
    setUserData(null);
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 