/**
 * Show the global auth overlay without interrupting background processes
 */
export const showAuthOverlay = () => {
  if (typeof window !== 'undefined') {
    console.log('[auth.ts] Dispatching show-auth-overlay event');
    // Use CustomEvent with detail property for better debugging
    window.dispatchEvent(new CustomEvent('show-auth-overlay', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'showAuthOverlay function'
      }
    }));
    
    // Dispatch the event again after a short delay to ensure it's received
    // This helps with edge cases where the component might not be ready
    setTimeout(() => {
      console.log('[auth.ts] Re-dispatching show-auth-overlay event (safety)');
      window.dispatchEvent(new CustomEvent('show-auth-overlay', {
        detail: {
          timestamp: new Date().toISOString(),
          source: 'showAuthOverlay function (delayed)'
        }
      }));
    }, 300);
  }
};

/**
 * Hide the global auth overlay
 */
export const hideAuthOverlay = () => {
  if (typeof window !== 'undefined') {
    console.log('[auth.ts] Dispatching hide-auth-overlay event');
    // Use CustomEvent with detail property for better debugging
    window.dispatchEvent(new CustomEvent('hide-auth-overlay', {
      detail: {
        timestamp: new Date().toISOString(),
        source: 'hideAuthOverlay function'
      }
    }));
  }
}; 