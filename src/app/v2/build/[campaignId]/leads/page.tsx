'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, query, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import LoadingBar from '@/components/LoadingBar';
import CampaignProgress from '@/v2/components/CampaignProgress';

// Define the params type for Next.js 15
type Params = Promise<{ campaignId: string }>;

interface LeadData {
  id: string;
  campaignId: string;
  placeId: string;
  businessName: string;
  address: string;
  phoneNumber?: string;
  website?: string;
  businessType: string;
  selected: boolean;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  relevanceScore?: number;
}

interface CampaignData {
  id: string;
  ownerUid: string;
  status: string;
  totalLeadCount: number;
  selectedLeadCount: number;
  businessTypes: string[];
  businessData?: {
    targetArea?: string;
    businessName?: string;
  };
}

export default function CampaignLeadsPage({ params }: { params: Params }) {
  const router = useRouter();
  const { user } = useAuth();
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Load params and campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.campaignId;
        setCampaignId(id);

        if (!id || !user?.uid) {
          setLoading(false);
          return;
        }

        // Load campaign document
        const campaignRef = doc(db, 'campaigns', id);
        const campaignSnap = await getDoc(campaignRef);

        if (!campaignSnap.exists()) {
          throw new Error('Campaign not found');
        }

        const data = campaignSnap.data();
        
        // Verify ownership
        if (data.ownerUid !== user.uid) {
          throw new Error('Unauthorized access to campaign');
        }

        setCampaign({
          id: campaignSnap.id,
          ownerUid: data.ownerUid,
          status: data.status,
          totalLeadCount: data.totalLeadCount || 0,
          selectedLeadCount: data.selectedLeadCount || 0,
          businessTypes: data.businessTypes || [],
          businessData: data.businessData
        });

        // Set up leads listener
        const leadsRef = collection(db, 'campaigns', id, 'leads');
        const leadsQuery = query(leadsRef);

        const unsubscribe = onSnapshot(leadsQuery, (querySnapshot) => {
          const fetchedLeads: LeadData[] = [];
          const initialSelected = new Set<string>();
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const lead: LeadData = {
              id: doc.id,
              campaignId: id,
              placeId: data.placeId,
              businessName: data.businessName,
              address: data.address,
              phoneNumber: data.phoneNumber,
              website: data.website,
              businessType: data.businessType,
              selected: data.selected || false,
              location: data.location,
              rating: data.rating,
              relevanceScore: data.relevanceScore
            };
            
            fetchedLeads.push(lead);
            if (lead.selected) {
              initialSelected.add(lead.id);
            }
          });
          
          fetchedLeads.sort((a, b) => a.businessName.localeCompare(b.businessName));
          setLeads(fetchedLeads);
          setSelectedLeadIds(initialSelected);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (err) {
        console.error('Error loading campaign:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
        setLoading(false);
      }
    };

    loadCampaign();
  }, [params, user?.uid]);

  const businessTypes = [...new Set(leads.map(lead => lead.businessType).filter(Boolean))];
  const filteredLeads = activeFilter === 'all' 
    ? leads 
    : leads.filter(lead => lead.businessType === activeFilter);

  const handleSelectLead = (leadId: string, shiftKey: boolean) => {
    if (!shiftKey || !lastSelectedId) {
      setSelectedLeadIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(leadId)) {
          newSet.delete(leadId);
        } else {
          newSet.add(leadId);
        }
        setLastSelectedId(leadId);
        return newSet;
      });
    } else {
      const currentIndex = filteredLeads.findIndex(p => p.id === leadId);
      const lastIndex = filteredLeads.findIndex(p => p.id === lastSelectedId);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        
        setSelectedLeadIds(prev => {
          const newSet = new Set(prev);
          const isSelecting = !prev.has(leadId);
          for (let i = start; i <= end; i++) {
            if (filteredLeads[i]?.id) {
              if (isSelecting) {
                newSet.add(filteredLeads[i].id);
              } else {
                newSet.delete(filteredLeads[i].id);
              }
            }
          }
          return newSet;
        });
      }
    }
  };

  const handleBulkSelectFiltered = (select = true) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      filteredLeads.forEach(lead => {
        if (select) {
          newSet.add(lead.id);
        } else {
          newSet.delete(lead.id);
        }
      });
      return newSet;
    });
  };

  const handleSaveAndContinue = async () => {
    if (!campaignId) return;
    
    setSaving(true);
    setError(null);

    try {
      // Update all lead selections
      const updatePromises: Promise<void>[] = [];
      
      // Update selected leads
      for (const leadId of selectedLeadIds) {
        const leadRef = doc(db, 'campaigns', campaignId, 'leads', leadId);
        updatePromises.push(updateDoc(leadRef, { 
          selected: true,
          selectedAt: serverTimestamp()
        }));
      }
      
      // Update unselected leads
      const unselectedLeads = leads.filter(lead => !selectedLeadIds.has(lead.id));
      for (const lead of unselectedLeads) {
        const leadRef = doc(db, 'campaigns', campaignId, 'leads', lead.id);
        updatePromises.push(updateDoc(leadRef, { 
          selected: false,
          selectedAt: null
        }));
      }

      await Promise.all(updatePromises);
      
      // Update campaign summary
      const campaignRef = doc(db, 'campaigns', campaignId);
      await updateDoc(campaignRef, {
        status: 'leads_selected',
        selectedLeadCount: selectedLeadIds.size,
        totalLeadCount: selectedLeadIds.size,
        quantity: selectedLeadIds.size,
        updatedAt: serverTimestamp()
      });

      // Navigate to brand selection
      router.push(`/v2/build/${campaignId}/brand`);
    } catch (err) {
      console.error('Error saving selections:', err);
      setError('Failed to save selections. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative mb-6">
            <div className="flex space-x-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-8 bg-[#00F0FF] rounded-full"
                  animate={{
                    scaleY: [0.5, 1.5, 0.5],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </div>
          <p className="text-[#00F0FF] text-lg font-medium">
            Loading your leads...
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#00F0FF] text-[#1A1A1A] px-6 py-3 rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Header */}
      <div className="border-b border-[#00F0FF]/20 bg-[#1A1A1A]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#EAEAEA] mb-1">
                AI Campaign Builder
              </h1>
              <p className="text-[#EAEAEA]/60">
                Step 1 of 5: Select your leads
              </p>
            </div>
            
            <div className="text-right">
              <div className="bg-[#2F2F2F]/50 rounded-lg px-4 py-3 border border-[#00F0FF]/20">
                <div className="text-sm text-[#EAEAEA]/60 mb-1">Selected Leads</div>
                <div className="text-[#00F0FF] font-semibold text-xl">
                  {selectedLeadIds.size} / {leads.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {campaignId && (
        <CampaignProgress currentStep={1} campaignId={campaignId} />
      )}

      {/* Filters */}
      <div className="border-b border-[#00F0FF]/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`rounded px-3 py-1 text-sm ${
                activeFilter === 'all' 
                  ? 'bg-[#00F0FF] text-[#1A1A1A] font-medium' 
                  : 'text-[#00F0FF] hover:bg-[#00F0FF]/10'
              }`}
            >
              All ({leads.length})
            </button>
            {businessTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`rounded px-3 py-1 text-sm ${
                  activeFilter === type 
                    ? 'bg-[#00F0FF] text-[#1A1A1A] font-medium' 
                    : 'text-[#00F0FF] hover:bg-[#00F0FF]/10'
                }`}
              >
                {type} ({leads.filter(p => p.businessType === type).length})
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkSelectFiltered(true)}
              className="px-3 py-1 rounded text-xs border border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20"
            >
              Select All Visible
            </button>
            <button
              onClick={() => handleBulkSelectFiltered(false)}
              className="px-3 py-1 rounded text-xs border border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20"
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-[#2F2F2F]/30 rounded-lg border border-[#00F0FF]/20 overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#2F2F2F]/50">
              <tr className="text-left text-[#00F0FF]/60">
                <th className="p-3 w-10">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-2 border-[#00F0FF] text-[#00F0FF] 
                      focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-0 
                      bg-transparent checked:bg-[#00F0FF]"
                    onChange={(e) => handleBulkSelectFiltered(e.target.checked)} 
                    checked={filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeadIds.has(lead.id))}
                  />
                </th>
                <th className="p-3">Name</th>
                <th className="p-3">Address</th>
                <th className="p-3">Type</th>
                {leads.some(l => l.rating) && <th className="p-3">Rating</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`text-[#EAEAEA]/80 hover:bg-[#00F0FF]/5 cursor-pointer border-t border-[#00F0FF]/10 ${
                    selectedLeadIds.has(lead.id) ? 'bg-[#00F0FF]/10' : ''
                  }`}
                  onClick={(e) => handleSelectLead(lead.id, e.shiftKey)}
                >
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.has(lead.id)}
                      onChange={() => handleSelectLead(lead.id, false)}
                      className="w-5 h-5 rounded border-2 border-[#00F0FF] text-[#00F0FF] 
                        focus:ring-2 focus:ring-[#00F0FF] focus:ring-offset-0 
                        bg-transparent checked:bg-[#00F0FF]"
                    />
                  </td>
                  <td className="p-3 font-medium text-white">{lead.businessName}</td>
                  <td className="p-3">{lead.address}</td>
                  <td className="p-3">{lead.businessType}</td>
                  {leads.some(l => l.rating) && (
                    <td className="p-3">{lead.rating || 'N/A'}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1A1A1A]/95 backdrop-blur-sm border-t border-[#00F0FF]/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-[#EAEAEA]">
            <span className="text-[#00F0FF] font-semibold">{selectedLeadIds.size}</span> leads selected
            {selectedLeadIds.size > 0 && (
              <span className="text-[#EAEAEA]/60 ml-2">
                • Estimated cost: ${(selectedLeadIds.size * 0.79).toFixed(2)} CAD
              </span>
            )}
          </div>
          
          <button
            onClick={handleSaveAndContinue}
            disabled={saving || selectedLeadIds.size === 0}
            className="px-6 py-3 bg-[#00F0FF] text-[#1A1A1A] rounded-lg font-semibold 
              hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.5)]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Continue to Brand Selection'}
          </button>
        </div>
      </div>
    </div>
  );
} 