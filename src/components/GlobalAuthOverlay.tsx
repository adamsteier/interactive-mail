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
  const { user } = useAuth();
  const [showOverlay, setShowOverlay] = useState(false);
  
  // Listen for a custom event to show the auth overlay
  useEffect(() => {
    const showAuth = () => {
      console.log('Show auth overlay event received');
      setShowOverlay(true);
    };
    
    const hideAuth = () => {
      console.log('Hide auth overlay event received');
      setShowOverlay(false);
    };
    
    // When user logs in, hide the overlay
    if (user && showOverlay) {
      hideAuth();
    }
    
    // Add event listeners
    window.addEventListener('show-auth-overlay', showAuth);
    window.addEventListener('hide-auth-overlay', hideAuth);
    
    return () => {
      window.removeEventListener('show-auth-overlay', showAuth);
      window.removeEventListener('hide-auth-overlay', hideAuth);
    };
  }, [user, showOverlay]);
  
  // Function to handle successful authentication
  const handleAuthComplete = () => {
    console.log('Auth completed, user:', user);
    // The overlay will be hidden automatically when user state updates
  };
  
  // Debug the current state
  useEffect(() => {
    console.log('GlobalAuthOverlay state:', { showOverlay, user: !!user });
  }, [showOverlay, user]);
  
  return (
    <AuthOverlay 
      isOpen={showOverlay && !user}
      onClose={handleAuthComplete}
      className="z-50"
    />
  );
};

export default GlobalAuthOverlay; 