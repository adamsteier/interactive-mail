import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';
import Link from 'next/link';

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ['300', '400', '500', '600'],  // Light, Regular, Medium, SemiBold
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Post Timely",
  description: "Find and connect with new business leads through AI-powered direct mail",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={montserrat.className}>
      <body>
        <header className="fixed top-0 right-0 z-50 p-4 flex justify-end">
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
          </nav>
        </header>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
