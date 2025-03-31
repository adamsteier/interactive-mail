'use client';

import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600'],  // Light, Regular, Medium, SemiBold
  display: 'swap',
});

// Create a separate client component for the navigation with auth
function Navigation() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // Prevent hydration mismatch by only rendering after component mounts
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything during SSR or before hydration is complete
  if (!mounted) {
    return null;
  }

  return (
    <nav className="flex space-x-4">
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
        <button 
          onClick={logout}
          className="px-4 py-2 bg-charcoal/80 backdrop-blur-sm text-electric-teal border border-electric-teal/30 rounded-lg hover:bg-electric-teal hover:text-charcoal transition-colors"
        >
          Logout
        </button>
      )}
    </nav>
  );
}

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
        </AuthProvider>
      </body>
    </html>
  );
}
