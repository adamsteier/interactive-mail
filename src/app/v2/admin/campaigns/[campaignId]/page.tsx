'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FiArrowLeft, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';
import { format } from 'date-fns';
// Removed server-side imports - now using API routes

interface CampaignDetails {
  id: string;
  ownerUid: string;
  ownerEmail?: string;
  status: string;
  totalLeadCount: number;
  totalCost: number;
  createdAt: Timestamp;
  paidAt?: Timestamp;
  processedAt?: Timestamp;
  scheduledSendDate?: Timestamp;
  brandId?: string;
  brandName?: string;
  designAssignments?: Array<{
    designId: string;
    businessTypes: string[];
    leadCount: number;
  }>;
  pricing?: {
    originalAmount: number;
    refundedAmount?: number;
    finalAmount: number;
    stripePaymentIntentId?: string;
  };
  processingErrors?: string[];
  metadata?: Record<string, unknown>;
  contactInfo?: {
    email?: string | null;
    phone?: string | null;
    capturedAt?: Timestamp | Date | null;
  };
  isAnonymous?: boolean;
}

interface LeadData {
  id: string;
  businessName: string;
  address: string;
  businessType: string;
  assignedDesignId?: string;
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  geocodingStatus?: string;
  mailpieceId?: string;
  deliveryStatus?: string;
}

