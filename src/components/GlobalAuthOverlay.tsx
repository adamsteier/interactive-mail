'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthOverlay from './AuthOverlay';

// Define the custom event types for TypeScript
declare global {
  interface WindowEventMap {
    'show-auth-overlay': CustomEvent;
    'hide-auth-overlay': CustomEvent;
  }
}

/**
 * Global Auth Overlay that can be shown on top of any page
 * This allows us to trigger auth without interrupting the underlying flow
 */
const GlobalAuthOverlay = () => {
  const { user, isAnonymous } = useAuth();
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Listen for a custom event to show the auth overlay
  useEffect(() => {
    const showAuth = () => {
      console.log('[GlobalAuthOverlay] Show auth overlay event received');
      setShowOverlay(true);
    };
    
    const hideAuth = () => {
      console.log('[GlobalAuthOverlay] Hide auth overlay event received');
      setShowOverlay(false);
    };
    
    // Add event listeners
    window.addEventListener('show-auth-overlay', showAuth);
    window.addEventListener('hide-auth-overlay', hideAuth);
    
    return () => {
      window.removeEventListener('show-auth-overlay', showAuth);
      window.removeEventListener('hide-auth-overlay', hideAuth);
    };
  }, []);
  
  // Separate effect to handle auth state changes
  useEffect(() => {
    // When user logs in (and is no longer anonymous), hide the overlay
    if (user && !isAnonymous && showOverlay) {
      console.log('[GlobalAuthOverlay] User authenticated (not anonymous), hiding overlay');
      setShowOverlay(false);
    }
  }, [user, isAnonymous, showOverlay]);
  
  // Debug the current state
  useEffect(() => {
    console.log('[GlobalAuthOverlay] State changed:', { 
      showOverlay, 
      user: user ? `${user.email || 'anonymous'} (${user.uid})` : 'null',
      isAnonymous 
    });
  }, [showOverlay, user, isAnonymous]);
  
  // Function to handle overlay close
  const handleClose = () => {
    console.log('[GlobalAuthOverlay] Overlay close requested');
    setShowOverlay(false);
  };
  
  // Check if user needs to upgrade from anonymous
  const shouldShowOverlay = showOverlay && (!user || isAnonymous);
  
  return (
    <AuthOverlay 
      isOpen={shouldShowOverlay}
      onClose={handleClose}
      className="z-50"
    />
  );
};

export default GlobalAuthOverlay; 