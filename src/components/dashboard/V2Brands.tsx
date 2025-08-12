// src/components/dashboard/V2Brands.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserBrands, BrandSummary } from '@/v2/services/brandService';
import BrandCreator from '@/v2/components/brand/BrandCreator';
import { Timestamp } from 'firebase/firestore';

const V2Brands: React.FC = () => {
  const { user } = useAuth();
  
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBrandCreator, setShowBrandCreator] = useState(false);

  const fetchBrands = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedBrands = await getUserBrands(user.uid);
      setBrands(fetchedBrands);
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError('Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchBrands();
  }, [user, fetchBrands]);

  const handleBrandCreated = () => {
    setShowBrandCreator(false);
    // Refresh brands list
    fetchBrands();
  };

  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'Never';
    
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    return 'Never';
  };

  const getCompletenessColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const SkeletonCard: React.FC = () => (
    <div className="border border-gray-700/50 rounded-lg p-4 bg-charcoal/40 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gray-600/50 rounded"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-600/50 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-600/50 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-600/50 rounded w-full"></div>
        <div className="h-3 bg-gray-600/50 rounded w-2/3"></div>
      </div>
    </div>
  );

  if (showBrandCreator) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-electric-teal">Create New Brand</h2>
          <button
            onClick={() => setShowBrandCreator(false)}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Brands
          </button>
        </div>
        
        <BrandCreator
          onBrandCreated={handleBrandCreated}
          onCancel={() => setShowBrandCreator(false)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-electric-teal">Your Brands</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => <SkeletonCard key={index} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 text-red-400 bg-red-900/20 border border-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-electric-teal">Your Brands</h2>
        <button
          onClick={() => setShowBrandCreator(true)}
          className="px-4 py-2 bg-electric-teal text-charcoal rounded-lg hover:bg-electric-teal/90 
            transition-colors font-medium"
        >
          Create New Brand
        </button>
      </div>

      {/* Brand stats */}
      {brands.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-electric-teal">{brands.length}</div>
            <div className="text-sm text-gray-400">Total Brands</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {brands.filter(b => b.isDefault).length}
            </div>
            <div className="text-sm text-gray-400">Default</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {brands.reduce((sum, b) => sum + b.totalCampaigns, 0)}
            </div>
            <div className="text-sm text-gray-400">Total Campaigns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {brands.filter(b => b.completeness >= 80).length}
            </div>
            <div className="text-sm text-gray-400">Complete</div>
          </div>
        </div>
      )}

      {/* Brands grid */}
      {brands.length === 0 ? (
        <div className="text-center p-8 bg-charcoal/50 rounded-md border border-electric-teal/20">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m4 0V9a2 2 0 012-2h2a2 2 0 012 2v12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-electric-teal mb-2">No Brands Yet!</h3>
          <p className="text-gray-300 mb-4">
            Create your first brand to get started with campaigns. Brands help you maintain consistent 
            messaging and design across all your marketing materials.
          </p>
          <button
            onClick={() => setShowBrandCreator(true)}
            className="px-6 py-2 bg-electric-teal text-charcoal rounded-lg hover:bg-electric-teal/90 transition-colors"
          >
            Create Your First Brand
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div 
              key={brand.id} 
              className="border border-gray-700 rounded-lg p-4 bg-charcoal/60 hover:border-electric-teal/50 
                hover:shadow-glow-sm transition-all duration-200"
            >
              {/* Brand header */}
              <div className="flex items-center gap-3 mb-3">
                {brand.logoUrl ? (
                  <img 
                    src={brand.logoUrl} 
                    alt={brand.name}
                    className="w-12 h-12 object-contain rounded border border-gray-600"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-700 rounded border border-gray-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white truncate">{brand.name}</h3>
                    {brand.isDefault && (
                      <span className="text-xs px-2 py-1 bg-electric-teal/20 text-electric-teal rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {brand.totalCampaigns} campaigns
                  </p>
                </div>
              </div>

              {/* Brand details */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Completeness:</span>
                  <span className={`font-medium ${getCompletenessColor(brand.completeness)}`}>
                    {brand.completeness}%
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last Used:</span>
                  <span className="text-white">{formatDate(brand.lastUsed)}</span>
                </div>

                {brand.primaryColor && (
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-400">Primary Color:</span>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border border-gray-600"
                        style={{ backgroundColor: brand.primaryColor }}
                      ></div>
                      <span className="text-white text-xs font-mono">
                        {brand.primaryColor}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Completeness progress bar */}
              <div className="space-y-1 mb-3">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      brand.completeness >= 80 ? 'bg-green-500' :
                      brand.completeness >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${brand.completeness}%` }}
                  ></div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // TODO: Implement brand editing
                    console.log('Edit brand:', brand.id);
                  }}
                  className="flex-1 px-3 py-1.5 rounded bg-charcoal border border-gray-600 text-gray-300 text-sm
                    hover:border-electric-teal/50 hover:text-electric-teal transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement brand usage in new campaign
                    console.log('Use brand:', brand.id);
                  }}
                  className="flex-1 px-3 py-1.5 rounded bg-electric-teal text-charcoal text-sm font-medium
                    hover:bg-electric-teal/90 transition-colors"
                >
                  Use in Campaign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips section */}
      {brands.length > 0 && (
        <div className="bg-electric-teal/10 border border-electric-teal/30 rounded-lg p-4">
          <h3 className="text-electric-teal font-medium mb-2">Brand Management Tips</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Keep your brand information complete for better AI-generated designs</li>
            <li>• Set a default brand to speed up campaign creation</li>
            <li>• Upload high-quality logos for the best results</li>
            <li>• Use consistent colors and messaging across all your brands</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default V2Brands;
