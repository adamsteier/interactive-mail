import { useState, useEffect } from 'react';

interface FontDetails {
  name: string;
  weights: number[];
}

/**
 * Custom hook to dynamically load Google Fonts
 * @param fonts Array of font details including name and weights
 * @returns Object with fontsLoaded status
 */
export const useGoogleFonts = (fonts: FontDetails[]) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // If no fonts to load, mark as loaded
    if (!fonts || fonts.length === 0) {
      setFontsLoaded(true);
      return;
    }

    // Create a link element for each font
    const links: HTMLLinkElement[] = [];
    const fontFamilies: string[] = [];

    fonts.forEach(font => {
      if (!font.name) return;
      
      // Clean font name for URL (replace spaces with +)
      const fontNameForUrl = font.name.replace(/\s+/g, '+');
      
      // Create weights string (e.g., "400;700")
      const weights = font.weights && font.weights.length > 0 
        ? `:wght@${font.weights.join(';')}` 
        : ':wght@400;700'; // Default weights if none specified
      
      // Create link element
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontNameForUrl}${weights}&display=swap`;
      link.rel = 'stylesheet';
      
      // Add load event listener
      link.onload = () => {
        console.log(`Font ${font.name} loaded successfully`);
      };
      
      link.onerror = (err) => {
        console.error(`Error loading font ${font.name}:`, err);
      };
      
      // Add to arrays
      links.push(link);
      fontFamilies.push(font.name);
    });

    // Append all link elements to head
    links.forEach(link => document.head.appendChild(link));
    
    // Set up font loading check
    const checkFontsLoaded = () => {
      // Create a span for each font to check if it's loaded
      const spans = fontFamilies.map(fontFamily => {
        const span = document.createElement('span');
        span.style.fontFamily = `"${fontFamily}", monospace`;
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.textContent = 'Font Loading Test';
        document.body.appendChild(span);
        return span;
      });
      
      // Wait a moment to ensure browser has attempted to load fonts
      setTimeout(() => {
        setFontsLoaded(true);
        
        // Clean up spans
        spans.forEach(span => {
          document.body.removeChild(span);
        });
      }, 500);
    };
    
    // If document is ready, check fonts, otherwise wait for load event
    if (document.readyState === 'complete') {
      checkFontsLoaded();
    } else {
      window.addEventListener('load', checkFontsLoaded);
    }
    
    // Clean up function
    return () => {
      window.removeEventListener('load', checkFontsLoaded);
      // Remove link elements
      links.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [fonts]);

  return { fontsLoaded };
}; 