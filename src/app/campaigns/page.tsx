'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketingStore } from '@/store/marketingStore';
import CampaignManager from '@/components/CampaignManager';
import Link from 'next/link';

export default function CampaignsPage() {
  const { user, loading } = useAuth();
  const { activeBusiness, userBusinesses, loadUserBusinesses, setActiveBusiness } = useMarketingStore();
  
  const [error, setError] = useState<string | null>(null);

  // Load user businesses on component mount
  useEffect(() => {
    if (user && !loading) {
      loadUserBusinesses(user.uid).catch(err => {
        console.error('Error loading businesses:', err);
        setError('Failed to load your businesses');
      });
    }
  }, [user, loading, loadUserBusinesses]);

  // Handle business selection
  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBusinessId = e.target.value;
    const selectedBusiness = userBusinesses.find(business => business.id === selectedBusinessId);
    if (selectedBusiness) {
      setActiveBusiness(selectedBusiness);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <p>Please sign in to manage your campaigns.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Campaign Manager</h1>
        <Link 
          href="/designs" 
          className="mt-2 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          View All Postcard Designs
        </Link>
      </div>
      
      {/* Business Selector */}
      <div className="mb-6">
        <label htmlFor="businessSelector" className="block text-sm font-medium text-gray-700 mb-1">
          Select Business
        </label>
        <select
          id="businessSelector"
          value={activeBusiness?.id || ''}
          onChange={handleBusinessChange}
          className="w-full md:w-96 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" disabled>
            {userBusinesses.length === 0 ? 'No businesses available' : 'Select a business'}
          </option>
          {userBusinesses.map(business => (
            <option key={business.id} value={business.id}>
              {business.businessName}
            </option>
          ))}
        </select>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {/* Campaign Manager */}
      {activeBusiness ? (
        <CampaignManager />
      ) : (
        <div className="p-6 bg-gray-100 rounded text-center">
          <p className="text-lg mb-2">Please select a business to manage campaigns</p>
          {userBusinesses.length === 0 && (
            <p className="text-gray-600">
              You don&apos;t have any businesses yet. Create one from the home page.
            </p>
          )}
        </div>
      )}
    </div>
  );
} 