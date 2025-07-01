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
  UserCredential,
  updateProfile,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  linkWithPopup,
  AuthCredential
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getSessionId, updateSessionStatus } from '@/lib/sessionService';
import { createOrUpdateUser, UserData } from '@/lib/userService';
import { useMarketingStore } from '@/store/marketingStore';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  showAuthOverlay: boolean;
  isAnonymous: boolean;
  setShowAuthOverlay: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  signInAnonymously: () => Promise<UserCredential>;
  linkAnonymousAccount: (credential: AuthCredential) => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  
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
      setIsAnonymous(authUser?.isAnonymous || false);
      
      if (authUser) {
        // User is signed in (anonymous or regular), refresh their data
        await refreshUserData();
      } else {
        // User is signed out
        setUserData(null);
        setIsAnonymous(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Initialize anonymous auth if no user is logged in
  useEffect(() => {
    const initializeAnonymousAuth = async () => {
      if (!loading && !user) {
        try {
          console.log('No user detected, signing in anonymously...');
          await signInAnonymouslyHandler();
        } catch (error) {
          console.error('Failed to sign in anonymously:', error);
        }
      }
    };

    initializeAnonymousAuth();
  }, [loading, user]);

  // Helper function to convert anonymous session after authentication
  const handlePostAuthentication = async (user: User, firstName?: string, lastName?: string) => {
    try {
      // Pass names to createOrUpdateUser
      const userData = await createOrUpdateUser(user, firstName, lastName);
      setUserData(userData);
      
      await loadUserBusinesses(user.uid);
      
      if (userData.businesses.length > 0) {
        console.log('User has businesses after auth:', userData.businesses);
      }
      
      // Update session status to converted if it was anonymous
      const sessionId = getSessionId();
      if (sessionId && isAnonymous) {
        await updateSessionStatus('converted', user.uid);
      }
      
      return userData;
    } catch (error) {
      console.error('Failed to handle post-authentication tasks:', error);
      throw error;
    }
  };

  const signInAnonymouslyHandler = async () => {
    try {
      const credential = await signInAnonymously(auth);
      setIsAnonymous(true);
      console.log('Signed in anonymously with UID:', credential.user.uid);
      return credential;
    } catch (error) {
      console.error('Failed to sign in anonymously:', error);
      throw error;
    }
  };

  const linkAnonymousAccount = async (credential: AuthCredential) => {
    if (!user || !isAnonymous) {
      throw new Error('No anonymous user to link');
    }
    
    try {
      const linkedCredential = await linkWithCredential(user, credential);
      setIsAnonymous(false);
      return linkedCredential;
    } catch (error) {
      console.error('Failed to link anonymous account:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    // If user is anonymous, link the account instead of signing in
    if (user && isAnonymous) {
      const credential = EmailAuthProvider.credential(email, password);
      const linkedCredential = await linkAnonymousAccount(credential);
      await handlePostAuthentication(linkedCredential.user);
      return linkedCredential;
    }
    
    // Regular sign in
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await handlePostAuthentication(credential.user);
    return credential;
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    let credential: UserCredential;
    
    // If user is anonymous, link the account instead of creating new one
    if (user && isAnonymous) {
      const authCredential = EmailAuthProvider.credential(email, password);
      credential = await linkAnonymousAccount(authCredential);
      setIsAnonymous(false);
    } else {
      // Regular sign up
      credential = await createUserWithEmailAndPassword(auth, email, password);
    }
    
    // Update Firebase Auth user profile
    try {
      if (auth.currentUser) {
          await updateProfile(auth.currentUser, { 
              displayName: `${firstName} ${lastName}` 
          });
          // Refresh user state locally after profile update
          setUser(auth.currentUser);
          console.log("Firebase Auth profile updated with displayName.");
      } else {
          console.warn("auth.currentUser is null after signup, cannot update profile immediately.");
      }
    } catch (profileError) {
        console.error("Error updating Firebase Auth profile:", profileError);
        // Proceed even if profile update fails, Firestore update might still work
    }

    // Handle post-authentication tasks, passing names
    await handlePostAuthentication(credential.user, firstName, lastName);
    return credential;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    let credential: UserCredential;
    
    // If user is anonymous, link the account
    if (user && isAnonymous) {
      credential = await linkWithPopup(user, provider);
      setIsAnonymous(false);
    } else {
      // Regular Google sign in
      credential = await signInWithPopup(auth, provider);
    }
    
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
    setIsAnonymous(false);
  };

  const value = {
    user,
    userData,
    loading,
    showAuthOverlay,
    isAnonymous,
    setShowAuthOverlay,
    signIn,
    signUp,
    signInWithGoogle,
    signInAnonymously: signInAnonymouslyHandler,
    linkAnonymousAccount,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 