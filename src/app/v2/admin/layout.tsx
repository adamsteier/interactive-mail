'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import LoadingBar from '@/components/LoadingBar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <LoadingBar progress={50} />
          <p className="text-light-gray mt-4">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Admin Header */}
      <header className="bg-charcoal border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-white">
                PostTimely <span className="text-electric-teal">Admin</span>
              </h1>
              <nav className="flex space-x-4">
                <a
                  href="/v2/admin"
                  className="text-light-gray hover:text-electric-teal transition-colors px-3 py-2"
                >
                  Dashboard
                </a>
                <Link
                  href="/v2/admin/campaigns"
                  className="text-light-gray hover:text-electric-teal transition-colors px-3 py-2"
                >
                  Campaigns
                </Link>
                <a
                  href="/v2/admin/monitoring"
                  className="text-light-gray hover:text-electric-teal transition-colors px-3 py-2"
                >
                  Monitoring
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-light-gray">Admin Mode</span>
              <a
                href="/dashboard"
                className="text-sm text-electric-teal hover:text-white transition-colors"
              >
                Exit Admin →
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 