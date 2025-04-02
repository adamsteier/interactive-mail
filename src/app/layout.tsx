import { Montserrat } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { Metadata } from "next";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ['300', '400', '500', '600'],  // Light, Regular, Medium, SemiBold
  display: 'swap',
});

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
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
