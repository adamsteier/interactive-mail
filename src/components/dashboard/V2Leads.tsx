// src/components/dashboard/V2Leads.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { V2Lead } from '@/v2/types/campaign';

interface LeadWithCampaign extends V2Lead {
  campaignId: string;
  campaignName?: string;
}

const V2Leads: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [leads, setLeads] = useState<LeadWithCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sent' | 'delivered' | 'failed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLeads = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      // First get user's campaigns to filter leads
      const campaignsQuery = query(
        collection(db, 'campaigns'),
        where('ownerUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const campaignsSnapshot = await getDocs(campaignsQuery);
      const campaigns = campaignsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        ...doc.data()
      }));

      // Fetch leads from all user campaigns
      const allLeads: LeadWithCampaign[] = [];
      
      for (const campaign of campaigns) {
        try {
          const leadsQuery = query(
            collection(db, 'campaigns', campaign.id, 'leads'),
            orderBy('createdAt', 'desc')
          );
          
          const leadsSnapshot = await getDocs(leadsQuery);
          const campaignLeads = leadsSnapshot.docs.map(doc => ({
            id: doc.id,
            campaignId: campaign.id,
            campaignName: campaign.name || `Campaign ${campaign.id.slice(-6)}`,
            ...doc.data()
          } as LeadWithCampaign));
          
          allLeads.push(...campaignLeads);
        } catch (err) {
          console.warn(`Failed to fetch leads for campaign ${campaign.id}:`, err);
        }
      }

      // Sort all leads by creation date
      allLeads.sort((a, b) => {
        const aTime = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });

      setLeads(allLeads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchLeads();
  }, [user, fetchLeads]);

  const filteredLeads = leads.filter(lead => {
    // Filter by status
    const statusMatch = filter === 'all' || lead.deliveryStatus === filter;
    
    // Filter by search term
    const searchMatch = !searchTerm || 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.businessType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.originalAddress.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
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

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'delivered':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed':
      case 'returned':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: string | undefined) => {
    switch (status) {
      case 'sent': return 'Sent';
      case 'delivered': return 'Delivered';
      case 'failed': return 'Failed';
      case 'returned': return 'Returned';
      case 'pending':
      default: return 'Pending';
    }
  };

  const handleLeadClick = (lead: LeadWithCampaign) => {
    router.push(`/v2/build/${lead.campaignId}/leads`);
  };

  const SkeletonRow: React.FC = () => (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-600/50 rounded w-3/4"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-600/50 rounded w-1/2"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-600/50 rounded w-full"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-600/50 rounded w-1/3"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-6 bg-gray-600/50 rounded w-16"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-600/50 rounded w-1/2"></div>
      </td>
    </tr>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-electric-teal">Campaign Leads</h2>
        </div>
        <div className="bg-charcoal/60 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-charcoal/80">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Business</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Address</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Campaign</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, index) => <SkeletonRow key={index} />)}
            </tbody>
          </table>
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
      {/* Header with search and filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold text-electric-teal">Campaign Leads</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 bg-charcoal border border-gray-700 text-white rounded-md text-sm
              focus:border-electric-teal focus:outline-none focus:ring-1 focus:ring-electric-teal"
          />
          
          {/* Filter buttons */}
          <div className="flex gap-2">
            {(['all', 'pending', 'sent', 'delivered', 'failed'] as const).map((filterType) => (
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
      </div>

      {/* Lead stats */}
      {leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-electric-teal">{leads.length}</div>
            <div className="text-sm text-gray-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-400">
              {leads.filter(l => !l.deliveryStatus || l.deliveryStatus === 'pending').length}
            </div>
            <div className="text-sm text-gray-400">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {leads.filter(l => l.deliveryStatus === 'sent').length}
            </div>
            <div className="text-sm text-gray-400">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {leads.filter(l => l.deliveryStatus === 'delivered').length}
            </div>
            <div className="text-sm text-gray-400">Delivered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {leads.filter(l => l.deliveryStatus === 'failed' || l.deliveryStatus === 'returned').length}
            </div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
        </div>
      )}

      {/* Leads table */}
      {filteredLeads.length === 0 ? (
        <div className="text-center p-8 bg-charcoal/50 rounded-md border border-electric-teal/20">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-electric-teal mb-2">
            {searchTerm || filter !== 'all' ? 'No Matching Leads' : 'No Leads Yet!'}
          </h3>
          <p className="text-gray-300 mb-4">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : "You haven't created any campaigns with leads yet."
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-electric-teal text-charcoal rounded-lg hover:bg-electric-teal/90 transition-colors"
            >
              Create Your First Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="bg-charcoal/60 rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-charcoal/80">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Business</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Address</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Campaign</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filteredLeads.map((lead) => (
                  <tr 
                    key={`${lead.campaignId}-${lead.id}`}
                    className="hover:bg-charcoal/40 cursor-pointer transition-colors"
                    onClick={() => handleLeadClick(lead)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white truncate max-w-[200px]">
                        {lead.name}
                      </div>
                      {lead.phone && (
                        <div className="text-xs text-gray-400">{lead.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-300">{lead.businessType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-300 truncate max-w-[250px]">
                        {lead.originalAddress}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-electric-teal hover:text-electric-teal/80">
                        {lead.campaignName}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(lead.deliveryStatus)}`}>
                        {getStatusText(lead.deliveryStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-400">
                        {formatDate(lead.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination info */}
      {filteredLeads.length > 0 && (
        <div className="text-center text-sm text-gray-400">
          Showing {filteredLeads.length} of {leads.length} leads
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}
    </div>
  );
};

export default V2Leads;
