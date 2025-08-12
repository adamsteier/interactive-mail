// src/components/dashboard/V2Overview.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { V2Campaign } from '@/v2/types/campaign';
import { getUserBrands, BrandSummary } from '@/v2/services/brandService';
import { getUserTemplates, DesignTemplate } from '@/v2/services/templateService';

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBrands: number;
  totalTemplates: number;
  totalLeadsSent: number;
  avgResponseRate: number;
}

const V2Overview: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalBrands: 0,
    totalTemplates: 0,
    totalLeadsSent: 0,
    avgResponseRate: 0
  });
  
  const [recentCampaigns, setRecentCampaigns] = useState<V2Campaign[]>([]);
  const [recentBrands, setRecentBrands] = useState<BrandSummary[]>([]);
  const [recentTemplates, setRecentTemplates] = useState<DesignTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch campaigns
      const campaignsQuery = query(
        collection(db, 'campaigns'),
        where('ownerUid', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const campaignsSnapshot = await getDocs(campaignsQuery);
      const campaigns = campaignsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as V2Campaign));

      // Fetch brands
      const brands = await getUserBrands(user.uid);

      // Fetch templates
      const templates = await getUserTemplates(user.uid, { limit: 5 });

      // Calculate stats
      const allCampaignsQuery = query(
        collection(db, 'campaigns'),
        where('ownerUid', '==', user.uid)
      );
      const allCampaignsSnapshot = await getDocs(allCampaignsQuery);
      const allCampaigns = allCampaignsSnapshot.docs.map(doc => doc.data() as V2Campaign);

      const totalLeadsSent = allCampaigns.reduce((sum, campaign) => 
        sum + (campaign.totalLeadCount || 0), 0
      );

      const activeCampaigns = allCampaigns.filter(campaign => 
        ['setup', 'brand_selected', 'design_in_progress', 'review', 'payment_pending', 'processing'].includes(campaign.status)
      ).length;

      const campaignsWithAnalytics = allCampaigns.filter(c => c.analytics?.responseRate);
      const avgResponseRate = campaignsWithAnalytics.length > 0
        ? campaignsWithAnalytics.reduce((sum, c) => sum + (c.analytics?.responseRate || 0), 0) / campaignsWithAnalytics.length
        : 0;

      setStats({
        totalCampaigns: allCampaigns.length,
        activeCampaigns,
        totalBrands: brands.length,
        totalTemplates: templates.length,
        totalLeadsSent,
        avgResponseRate
      });

      setRecentCampaigns(campaigns);
      setRecentBrands(brands.slice(0, 3));
      setRecentTemplates(templates);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'setup':
      case 'brand_selected':
      case 'design_in_progress':
        return 'text-yellow-400';
      case 'review':
      case 'payment_pending':
        return 'text-blue-400';
      case 'processing':
      case 'sending':
        return 'text-purple-400';
      case 'sent':
      case 'complete':
        return 'text-green-400';
      case 'failed':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const StatCard: React.FC<{ title: string; value: number | string; isLoading: boolean; subtitle?: string }> = ({ 
    title, value, isLoading, subtitle 
  }) => (
    <div className="bg-charcoal/60 p-4 rounded-lg border border-gray-700 text-center hover:border-electric-teal/50 transition-colors">
      <h3 className="text-sm font-medium text-gray-400 mb-1">{title}</h3>
      {isLoading ? (
        <div className="h-6 w-16 mx-auto bg-gray-600/50 rounded animate-pulse"></div>
      ) : (
        <>
          <p className="text-2xl font-semibold text-electric-teal">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="text-center p-6 text-red-400 bg-red-900/20 border border-red-700 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="p-5 bg-gradient-to-r from-charcoal/70 to-charcoal/50 backdrop-blur-sm rounded-lg border border-electric-teal/20 shadow-glow-sm">
        <h2 className="text-xl font-semibold text-white mb-1">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
        </h2>
        <p className="text-gray-300 text-sm">Here&apos;s your V2 campaign overview and recent activity.</p>
      </div>

      {/* Quick Stats */}
      <div>
        <h3 className="text-lg font-semibold text-electric-teal mb-3">Campaign Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Campaigns" value={stats.totalCampaigns} isLoading={isLoading} />
          <StatCard title="Active Campaigns" value={stats.activeCampaigns} isLoading={isLoading} />
          <StatCard title="Total Leads Sent" value={stats.totalLeadsSent.toLocaleString()} isLoading={isLoading} />
          <StatCard 
            title="Avg Response Rate" 
            value={`${stats.avgResponseRate.toFixed(1)}%`} 
            isLoading={isLoading}
            subtitle={stats.avgResponseRate > 0 ? "Across completed campaigns" : "No data yet"}
          />
        </div>
      </div>

      {/* Asset Overview */}
      <div>
        <h3 className="text-lg font-semibold text-electric-teal mb-3">Your Assets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Brands" value={stats.totalBrands} isLoading={isLoading} />
          <StatCard title="Templates" value={stats.totalTemplates} isLoading={isLoading} />
          <StatCard title="Active Designs" value="—" isLoading={isLoading} subtitle="Coming soon" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Campaigns */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-electric-teal">Recent Campaigns</h3>
            <button
              onClick={() => router.push('/dashboard?tab=campaigns')}
              className="text-sm text-electric-teal/70 hover:text-electric-teal transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-3 bg-charcoal/40 rounded border border-gray-700/50 animate-pulse">
                  <div className="h-4 bg-gray-600/50 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-600/50 rounded w-1/2"></div>
                </div>
              ))
            ) : recentCampaigns.length > 0 ? (
              recentCampaigns.map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="p-3 bg-charcoal/40 rounded border border-gray-700/50 hover:border-electric-teal/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/v2/build/${campaign.id}/review`)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium truncate">
                        {campaign.name || `Campaign ${campaign.id?.slice(-6)}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {campaign.totalLeadCount} leads • {formatDate(campaign.createdAt)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-4 text-gray-400">
                <p>No campaigns yet</p>
                <p className="text-xs mt-1">Create your first campaign to get started!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Brands */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-electric-teal">Your Brands</h3>
            <button
              onClick={() => router.push('/dashboard?tab=brands')}
              className="text-sm text-electric-teal/70 hover:text-electric-teal transition-colors"
            >
              Manage →
            </button>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="p-3 bg-charcoal/40 rounded border border-gray-700/50 animate-pulse">
                  <div className="h-4 bg-gray-600/50 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-600/50 rounded w-1/2"></div>
                </div>
              ))
            ) : recentBrands.length > 0 ? (
              recentBrands.map((brand) => (
                <div 
                  key={brand.id} 
                  className="p-3 bg-charcoal/40 rounded border border-gray-700/50 hover:border-electric-teal/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {brand.logoUrl && (
                      <img 
                        src={brand.logoUrl} 
                        alt={brand.name}
                        className="w-8 h-8 object-contain rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium truncate">{brand.name}</p>
                      <p className="text-xs text-gray-400">
                        {brand.totalCampaigns} campaigns • {brand.completeness}% complete
                      </p>
                    </div>
                    {brand.isDefault && (
                      <span className="text-xs text-electric-teal">Default</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-4 text-gray-400">
                <p>No brands yet</p>
                <p className="text-xs mt-1">Create a brand to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-electric-teal mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-4 bg-electric-teal/10 border border-electric-teal/30 rounded-lg hover:bg-electric-teal/20 
              transition-colors text-left"
          >
            <div className="text-electric-teal font-medium mb-1">Start New Campaign</div>
            <div className="text-sm text-gray-400">Find leads and create designs</div>
          </button>
          
          <button
            onClick={() => router.push('/dashboard?tab=brands')}
            className="p-4 bg-charcoal/60 border border-gray-700 rounded-lg hover:border-electric-teal/50 
              transition-colors text-left"
          >
            <div className="text-white font-medium mb-1">Manage Brands</div>
            <div className="text-sm text-gray-400">Create and edit brand profiles</div>
          </button>
          
          <button
            onClick={() => router.push('/dashboard?tab=templates')}
            className="p-4 bg-charcoal/60 border border-gray-700 rounded-lg hover:border-electric-teal/50 
              transition-colors text-left"
          >
            <div className="text-white font-medium mb-1">Browse Templates</div>
            <div className="text-sm text-gray-400">View saved design templates</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default V2Overview;
