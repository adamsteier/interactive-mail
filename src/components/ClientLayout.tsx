'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import GlobalAuthOverlay from '@/components/GlobalAuthOverlay';

// Create a separate client component for the navigation with auth
function Navigation() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Prevent hydration mismatch by only rendering after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isDropdownOpen && !(event.target as Element).closest('.account-menu')) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Don't render anything during SSR or before hydration is complete
  if (!mounted) {
    return null;
  }

  // Render different UI based on auth state
  return (
    <nav className="flex space-x-4 items-center">
      {!user ? (
          // Render Login/Sign Up button if user is not logged in
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('show-auth-overlay'))}
            className="px-4 py-2 bg-electric-teal/90 backdrop-blur-sm text-charcoal border border-electric-teal/30 rounded-lg hover:bg-electric-teal transition-colors font-medium"
          >
              Login / Sign Up
          </button>
      ) : (
          // Render Account dropdown if user is logged in
          <div className="relative account-menu">
              <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-4 py-2 bg-charcoal/80 backdrop-blur-sm text-electric-teal border border-electric-teal/30 rounded-lg hover:bg-charcoal transition-colors flex items-center"
              >
                  Account
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-4 w-4 ml-2 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-charcoal/95 backdrop-blur-md border border-electric-teal/30 rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="py-1">
                    <Link 
                      href="/dashboard"
                      className="block px-4 py-2 text-electric-teal hover:bg-electric-teal/10 transition-colors"
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <hr className="border-electric-teal/20 my-1" />
                    <button 
                      onClick={() => {
                        logout();
                        setIsDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-electric-teal hover:bg-electric-teal/10 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
      )}
    </nav>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <header className="fixed top-0 right-0 z-50 p-4 flex justify-end">
        <Navigation />
      </header>
      {children}
      <GlobalAuthOverlay />
    </AuthProvider>
  );
} 