'use client';

import React from 'react';
import { useLeadsStore } from '@/store/leadsStore';
import { useRouter } from 'next/navigation';

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const totalSelectedLeadsCount = useLeadsStore(state => state.totalSelectedLeadsCount);
  const router = useRouter();

  // If there are no leads collected, redirect back to home
  React.useEffect(() => {
    console.log('Design Layout: Checking for leads, count:', totalSelectedLeadsCount);
    if (totalSelectedLeadsCount === 0) {
      console.log('Design Layout: No leads found, redirecting to home');
      router.push('/');
    } else {
      console.log('Design Layout: Leads found, rendering children');
    }
  }, [totalSelectedLeadsCount, router]);

  return (
    <div className="design-layout">
      {children}
    </div>
  );
} 