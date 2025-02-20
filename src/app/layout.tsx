import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/contexts/AuthContext';

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
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
