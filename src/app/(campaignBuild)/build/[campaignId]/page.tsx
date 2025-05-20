'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../../services/firebase';

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
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading Campaign...</h2>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => window.location.href = '/'}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Build Your Campaign</h1>
      
      {campaign && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Campaign Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 mb-2">Campaign ID</p>
              <p className="font-medium">{campaign.id}</p>
            </div>
            
            <div>
              <p className="text-gray-600 mb-2">Mode</p>
              <p className="font-medium capitalize">{campaign.campaignMode}</p>
            </div>
            
            <div>
              <p className="text-gray-600 mb-2">Status</p>
              <p className="font-medium capitalize">{campaign.status}</p>
            </div>
            
            <div>
              <p className="text-gray-600 mb-2">Selected Leads</p>
              <p className="font-medium">{campaign.quantity}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-8">
        {/* Lead Selection Component will be added here */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Leads</h2>
          <p className="text-gray-500">
            This is where leads will be displayed and can be further refined.
          </p>
        </div>
        
        {/* Design Component will be added here */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Design Your Postcard</h2>
          <p className="text-gray-500">
            Postcard design options will be available here.
          </p>
        </div>
        
        {/* Approval Component will be added here */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4">Review & Approve</h2>
          <p className="text-gray-500">
            Review your campaign details and approve for sending.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CampaignBuildPage; 