interface ProcessingLog {
  timestamp: Timestamp;
  status: string;
  message: string;
  error?: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params?.campaignId as string;
  
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    if (campaignId) {
      loadCampaignData();
    }
  }, [campaignId, loadCampaignData]);

  const loadCampaignData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load campaign document
      const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
      if (!campaignDoc.exists()) {
        console.error('Campaign not found');
        return;
      }
      
      const campaignData = campaignDoc.data() as CampaignDetails;
      campaignData.id = campaignDoc.id;
      setCampaign(campaignData);
      
      // Load leads
      const leadsSnapshot = await getDocs(
        query(collection(db, 'campaigns', campaignId, 'leads'))
      );
      const leadsData: LeadData[] = [];
      leadsSnapshot.forEach(doc => {
        leadsData.push({ id: doc.id, ...doc.data() } as LeadData);
      });
      setLeads(leadsData);
      
      // Load processing logs
      const logsSnapshot = await getDocs(
        query(
          collection(db, 'campaigns', campaignId, 'logs'),
          orderBy('timestamp', 'desc')
        )
      );
      const logsData: ProcessingLog[] = [];
      logsSnapshot.forEach(doc => {
        logsData.push(doc.data() as ProcessingLog);
      });
      setLogs(logsData);
      
    } catch (error) {
      console.error('Error loading campaign:', error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const handleRetryProcessing = async () => {
    if (!campaign || processing) return;
    
    try {
      setProcessing(true);
      
      // Call API route for campaign processing
      const response = await fetch('/api/v2/admin/retry-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        throw new Error('Failed to retry campaign');
      }
      
      // Reload campaign data
      await loadCampaignData();
      
    } catch (error) {
      console.error('Error retrying campaign:', error);
      alert('Failed to retry campaign processing');
    } finally {
      setProcessing(false);
    }
  };

  const handleForceStatus = async (newStatus: string) => {
    if (!campaign) return;
    
    const confirmed = confirm(`Are you sure you want to force status to "${newStatus}"?`);
    if (!confirmed) return;
    
    try {
      // Call API route for status update
      const response = await fetch('/api/v2/admin/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      await loadCampaignData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleRemoveLeads = async () => {
    if (!campaign || selectedLeads.length === 0) return;
    
    const confirmed = confirm(`Remove ${selectedLeads.length} leads and process refund?`);
    if (!confirmed) return;
    
    try {
      // Calculate refund amount
      const refundAmount = Math.round(
        (campaign.totalCost / campaign.totalLeadCount) * selectedLeads.length
      );
      
      // Call API route for refund request
      const response = await fetch('/api/v2/admin/refund-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId,
          userEmail: campaign.ownerEmail || campaign.ownerUid,
          originalAmount: campaign.totalCost,
          refundAmount,
          reason: `Removed ${selectedLeads.length} problematic leads`,
          affectedLeads: selectedLeads.length,
          totalLeads: campaign.totalLeadCount
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to queue refund request');
      }
      
      alert(`Refund request queued for $${(refundAmount / 100).toFixed(2)} CAD`);
      
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Failed to queue refund request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-400/20 text-green-400';
      case 'processing': return 'bg-yellow-400/20 text-yellow-400';
      case 'sent': return 'bg-electric-teal/20 text-electric-teal';
      case 'failed': return 'bg-red-400/20 text-red-400';
      case 'scheduled': return 'bg-blue-400/20 text-blue-400';
      default: return 'bg-gray-400/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-light-gray">Loading campaign details...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-400">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/v2/admin"
          className="inline-flex items-center text-electric-teal hover:text-white mb-4 transition-colors"
        >
          <FiArrowLeft className="mr-2" />
          Back to Dashboard
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Campaign Details
            </h1>
            <p className="text-light-gray font-mono">{campaignId}</p>
          </div>
          
          <div className={`px-4 py-2 rounded-lg font-medium ${getStatusColor(campaign.status)}`}>
            {campaign.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Campaign Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-light-gray mb-4">User Information</h3>
          <p className="text-white mb-2">{campaign.ownerEmail || 'No email'}</p>
          <p className="text-xs text-gray-500 font-mono mb-2">{campaign.ownerUid}</p>
          {campaign.isAnonymous && (
            <>
              <p className="text-xs text-electric-teal/60 mb-1">Anonymous User</p>
              {campaign.contactInfo && (
                <div className="mt-2 p-2 bg-dark-bg rounded">
                  <p className="text-xs text-light-gray">Guest Contact Info:</p>
                  {campaign.contactInfo.email && (
                    <p className="text-sm text-white">Email: {campaign.contactInfo.email}</p>
                  )}
                  {campaign.contactInfo.phone && (
                    <p className="text-sm text-white">Phone: {campaign.contactInfo.phone}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-light-gray mb-4">Campaign Details</h3>
          <p className="text-white mb-1">{campaign.totalLeadCount} leads</p>
          <p className="text-white mb-1">${(campaign.totalCost / 100).toFixed(2)} CAD</p>
          {campaign.brandName && (
            <p className="text-sm text-gray-400">Brand: {campaign.brandName}</p>
          )}
        </div>

        <div className="bg-charcoal rounded-lg p-6 border border-gray-800">
          <h3 className="text-sm font-medium text-light-gray mb-4">Timeline</h3>
          <div className="space-y-1 text-sm">
            <p className="text-white">
              Created: {campaign.createdAt && format(campaign.createdAt.toDate(), 'MMM d, h:mm a')}
            </p>
            {campaign.paidAt && (
              <p className="text-white">
                Paid: {format(campaign.paidAt.toDate(), 'MMM d, h:mm a')}
              </p>
            )}
            {campaign.scheduledSendDate && (
              <p className="text-white">
                Scheduled: {format(campaign.scheduledSendDate.toDate(), 'MMM d')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-charcoal rounded-lg p-6 border border-gray-800 mb-8">
        <h3 className="text-lg font-medium text-white mb-4">Admin Actions</h3>
        <div className="flex flex-wrap gap-3">
          {campaign.status === 'failed' && (
            <button
              onClick={handleRetryProcessing}
              disabled={processing}
              className="px-4 py-2 bg-electric-teal text-dark-bg font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50 flex items-center"
            >
              <FiRefreshCw className={`mr-2 ${processing ? 'animate-spin' : ''}`} />
              {processing ? 'Processing...' : 'Retry Processing'}
            </button>
          )}
          
          <button
            onClick={() => handleForceStatus('sent')}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Force Mark as Sent
          </button>
          
          <button
            onClick={() => handleForceStatus('failed')}
            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
          >
            Force Mark as Failed
          </button>
          
          {selectedLeads.length > 0 && (
            <button
              onClick={handleRemoveLeads}
              className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
            >
              Remove {selectedLeads.length} Leads & Refund
            </button>
          )}
        </div>
      </div>

      {/* Processing Errors */}
      {campaign.processingErrors && campaign.processingErrors.length > 0 && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-red-400 mb-4 flex items-center">
            <FiAlertCircle className="mr-2" />
            Processing Errors
          </h3>
          <ul className="space-y-2">
            {campaign.processingErrors.map((error, index) => (
              <li key={index} className="text-red-300 text-sm">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Leads Table */}
      <div className="bg-charcoal rounded-lg border border-gray-800 overflow-hidden mb-8">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-medium text-white">Campaign Leads</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-dark-bg">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeads(leads.map(l => l.id));
                      } else {
                        setSelectedLeads([]);
                      }
                    }}
                    className="rounded border-gray-600"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase">
                  Business
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase">
                  Design
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-light-gray uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-dark-bg transition-colors">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeads([...selectedLeads, lead.id]);
                        } else {
                          setSelectedLeads(selectedLeads.filter(id => id !== lead.id));
                        }
                      }}
                      className="rounded border-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4 text-sm text-white">
                    {lead.businessName}
                  </td>
                  <td className="px-6 py-4 text-sm text-light-gray">
                    {lead.address}
                  </td>
                  <td className="px-6 py-4 text-sm text-light-gray">
                    {lead.businessType}
                  </td>
                  <td className="px-6 py-4 text-sm text-light-gray">
                    {lead.assignedDesignId || 'None'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {lead.deliveryStatus ? (
                      <span className="text-electric-teal flex items-center">
                        <FiCheckCircle className="mr-1" />
                        {lead.deliveryStatus}
                      </span>
                    ) : lead.geocodingStatus === 'failed' ? (
                      <span className="text-red-400 flex items-center">
                        <FiAlertCircle className="mr-1" />
                        Geocoding Failed
                      </span>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Processing Logs */}
      <div className="bg-charcoal rounded-lg border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-lg font-medium text-white">Processing Logs</h3>
        </div>
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-400 text-sm">No processing logs yet</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="text-sm">
                <span className="text-gray-500">
                  {log.timestamp && format(log.timestamp.toDate(), 'MMM d, h:mm:ss a')}
                </span>
                <span className={`ml-2 ${log.error ? 'text-red-400' : 'text-light-gray'}`}>
                  [{log.status}] {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 