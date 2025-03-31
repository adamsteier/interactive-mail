'use client';

import React from 'react';
import { useMarketingStore } from '@/store/marketingStore';
import { useRouter } from 'next/navigation';

export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collectedLeads = useMarketingStore(state => state.collectedLeads);
  const router = useRouter();

  // If there are no leads collected, redirect back to home
  React.useEffect(() => {
    if (collectedLeads.length === 0) {
      router.push('/');
    }
  }, [collectedLeads.length, router]);

  return (
    <div className="design-layout">
      {children}
    </div>
  );
} 