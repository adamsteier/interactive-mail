'use client';

import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Metadata } from 'next';
import GlobalAuthOverlay from '@/components/GlobalAuthOverlay';

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600'],  // Light, Regular, Medium, SemiBold
  display: 'swap',
});

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

  return (
    <nav className="flex space-x-4 items-center">
      <Link 
        href="/" 
        className="px-4 py-2 bg-charcoal/80 backdrop-blur-sm text-electric-teal border border-electric-teal/30 rounded-lg hover:bg-charcoal transition-colors"
      >
        Home
      </Link>
      <Link 
        href="/postcard_preview" 
        className="px-4 py-2 bg-charcoal/80 backdrop-blur-sm text-electric-teal border border-electric-teal/30 rounded-lg hover:bg-charcoal transition-colors"
      >
        Postcard Gallery
      </Link>
      {user && (
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
                  href="/campaigns"
                  className="block px-4 py-2 text-electric-teal hover:bg-electric-teal/10 transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Campaigns
                </Link>
                <Link 
                  href="/designs"
                  className="block px-4 py-2 text-electric-teal hover:bg-electric-teal/10 transition-colors"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  Postcard Designs
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

export const metadata: Metadata = {
  title: 'Interactive Mail',
  description: 'Interactive Direct Mail Marketing Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.className}>
      <body>
        <AuthProvider>
          <header className="fixed top-0 right-0 z-50 p-4 flex justify-end">
            <Navigation />
          </header>
          {children}
          <GlobalAuthOverlay />
        </AuthProvider>
      </body>
    </html>
  );
}
