'use client';

import { useEffect } from 'react';

export default function SuppressHydrationWarning() {
  useEffect(() => {
    // Remove browser extension attributes that cause hydration mismatches
    const cleanupBrowserExtensionAttributes = () => {
      // Common browser extension attributes that cause hydration issues
      const extensionAttributes = [
        'cz-shortcut-listen',
        'data-darkreader',
        'data-grammarly',
        'data-lastpass',
        'data-bitwarden',
        'data-colorpick-inline',
        'data-colorzilla',
        'style-scope',
        'data-rh'
      ];

      extensionAttributes.forEach(attr => {
        const elements = document.querySelectorAll(`[${attr}]`);
        elements.forEach(element => {
          element.removeAttribute(attr);
        });
      });
    };

    // Run cleanup after a short delay to ensure extensions have added their attributes
    const timeoutId = setTimeout(cleanupBrowserExtensionAttributes, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return null;
} 