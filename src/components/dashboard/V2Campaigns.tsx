// src/components/dashboard/V2Campaigns.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  orderBy, 
  where,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { V2Campaign, CampaignStatus } from '@/v2/types/campaign';

const V2Campaigns: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [campaigns, setCampaigns] = useState<V2Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Set up real-time listener for campaigns
    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('ownerUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(campaignsQuery, (snapshot) => {
      const fetchedCampaigns: V2Campaign[] = [];
      snapshot.forEach((doc) => {
        fetchedCampaigns.push({
          id: doc.id,
          ...doc.data()
        } as V2Campaign);
      });
      
      setCampaigns(fetchedCampaigns);
      setIsLoading(false);
    }, (err) => {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredCampaigns = campaigns.filter(campaign => {
    switch (filter) {
      case 'active':
        return ['setup', 'brand_selected', 'design_in_progress', 'review', 'payment_pending', 'processing', 'sending'].includes(campaign.status);
      case 'completed':
        return ['sent', 'complete'].includes(campaign.status);
      case 'failed':
        return ['failed', 'cancelled'].includes(campaign.status);
      default:
        return true;
    }
  });

  const formatDate = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return 'N/A';
    
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toLocaleDateString();
    }
    
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString();
    }
    
    return 'N/A';
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'setup':
      case 'brand_selected':
      case 'design_in_progress':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'review':
      case 'payment_pending':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'processing':
      case 'sending':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'sent':
      case 'complete':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: CampaignStatus) => {
    switch (status) {
      case 'setup': return 'Setting Up';
      case 'brand_selected': return 'Brand Selected';
      case 'design_in_progress': return 'Creating Designs';
      case 'review': return 'Ready for Review';
      case 'payment_pending': return 'Payment Pending';
      case 'processing': return 'Processing';
      case 'sending': return 'Sending';
      case 'sent': return 'Sent';
      case 'complete': return 'Complete';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getProgressPercentage = (campaign: V2Campaign) => {
    return campaign.progress?.overallPercent || 0;
  };

  const handleCampaignClick = (campaign: V2Campaign) => {
    // Navigate to appropriate step based on status
    switch (campaign.status) {
      case 'setup':
        router.push(`/v2/build/${campaign.id}/leads`);
        break;
      case 'brand_selected':
        router.push(`/v2/build/${campaign.id}/design`);
        break;
      case 'design_in_progress':
        router.push(`/v2/build/${campaign.id}/design`);
        break;
      case 'review':
        router.push(`/v2/build/${campaign.id}/review`);
        break;
      case 'payment_pending':
        router.push(`/v2/build/${campaign.id}/checkout`);
        break;
      default:
        router.push(`/v2/build/${campaign.id}/review`);
    }
  };

  const SkeletonCard: React.FC = () => (
    <div className="border border-gray-700/50 rounded-lg p-4 bg-charcoal/40 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="h-5 bg-gray-600/50 rounded w-1/2"></div>
        <div className="h-6 bg-gray-600/50 rounded w-20"></div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-600/50 rounded w-3/4"></div>
        <div className="h-3 bg-gray-600/50 rounded w-1/2"></div>
      </div>
      <div className="h-2 bg-gray-600/50 rounded w-full"></div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-electric-teal">Your Campaigns</h2>
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
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-electric-teal">Your Campaigns</h2>
        
        {/* Filter buttons */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed', 'failed'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === filterType
                  ? 'bg-electric-teal text-charcoal'
                  : 'bg-charcoal/60 text-gray-400 hover:text-electric-teal border border-gray-700'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-electric-teal">{campaigns.length}</div>
          <div className="text-sm text-gray-400">Total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {campaigns.filter(c => ['setup', 'brand_selected', 'design_in_progress', 'review', 'payment_pending', 'processing', 'sending'].includes(c.status)).length}
          </div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {campaigns.filter(c => ['sent', 'complete'].includes(c.status)).length}
          </div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400">
            {campaigns.reduce((sum, c) => sum + (c.totalLeadCount || 0), 0).toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Leads</div>
        </div>
      </div>

      {/* Campaigns grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center p-8 bg-charcoal/50 rounded-md border border-electric-teal/20">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-electric-teal mb-2">
            {filter === 'all' ? 'No Campaigns Yet!' : `No ${filter} campaigns`}
          </h3>
          <p className="text-gray-300 mb-4">
            {filter === 'all' 
              ? "You haven't created any campaigns yet."
              : `You don't have any ${filter} campaigns.`
            }
          </p>
          {filter === 'all' && (
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-electric-teal text-charcoal rounded-lg hover:bg-electric-teal/90 transition-colors"
            >
              Create Your First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="border border-gray-700 rounded-lg p-4 bg-charcoal/60 hover:border-electric-teal/50 
                hover:shadow-glow-sm transition-all duration-200 cursor-pointer"
              onClick={() => handleCampaignClick(campaign)}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-white truncate flex-1 mr-2">
                  {campaign.name || `Campaign ${campaign.id?.slice(-6)}`}
                </h3>
                <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(campaign.status)}`}>
                  {getStatusText(campaign.status)}
                </span>
              </div>

              {/* Campaign details */}
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Leads:</span>
                  <span className="text-white">{campaign.totalLeadCount?.toLocaleString() || 0}</span>
                </div>
                
                {campaign.brandId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Brand:</span>
                    <span className="text-white truncate">Selected</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white">{formatDate(campaign.createdAt)}</span>
                </div>

                {campaign.payment?.totalCost && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Cost:</span>
                    <span className="text-white">${campaign.payment.totalCost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Progress</span>
                  <span>{getProgressPercentage(campaign)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-electric-teal h-2 rounded-full transition-all duration-300"
                    style={{ width: `${getProgressPercentage(campaign)}%` }}
                  ></div>
                </div>
              </div>

              {/* Action hint */}
              <div className="mt-3 pt-2 border-t border-gray-700/50">
                <p className="text-xs text-gray-500 text-center">
                  Click to {campaign.status === 'complete' ? 'view details' : 'continue'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default V2Campaigns;
