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
  AuthCredential,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getSessionId, updateSessionStatus, updateSessionAnonymousUserId, getSession } from '@/lib/sessionService';
import { createOrUpdateUser, UserData, transferAnonymousData } from '@/lib/userService';
import { useMarketingStore } from '@/store/marketingStore';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  showAuthOverlay: boolean;
  isAnonymous: boolean;
  anonymousAuthFailed: boolean;
  setShowAuthOverlay: (show: boolean) => void;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<UserCredential>;
  signInAnonymously: () => Promise<UserCredential>;
  linkAnonymousAccount: (credential: AuthCredential) => Promise<UserCredential>;
  resetPassword: (email: string) => Promise<void>;
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
  const [anonymousAuthFailed, setAnonymousAuthFailed] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  
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
      console.log('Auth state changed:', authUser ? `User ${authUser.uid} (anonymous: ${authUser.isAnonymous})` : 'No user');
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
    let retryCount = 0;
    const maxRetries = 3;
    let retryTimeout: NodeJS.Timeout;
    
    const initializeAnonymousAuth = async () => {
      if (!loading && !user && !isSigningIn) {
        try {
          console.log('No user detected, signing in anonymously...');
          const result = await signInAnonymouslyHandler();
          console.log('Anonymous sign in completed:', result.user.uid);
          retryCount = 0; // Reset on success
          setAnonymousAuthFailed(false); // Clear any previous failure state
        } catch (error) {
          console.error('Failed to sign in anonymously:', error);
          
          // Handle different error types
          if (error instanceof Error && 'code' in error) {
            const errorCode = (error as { code: string }).code;
            
            switch (errorCode) {
              case 'auth/admin-restricted-operation':
                console.warn('Anonymous authentication is not enabled in Firebase. Please enable it in the Firebase Console.');
                console.warn('Continuing without authentication - some features may be limited.');
                setAnonymousAuthFailed(true);
                // Don't retry for this error
                break;
                
              case 'auth/network-request-failed':
              case 'auth/internal-error':
              case 'auth/too-many-requests':
                // These are potentially temporary issues, retry
                if (retryCount < maxRetries) {
                  retryCount++;
                  const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
                  console.log(`Retrying anonymous auth in ${delay}ms (attempt ${retryCount}/${maxRetries})...`);
                  retryTimeout = setTimeout(initializeAnonymousAuth, delay);
                } else {
                  console.error('Max retries reached for anonymous auth. User will need to interact to continue.');
                  setAnonymousAuthFailed(true);
                }
                break;
                
              case 'auth/web-storage-unsupported':
                console.error('Browser storage is not available. Anonymous auth cannot persist.');
                setAnonymousAuthFailed(true);
                break;
                
              default:
                console.error(`Unexpected auth error: ${errorCode}`);
                // For unknown errors, try once more after a delay
                if (retryCount === 0) {
                  retryCount++;
                  retryTimeout = setTimeout(initializeAnonymousAuth, 2000);
                }
            }
          }
        }
      }
    };

    initializeAnonymousAuth();
    
    // Cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
      }, [loading, user, isSigningIn]);

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
      
      // Track anonymous user ID in session for campaign transfer
      try {
        await updateSessionAnonymousUserId(credential.user.uid);
        console.log('Session updated with anonymous user ID:', credential.user.uid);
      } catch (sessionError) {
        console.error('Failed to update session with anonymous user ID:', sessionError);
        // Don't fail the auth process if session update fails
      }
      
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
    // If user is anonymous, we need to handle this carefully
    if (user && isAnonymous) {
      // Set signing in flag to prevent anonymous auth from interfering
      setIsSigningIn(true);
      
      try {
        // First, try to sign in to the existing account to verify credentials
        // We'll temporarily sign out of anonymous account, sign in normally, then transfer data
        const anonymousUserId = user.uid;
        
        // Sign out of anonymous account
        await signOut(auth);
      
      let credential: UserCredential;
      try {
        // Sign in to the existing account
        credential = await signInWithEmailAndPassword(auth, email, password);
        
        // Set anonymous to false immediately after successful sign-in
        setIsAnonymous(false);
      } catch (signInError) {
        // If sign-in fails, restore the anonymous session
        console.error('Sign-in failed, restoring anonymous session:', signInError);
        try {
          await signInAnonymously(auth);
          setIsAnonymous(true);
        } catch (restoreError) {
          console.error('Failed to restore anonymous session after sign-in failure:', restoreError);
        } finally {
          setIsSigningIn(false);
        }
        throw signInError;
      }
      
      // At this point, sign-in was successful. Handle post-authentication tasks
      // but don't restore anonymous session if these fail
      try {
        await handlePostAuthentication(credential.user);
      } catch (postAuthError) {
        console.error('Failed to handle post-authentication tasks:', postAuthError);
        // Don't restore anonymous session if post-auth fails - the user is successfully signed in
        // Just log the error and continue
      }
      
      // Transfer any anonymous data to the signed-in account (after successful auth)
      try {
        const sessionId = getSessionId();
        if (sessionId) {
          const sessionData = await getSession();
          if (sessionData?.anonymousUserId && sessionData.anonymousUserId === anonymousUserId) {
            console.log('Transferring data from anonymous user to signed-in account:', anonymousUserId);
            await transferAnonymousData(anonymousUserId, credential.user.uid);
          }
        }
      } catch (transferError) {
        console.error('Failed to transfer anonymous data during sign-in:', transferError);
        // Don't fail the sign-in if transfer fails
      }
      
        return credential;
      } finally {
        // Clear the signing in flag
        setIsSigningIn(false);
      }
    }
    
    // Regular sign in for non-anonymous users
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

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent to:', email);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
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
    anonymousAuthFailed,
    setShowAuthOverlay,
    signIn,
    signUp,
    signInWithGoogle,
    signInAnonymously: signInAnonymouslyHandler,
    linkAnonymousAccount,
    resetPassword,
    logout,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 