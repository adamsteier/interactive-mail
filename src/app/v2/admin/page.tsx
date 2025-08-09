'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FiAlertCircle, FiClock, FiCheckCircle, FiDollarSign } from 'react-icons/fi';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface CampaignSummary {
  id: string;
  ownerUid: string;
  ownerEmail?: string;
  status: string;
  totalLeadCount: number;
  totalCost: number;
  createdAt: Timestamp;
  scheduledSendDate?: Timestamp;
  brandName?: string;
  contactInfo?: {
    email?: string | null;
    phone?: string | null;
    capturedAt?: Timestamp | Date | null;
  };
  isAnonymous?: boolean;
}

interface DashboardStats {
  activeCampaigns: number;
  scheduledToday: number;
  failedCampaigns: number;
  awaitingReview: number;
  todayRevenue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    activeCampaigns: 0,
    scheduledToday: 0,
    failedCampaigns: 0,
    awaitingReview: 0,
    todayRevenue: 0,
  });
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load stats
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      // Query for different campaign states
      const activeQuery = query(
        collection(db, 'campaigns'),
        where('status', 'in', ['processing', 'pending_review'])
      );
      
      const scheduledTodayQuery = query(
        collection(db, 'campaigns'),
        where('scheduledSendDate', '>=', Timestamp.fromDate(startOfDay)),
        where('scheduledSendDate', '<', Timestamp.fromDate(endOfDay))
      );
      
      const failedQuery = query(
        collection(db, 'campaigns'),
        where('status', '==', 'failed')
      );
      
      const reviewQuery = query(
        collection(db, 'campaigns'),
        where('status', '==', 'pending_review')
      );

      // Execute queries
      const [activeSnap, scheduledSnap, failedSnap, reviewSnap] = await Promise.all([
        getDocs(activeQuery),
        getDocs(scheduledTodayQuery),
        getDocs(failedQuery),
        getDocs(reviewQuery),
      ]);

      // Calculate today's revenue
      let todayRevenue = 0;
      const todayQuery = query(
        collection(db, 'campaigns'),
        where('createdAt', '>=', Timestamp.fromDate(startOfDay)),
        where('status', 'in', ['paid', 'processing', 'sent'])
      );
      const todaySnap = await getDocs(todayQuery);
      todaySnap.forEach(doc => {
        todayRevenue += doc.data().totalCost || 0;
      });

      setStats({
        activeCampaigns: activeSnap.size,
        scheduledToday: scheduledSnap.size,
        failedCampaigns: failedSnap.size,
        awaitingReview: reviewSnap.size,
        todayRevenue,
      });

      // Load campaign list based on filter
      let campaignQuery;
      if (filter === 'all') {
        campaignQuery = query(
          collection(db, 'campaigns'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      } else {
        campaignQuery = query(
          collection(db, 'campaigns'),
          where('status', '==', filter),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
      }

      const campaignSnap = await getDocs(campaignQuery);
      const campaignList: CampaignSummary[] = [];
      
      for (const doc of campaignSnap.docs) {
        const data = doc.data();
        campaignList.push({
          id: doc.id,
          ownerUid: data.ownerUid,
          ownerEmail: data.ownerEmail,
          status: data.status,
          totalLeadCount: data.totalLeadCount || 0,
          totalCost: data.totalCost || 0,
          createdAt: data.createdAt,
          scheduledSendDate: data.scheduledSendDate,
          brandName: data.brandName,
          contactInfo: data.contactInfo,
          isAnonymous: data.isAnonymous,
        });
      }

      setCampaigns(campaignList);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadDashboardData();
  }, [filter, loadDashboardData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-400';
      case 'paid': return 'text-green-400';
      case 'processing': return 'text-yellow-400';
      case 'sent': return 'text-electric-teal';
      case 'failed': return 'text-red-400';
      case 'pending_review': return 'text-orange-400';
      case 'scheduled': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'failed': return <FiAlertCircle className="inline mr-1" />;
      case 'processing': 
      case 'pending_review': return <FiClock className="inline mr-1" />;
      case 'sent': return <FiCheckCircle className="inline mr-1" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-light-gray">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-light-gray">Monitor campaigns and system health</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-gray text-sm">Active Campaigns</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.activeCampaigns}</p>
            </div>
            <FiClock className="text-yellow-400 text-2xl" />
          </div>
        </div>

        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-gray text-sm">Scheduled Today</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.scheduledToday}</p>
            </div>
            <FiCheckCircle className="text-electric-teal text-2xl" />
          </div>
        </div>

        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-gray text-sm">Failed</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.failedCampaigns}</p>
            </div>
            <FiAlertCircle className="text-red-400 text-2xl" />
          </div>
        </div>

        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-gray text-sm">Awaiting Review</p>
              <p className="text-3xl font-bold text-white mt-1">{stats.awaitingReview}</p>
            </div>
            <FiClock className="text-orange-400 text-2xl" />
          </div>
        </div>

        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-gray text-sm">Today&apos;s Revenue</p>
              <p className="text-3xl font-bold text-white mt-1">
                ${(stats.todayRevenue / 100).toFixed(2)}
              </p>
            </div>
            <FiDollarSign className="text-green-400 text-2xl" />
          </div>
        </div>
      </div>

      {/* Campaign Filters */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {['all', 'paid', 'processing', 'scheduled', 'sent', 'failed', 'pending_review'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === filterOption
                  ? 'bg-electric-teal text-dark-bg'
                  : 'bg-charcoal text-light-gray hover:bg-cool-gray border border-gray-800'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-charcoal rounded-lg border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-dark-bg">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase tracking-wider">
                  Campaign ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase tracking-wider">
                  Leads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-dark-bg transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">
                    {campaign.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-light-gray">
                    <div className="flex flex-col">
                      <span>{campaign.ownerEmail || campaign.ownerUid.slice(0, 8) + '...'}</span>
                      {campaign.isAnonymous && campaign.contactInfo && (
                        <span className="text-xs text-electric-teal/60 mt-1">
                          Guest: {campaign.contactInfo.email || campaign.contactInfo.phone || 'No contact'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(campaign.status)}`}>
                      {getStatusIcon(campaign.status)}
                      {campaign.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {campaign.totalLeadCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    ${(campaign.totalCost / 100).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-light-gray">
                    {campaign.createdAt && formatDistanceToNow(campaign.createdAt.toDate(), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/v2/admin/campaigns/${campaign.id}`}
                      className="text-electric-teal hover:text-white transition-colors mr-3"
                    >
                      View
                    </Link>
                    {campaign.status === 'failed' && (
                      <button className="text-neon-magenta hover:text-white transition-colors">
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex gap-4">
        <button className="px-6 py-3 bg-electric-teal text-dark-bg font-medium rounded-lg hover:bg-white transition-colors">
          Export Campaign Data
        </button>
        <button className="px-6 py-3 bg-charcoal text-white font-medium rounded-lg hover:bg-cool-gray transition-colors border border-gray-800">
          Process Scheduled Campaigns
        </button>
      </div>

      {/* Creative Brief Analytics */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Creative Brief Analytics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-charcoal rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-light-gray text-sm">Total Briefs Generated</p>
                <p className="text-2xl font-bold text-white mt-1">--</p>
              </div>
              <svg className="w-6 h-6 text-electric-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <div className="bg-charcoal rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-light-gray text-sm">Most Used Temperature</p>
                <p className="text-2xl font-bold text-white mt-1">0.7</p>
                <p className="text-xs text-green-400">Balanced</p>
              </div>
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>

          <div className="bg-charcoal rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-light-gray text-sm">Brief Edit Rate</p>
                <p className="text-2xl font-bold text-white mt-1">23%</p>
                <p className="text-xs text-electric-teal">Users editing briefs</p>
              </div>
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>

          <div className="bg-charcoal rounded-lg p-4 border border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-light-gray text-sm">Top Industry</p>
                <p className="text-2xl font-bold text-white mt-1">Hair</p>
                <p className="text-xs text-neon-magenta">Most brief generations</p>
              </div>
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Temperature Performance */}
          <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
            <h3 className="text-white font-medium mb-4">Temperature Performance</h3>
            <div className="space-y-3">
              {[
                { temp: '0.5', label: 'Conservative', selected: '12%', success: '89%', color: 'text-blue-400' },
                { temp: '0.7', label: 'Balanced', selected: '45%', success: '92%', color: 'text-green-400' },
                { temp: '0.9', label: 'Creative', selected: '31%', success: '87%', color: 'text-yellow-400' },
                { temp: '1.1', label: 'Experimental', selected: '12%', success: '78%', color: 'text-red-400' }
              ].map((item) => (
                <div key={item.temp} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${item.color}`}>
                      {item.temp}
                    </span>
                    <span className="text-light-gray text-sm">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-light-gray">
                      Selected: <span className="text-white">{item.selected}</span>
                    </span>
                    <span className="text-light-gray">
                      Success: <span className="text-electric-teal">{item.success}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Performance */}
          <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
            <h3 className="text-white font-medium mb-4">AI Model Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-white font-medium">GPT-4.1 Turbo</p>
                    <p className="text-light-gray text-xs">Fast generation</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-electric-teal font-medium">23% selected</p>
                  <p className="text-light-gray text-xs">avg 8.2s generation</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-dark-bg rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <p className="text-white font-medium">GPT-4o</p>
                    <p className="text-light-gray text-xs">High quality</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-electric-teal font-medium">77% selected</p>
                  <p className="text-light-gray text-xs">avg 15.7s generation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 