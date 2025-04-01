'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useMarketingStore } from '@/store/marketingStore';
import { getBusinessPostcardDesigns, PostcardDesign } from '@/lib/postcardStore';

export default function PostcardDesignsPage() {
  const { user, loading } = useAuth();
  const { activeBusiness, userBusinesses, loadUserBusinesses, setActiveBusiness } = useMarketingStore();
  
  const [designs, setDesigns] = useState<PostcardDesign[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load user businesses on component mount
  useEffect(() => {
    if (user && !loading) {
      loadUserBusinesses(user.uid);
    }
  }, [user, loading, loadUserBusinesses]);

  // Load designs when active business changes
  useEffect(() => {
    if (activeBusiness?.id) {
      loadDesigns(activeBusiness.id);
    }
  }, [activeBusiness]);

  // Handle business selection
  const handleBusinessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBusinessId = e.target.value;
    const selectedBusiness = userBusinesses.find(business => business.id === selectedBusinessId);
    if (selectedBusiness) {
      setActiveBusiness(selectedBusiness);
    }
  };

  // Load designs for a business
  const loadDesigns = async (businessId: string) => {
    try {
      setIsLoading(true);
      const designsList = await getBusinessPostcardDesigns(businessId);
      setDesigns(designsList);
      setError(null);
    } catch (err) {
      console.error('Error loading designs:', err);
      setError('Failed to load postcard designs');
    } finally {
      setIsLoading(false);
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
        <p>Please sign in to view your postcard designs.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Your Postcard Designs</h1>
      
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
      
      {/* Designs Display */}
      {isLoading ? (
        <p>Loading designs...</p>
      ) : !activeBusiness ? (
        <p>Please select a business to view designs</p>
      ) : designs.length === 0 ? (
        <div className="p-6 bg-gray-100 rounded text-center">
          <p className="text-lg mb-2">No postcard designs found</p>
          <p className="text-gray-600">
            Go to the Campaigns page to create and upload postcard designs for your business
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map(design => (
            <div key={design.id} className="border rounded overflow-hidden shadow-md">
              <div className="relative h-64">
                <img 
                  src={design.imageUrl} 
                  alt={design.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-semibold">{design.name}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  Created: {design.createdAt 
                    ? new Date(design.createdAt.seconds * 1000).toLocaleDateString() 
                    : 'Unknown date'}
                </p>
                {design.notes && (
                  <p className="mt-2 text-gray-600">{design.notes}</p>
                )}
                <div className="mt-4">
                  <a 
                    href={design.imageUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Full Size
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 