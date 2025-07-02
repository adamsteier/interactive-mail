'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { showAuthOverlay } from '@/lib/auth';

export default function AuthFailureNotice() {
  const { anonymousAuthFailed, signInAnonymously } = useAuth();
  const [isRetrying, setIsRetrying] = React.useState(false);
  
  if (!anonymousAuthFailed) {
    return null;
  }
  
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await signInAnonymously();
      // Success - the failed state will be cleared by the auth context
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };
  
  const handleSignUp = () => {
    showAuthOverlay();
  };
  
  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 shadow-lg z-40">
      <div className="flex items-start">
        <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="text-sm font-medium text-yellow-800">Connection Issue</h3>
          <p className="mt-1 text-sm text-yellow-700">
            We&apos;re having trouble connecting. Some features may be limited.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? 'Retrying...' : 'Try Again'}
            </button>
            <button
              onClick={handleSignUp}
              className="text-sm bg-white text-yellow-800 px-3 py-1 rounded border border-yellow-300 hover:bg-yellow-50"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 