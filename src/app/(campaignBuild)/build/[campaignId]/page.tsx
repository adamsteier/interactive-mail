'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';
import { Tabs } from '../../../../components/Tabs';

// Define Campaign type
interface Campaign {
  id: string;
  ownerUid: string;
  strategyId: string | null;
  campaignMode: 'one_off' | 'autopilot';
  status: string;
  productType: string;
  quantity: number;
  price: {
    tierApplied: string | null;
    unitCost: number | null;
    total: number | null;
    currency: string;
  };
  createdAt: Timestamp; // Properly typed Firestore timestamp
  updatedAt: Timestamp; // Properly typed Firestore timestamp
  typeStats: Record<string, { found: number; selected: number; sent: number }>;
  [key: string]: unknown;
}

const CampaignBuildPage: React.FC = () => {
  const params = useParams();
  const campaignId = params.campaignId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [activeTab, setActiveTab] = useState('leads');

  const TABS = [
    { id: 'leads', label: '1. Leads' },
    { id: 'design', label: '2. Design' },
    { id: 'schedule', label: '3. Schedule & Approve' },
  ];
  
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        
        const campaignRef = doc(db, 'campaigns', campaignId);
        const campaignSnap = await getDoc(campaignRef);
        
        if (campaignSnap.exists()) {
          setCampaign({
            id: campaignSnap.id,
            ...campaignSnap.data()
          } as Campaign);
        } else {
          setError('Campaign not found');
        }
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };
    
    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-charcoal text-electric-teal">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading Campaign...</h2>
          <div className="animate-pulse">
            <div className="h-4 bg-electric-teal/20 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-charcoal text-electric-teal">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-neon-magenta mb-4">Error</h2>
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-electric-teal text-charcoal rounded hover:bg-electric-teal/80"
            onClick={() => window.location.href = '/'}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6 bg-charcoal min-h-screen text-off-white">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-electric-teal mb-2">Build Your Campaign</h1>
        {campaign && (
          <p className="text-cool-gray text-sm">
            Campaign ID: {campaign.id} | Mode: <span className="capitalize">{campaign.campaignMode}</span> | Status: <span className="capitalize">{campaign.status}</span>
          </p>
        )}
      </header>
      
      <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
        <div id="leads-content">
          <h2 className="text-2xl font-semibold text-electric-teal mb-4">Manage Leads</h2>
          <div className="bg-cool-gray/20 p-6 rounded-lg border border-electric-teal/20">
            <p className="text-electric-teal/80">
              LeadTable component will be here. It will display leads for campaign: {campaign?.id}
            </p>
          </div>
        </div>
        
        <div id="design-content">
          <h2 className="text-2xl font-semibold text-electric-teal mb-4">Design Your Postcard</h2>
          <div className="bg-cool-gray/20 p-6 rounded-lg border border-electric-teal/20">
            <p className="text-electric-teal/80">
              Postcard design interface will be here.
            </p>
          </div>
        </div>
        
        <div id="schedule-content">
          <h2 className="text-2xl font-semibold text-electric-teal mb-4">Schedule & Approve</h2>
          <div className="bg-cool-gray/20 p-6 rounded-lg border border-electric-teal/20">
            <p className="text-electric-teal/80">
              Campaign scheduling, pricing, and approval steps will be here.
            </p>
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default CampaignBuildPage; 