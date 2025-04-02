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
    // When user logs in, hide the overlay with a slight delay
    // to ensure proper rendering sequence
    if (user && showOverlay) {
      console.log('[GlobalAuthOverlay] User authenticated, hiding overlay');
      // Small delay to ensure everything is properly rendered
      const timer = setTimeout(() => {
        setShowOverlay(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [user, showOverlay]);
  
  // Debug the current state
  useEffect(() => {
    console.log('[GlobalAuthOverlay] State changed:', { 
      showOverlay, 
      user: user ? `${user.email} (${user.uid})` : 'null' 
    });
  }, [showOverlay, user]);
  
  // Function to handle successful authentication
  const handleAuthComplete = () => {
    if (user) {
      console.log('[GlobalAuthOverlay] Auth completed successfully');
      // The overlay will be hidden automatically when user state updates
    }
  };
  
  return (
    <AuthOverlay 
      isOpen={showOverlay && !user}
      onClose={handleAuthComplete}
      className="z-50"
    />
  );
};

export default GlobalAuthOverlay; 