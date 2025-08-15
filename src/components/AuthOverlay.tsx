'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseError } from 'firebase/app';
import { getEnabledAuthMethods } from '@/lib/firebase';

interface AuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

type AuthMode = 'signin' | 'signup';

interface AuthMethods {
  emailPassword: boolean;
  google: boolean;
}

// Helper function to get user-friendly error messages from Firebase errors
const getFirebaseErrorMessage = (error: FirebaseError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/email-already-in-use':
      return 'This email address is already in use';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/network-request-failed':
      return 'Network error - check your internet connection';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again later';
    case 'auth/internal-error':
      return 'Internal error. Please try again';
    default:
      return error.message || 'An error occurred';
  }
};

const AuthOverlay = ({ isOpen, onClose, className = '' }: AuthOverlayProps) => {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [enabledAuthMethods, setEnabledAuthMethods] = useState<AuthMethods>({
    emailPassword: false,
    google: false
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  // Check which auth methods are enabled
  useEffect(() => {
    const checkEnabledAuthMethods = async () => {
      if (isOpen) {
        setIsCheckingAuth(true);
        try {
          const methods = await getEnabledAuthMethods();
          setEnabledAuthMethods(methods);
        } catch (err) {
          console.error('Error checking auth methods', err);
        } finally {
          setIsCheckingAuth(false);
        }
      }
    };

    checkEnabledAuthMethods();
  }, [isOpen]);

  const handleGoogleSignIn = async () => {
    if (isGoogleLoading || isLoading || !enabledAuthMethods.google) return;
    
    setError('');
    setIsGoogleLoading(true);
    
    try {
      await signInWithGoogle();
      // Only close after successful sign-in
      onClose();
    } catch (err: unknown) {
      console.error('Google sign-in error:', err);
      if (err instanceof FirebaseError) {
        if (err.code === 'auth/operation-not-allowed') {
          setError('Google sign-in is not enabled. Please use email/password instead.');
          // Update auth methods status
          setEnabledAuthMethods(prev => ({...prev, google: false}));
        } else {
          setError(getFirebaseErrorMessage(err));
        }
      } else {
        setError('Failed to sign in with Google');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (isLoading) return;
    
    setError('');
    setIsLoading(true);
    
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      await signIn(email, password);
      // Only close after successful sign-in
      onClose();
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      if (err instanceof FirebaseError) {
        setError(getFirebaseErrorMessage(err));
      } else {
        setError('Failed to sign in');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (isLoading) return;
    
    setError('');
    setIsLoading(true);
    
    try {
      if (mode === 'signup' && (!firstName || !lastName)) {
        throw new Error('First name and last name are required');
      }
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      await signUp(email, password, firstName, lastName);
      // Only close after successful sign-up
      onClose();
    } catch (err: unknown) {
      console.error('Sign-up error:', err);
      if (err instanceof FirebaseError) {
        setError(getFirebaseErrorMessage(err));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to sign up');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (isLoading || !email) {
      if (!email) {
        setError('Please enter your email address first');
      }
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      await resetPassword(email);
      setResetEmailSent(true);
      setShowForgotPassword(false);
    } catch (err: unknown) {
      console.error('Password reset error:', err);
      if (err instanceof FirebaseError) {
        setError(getFirebaseErrorMessage(err));
      } else {
        setError('Failed to send password reset email');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    if (!email || !password) {
      setError('Email and password are required');
      return false;
    }
    
    if (mode === 'signup') {
      if (!firstName || !lastName) {
        setError('First name and last name are required');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!enabledAuthMethods.emailPassword) {
      setError('Email/password authentication is not enabled. Please use Google sign-in.');
      return;
    }
    
    setError('');
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (mode === 'signin') {
        await handleEmailSignIn();
      } else {
        await handleEmailSignUp();
      }
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      if (err instanceof FirebaseError) {
        // Handle different Firebase auth errors
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          setError('Invalid email or password');
        } else if (err.code === 'auth/email-already-in-use') {
          setError('This email is already registered. Would you like to sign in instead?');
          // Offer to switch mode
        } else if (err.code === 'auth/operation-not-allowed') {
          setError('This authentication method is not enabled. Please try Google sign-in instead.');
          // Update auth methods status
          setEnabledAuthMethods(prev => ({...prev, emailPassword: false}));
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred during authentication');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto overscroll-contain ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-md" />
      <div
        className="relative w-full max-w-md my-4 rounded-lg border-2 border-electric-teal bg-charcoal/90 p-6 sm:p-8 shadow-glow max-h-[calc(100dvh-2rem)] overflow-y-auto"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-electric-teal hover:text-electric-teal/80 
            transition-colors z-10"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {isCheckingAuth ? (
          <div className="py-10 text-center">
            <svg className="animate-spin h-10 w-10 text-electric-teal mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-electric-teal">Loading authentication options...</p>
          </div>
        ) : (
          <>
            {/* Mode Selector */}
            <div className="mb-6 flex w-full rounded-lg border border-electric-teal/30 p-1">
              <button 
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 rounded-md py-2 text-center transition-all ${
                  mode === 'signup' 
                    ? 'bg-electric-teal text-charcoal font-medium' 
                    : 'text-electric-teal/70 hover:text-electric-teal'
                }`}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 rounded-md py-2 text-center transition-all ${
                  mode === 'signin' 
                    ? 'bg-electric-teal text-charcoal font-medium' 
                    : 'text-electric-teal/70 hover:text-electric-teal'
                }`}
              >
                Sign In
              </button>
            </div>
            
            {/* Header */}
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-electric-teal mb-2">
                {mode === 'signin' ? 'Welcome Back' : 'Get Started'}
              </h2>
              <p className="text-electric-teal/70">
                {mode === 'signin' 
                  ? 'Sign in to access your marketing data' 
                  : 'Create an account to unlock all features'}
              </p>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 rounded-md bg-neon-magenta/10 border border-neon-magenta text-neon-magenta text-sm">
                {error}
                {error.includes('already registered') && (
                  <button 
                    onClick={() => setMode('signin')}
                    className="block w-full mt-2 text-electric-teal underline text-sm"
                  >
                    Click here to sign in
                  </button>
                )}
              </div>
            )}
            
            {/* Password reset success message */}
            {resetEmailSent && (
              <div className="mb-4 p-3 rounded-md bg-electric-teal/10 border border-electric-teal text-electric-teal text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium">Password reset email sent!</p>
                    <p className="text-xs mt-1 text-electric-teal/80">
                      Check your email for instructions to reset your password.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Auth Methods Availability Warning */}
            {!enabledAuthMethods.emailPassword && !enabledAuthMethods.google && (
              <div className="mb-4 p-3 rounded-md bg-electric-teal/10 border border-electric-teal text-electric-teal text-sm">
                <p>Authentication is currently unavailable. Please try again later or contact support.</p>
              </div>
            )}
            
            {/* Auth Form */}
            {enabledAuthMethods.emailPassword && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Add First Name and Last Name for Sign Up */}
                {mode === 'signup' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label 
                        htmlFor="firstName" 
                        className="block mb-1 text-sm font-medium text-electric-teal"
                      >
                        First Name
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full p-3 rounded-md bg-charcoal-light border border-electric-teal/50 text-white 
                          focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
                        placeholder="Ada"
                        required
                      />
                    </div>
                    <div>
                      <label 
                        htmlFor="lastName" 
                        className="block mb-1 text-sm font-medium text-electric-teal"
                      >
                        Last Name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full p-3 rounded-md bg-charcoal-light border border-electric-teal/50 text-white 
                          focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
                        placeholder="Lovelace"
                        required
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label 
                    htmlFor="email" 
                    className="block mb-1 text-sm font-medium text-electric-teal"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-md bg-charcoal-light border border-electric-teal/50 text-white 
                      focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
                    placeholder="your@email.com"
                  />
                </div>
                
                <div>
                  <label 
                    htmlFor="password" 
                    className="block mb-1 text-sm font-medium text-electric-teal"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 rounded-md bg-charcoal-light border border-electric-teal/50 text-white 
                        focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
                      placeholder="••••••••"
                    />
                    {password.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex space-x-1">
                        {Array.from({ length: Math.min(password.length, 6) }).map((_, i) => (
                          <div 
                            key={i} 
                            className="h-2 w-2 rounded-full bg-electric-teal"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-electric-teal/60">
                    {mode === 'signup' ? 'Minimum 6 characters' : ''}
                  </p>
                </div>
                
                {/* Confirm Password for Sign Up */}
                {mode === 'signup' && (
                  <div>
                    <label 
                      htmlFor="confirmPassword" 
                      className="block mb-1 text-sm font-medium text-electric-teal"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 rounded-md bg-charcoal-light border border-electric-teal/50 text-white 
                          focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
                        placeholder="••••••••"
                      />
                      {confirmPassword.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex space-x-1">
                          {Array.from({ length: Math.min(confirmPassword.length, 6) }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`h-2 w-2 rounded-full ${
                                confirmPassword === password.substring(0, confirmPassword.length)
                                  ? 'bg-electric-teal'
                                  : 'bg-neon-magenta'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full relative overflow-hidden p-3 rounded-md bg-electric-teal text-charcoal 
                    font-medium hover:bg-electric-teal/90 transition-colors disabled:opacity-70 flex 
                    justify-center items-center mt-4"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-charcoal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    mode === 'signin' ? 'Sign In' : 'Create Account'
                  )}
                </button>
                
                {/* Forgot Password Link - Only show for sign in mode */}
                {mode === 'signin' && (
                  <div className="text-center mt-3">
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-sm text-electric-teal/70 hover:text-electric-teal underline transition-colors"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
                
                {/* Or Divider - Only show if both methods are available */}
                {enabledAuthMethods.google && enabledAuthMethods.emailPassword && (
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-electric-teal/30"></div>
                    <span className="flex-shrink mx-4 text-electric-teal/60 text-sm">OR</span>
                    <div className="flex-grow border-t border-electric-teal/30"></div>
                  </div>
                )}
              </form>
            )}
            
            {/* Google Sign In - Only show if enabled */}
            {enabledAuthMethods.google && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className={`w-full p-3 rounded-md bg-charcoal border border-electric-teal/50 text-electric-teal 
                  font-medium hover:bg-electric-teal/10 transition-colors flex items-center justify-center space-x-2
                  disabled:opacity-70 ${!enabledAuthMethods.emailPassword ? 'mt-4' : ''}`}
              >
                {isGoogleLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-electric-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in with Google...
                  </span>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                      <path fill="none" d="M1 1h22v22H1z" />
                    </svg>
                    <span>{mode === 'signin' ? 'Sign in with Google' : 'Continue with Google'}</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
        
        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div
            className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm flex items-center justify-center z-10 p-4 overflow-y-auto"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div
              className="bg-charcoal/95 border border-electric-teal/30 rounded-lg p-6 w-full max-w-sm mx-auto my-4 max-h-[calc(100dvh-2rem)] overflow-y-auto"
              style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-electric-teal mb-2">Reset Password</h3>
                <p className="text-sm text-electric-teal/70">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>
              
              <div className="mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full p-3 rounded-md bg-charcoal-light border border-electric-teal/50 text-white 
                    focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 border border-electric-teal/30 text-electric-teal rounded-md 
                    hover:bg-electric-teal/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForgotPassword}
                  disabled={isLoading || !email}
                  className="flex-1 px-4 py-2 bg-electric-teal text-charcoal rounded-md font-medium
                    hover:bg-electric-teal/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Background Hint Text - to show that things are loading behind */}
        <div className="absolute -z-10 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
          w-full text-center opacity-10 pointer-events-none text-electric-teal text-lg font-bold">
          <p>Loading your marketing data...</p>
          <p className="mt-4">Sign in to reveal your potential customers</p>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay; 