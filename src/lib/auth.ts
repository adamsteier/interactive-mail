/**
 * Show the global auth overlay without interrupting background processes
 */
export const showAuthOverlay = () => {
  if (typeof window !== 'undefined') {
    console.log('Dispatching show-auth-overlay event');
    window.dispatchEvent(new CustomEvent('show-auth-overlay'));
  }
};

/**
 * Hide the global auth overlay
 */
export const hideAuthOverlay = () => {
  if (typeof window !== 'undefined') {
    console.log('Dispatching hide-auth-overlay event');
    window.dispatchEvent(new CustomEvent('hide-auth-overlay'));
  }
}; 