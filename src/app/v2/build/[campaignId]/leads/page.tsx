'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, getDoc, collection, query, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
// import LoadingBar from '@/components/LoadingBar';
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
  const [, setCampaign] = useState<CampaignData | null>(null);
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // Enhanced filtering and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'businessType'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [ratingFilter, setRatingFilter] = useState<[number, number]>([0, 5]);
  const [showRatingFilter, setShowRatingFilter] = useState(false);

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

  // Cost calculation logic (from SelectionSummary)
  const calculateCost = (count: number) => {
    if (count < 100) return count * 2.25;
    if (count < 1000) return count * 1.75;
    return count * 1.50;
  };

  const campaignStats = useMemo(() => {
    const count = selectedLeadIds.size;
    const cost = calculateCost(count);
    const estimatedResponses = Math.ceil(count * 0.03);
    const pricePerCard = cost / count || 0;

    return {
      count,
      cost,
      estimatedResponses,
      pricePerCard
    };
  }, [selectedLeadIds]);

  const businessTypes = useMemo(() => {
    const types = [...new Set(leads.map(lead => lead.businessType).filter(Boolean))];
    return types.map(type => ({
      name: type,
      count: leads.filter(lead => lead.businessType === type).length,
      selectedCount: leads.filter(lead => lead.businessType === type && selectedLeadIds.has(lead.id)).length
    }));
  }, [leads, selectedLeadIds]);

  // Enhanced filtering and sorting
  const filteredAndSortedLeads = useMemo(() => {
    let filtered = leads;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Business type filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(lead => lead.businessType === activeFilter);
    }

    // Rating filter
    if (showRatingFilter) {
      filtered = filtered.filter(lead => {
        if (lead.rating === undefined) return false;
        return lead.rating >= ratingFilter[0] && lead.rating <= ratingFilter[1];
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.businessName.localeCompare(b.businessName);
          break;
        case 'rating':
          const aRating = a.rating || 0;
          const bRating = b.rating || 0;
          comparison = aRating - bRating;
          break;
        case 'businessType':
          comparison = a.businessType.localeCompare(b.businessType);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [leads, searchTerm, activeFilter, ratingFilter, showRatingFilter, sortBy, sortOrder]);

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
      const currentIndex = filteredAndSortedLeads.findIndex(p => p.id === leadId);
      const lastIndex = filteredAndSortedLeads.findIndex(p => p.id === lastSelectedId);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        
        setSelectedLeadIds(prev => {
          const newSet = new Set(prev);
          const isSelecting = !prev.has(leadId);
          for (let i = start; i <= end; i++) {
            if (filteredAndSortedLeads[i]?.id) {
              if (isSelecting) {
                newSet.add(filteredAndSortedLeads[i].id);
              } else {
                newSet.delete(filteredAndSortedLeads[i].id);
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
      filteredAndSortedLeads.forEach(lead => {
        if (select) {
          newSet.add(lead.id);
        } else {
          newSet.delete(lead.id);
        }
      });
      return newSet;
    });
  };

  const handleBulkSelectByType = (businessType: string, select = true) => {
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      leads.filter(lead => lead.businessType === businessType).forEach(lead => {
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
    <div className="min-h-screen bg-[#1A1A1A] lg:pr-80">
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
            
            <div className="text-right lg:hidden">
              <div className="bg-[#2F2F2F]/50 rounded-lg px-4 py-3 border border-[#00F0FF]/20">
                <div className="text-sm text-[#EAEAEA]/60 mb-1">Selected Leads</div>
                <div className="text-[#00F0FF] font-semibold text-xl">
                  {campaignStats.count} / {leads.length}
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

      {/* Enhanced Search and Sort Bar */}
      <div className="border-b border-[#00F0FF]/20 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search businesses or addresses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-[#2F2F2F]/50 border border-[#00F0FF]/20 rounded-lg 
                    text-[#EAEAEA] placeholder-[#EAEAEA]/40 focus:outline-none focus:border-[#00F0FF]"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-[#00F0FF]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-3">
              <label className="text-[#EAEAEA]/60 text-sm">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'rating' | 'businessType')}
                className="px-3 py-2 bg-[#2F2F2F]/50 border border-[#00F0FF]/20 rounded text-[#EAEAEA] focus:outline-none focus:border-[#00F0FF]"
              >
                <option value="name">Business Name</option>
                <option value="rating">Rating</option>
                <option value="businessType">Business Type</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 bg-[#2F2F2F]/50 border border-[#00F0FF]/20 rounded text-[#00F0FF] hover:bg-[#00F0FF]/10"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* Rating Filter Toggle */}
            {leads.some(l => l.rating) && (
              <button
                onClick={() => setShowRatingFilter(!showRatingFilter)}
                className={`px-3 py-2 rounded text-sm border transition-colors ${
                  showRatingFilter 
                    ? 'bg-[#00F0FF] text-[#1A1A1A] border-[#00F0FF]' 
                    : 'bg-[#2F2F2F]/50 text-[#00F0FF] border-[#00F0FF]/20 hover:bg-[#00F0FF]/10'
                }`}
              >
                Rating Filter
              </button>
            )}
          </div>

          {/* Rating Filter Slider */}
          {showRatingFilter && leads.some(l => l.rating) && (
            <div className="bg-[#2F2F2F]/30 rounded-lg p-4 border border-[#00F0FF]/20">
              <div className="flex items-center gap-4">
                <label className="text-[#EAEAEA]/60 text-sm">Rating Range:</label>
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <span className="text-[#00F0FF]">{ratingFilter[0]}</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={ratingFilter[0]}
                    onChange={(e) => setRatingFilter([parseFloat(e.target.value), ratingFilter[1]])}
                    className="flex-1"
                  />
                  <span className="text-[#00F0FF]">{ratingFilter[1]}</span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={ratingFilter[1]}
                    onChange={(e) => setRatingFilter([ratingFilter[0], parseFloat(e.target.value)])}
                    className="flex-1"
                  />
                </div>
                <div className="text-[#EAEAEA]/60 text-sm">
                  {filteredAndSortedLeads.length} results
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkSelectFiltered(true)}
                className="px-3 py-1 rounded text-xs border border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20"
              >
                Select All Visible ({filteredAndSortedLeads.length})
              </button>
              <button
                onClick={() => handleBulkSelectFiltered(false)}
                className="px-3 py-1 rounded text-xs border border-[#00F0FF]/50 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20"
              >
                Deselect All
              </button>
            </div>
            
            <div className="text-[#EAEAEA]/60 text-sm">
              Showing {filteredAndSortedLeads.length} of {leads.length} leads
            </div>
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
                    checked={filteredAndSortedLeads.length > 0 && filteredAndSortedLeads.every(lead => selectedLeadIds.has(lead.id))}
                  />
                </th>
                <th className="p-3">Name</th>
                <th className="p-3">Address</th>
                <th className="p-3">Type</th>
                {leads.some(l => l.rating) && <th className="p-3">Rating</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedLeads.map((lead) => (
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
          
          {filteredAndSortedLeads.length === 0 && (
            <div className="p-8 text-center text-[#EAEAEA]/60">
              No leads match your current filters.
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Sidebar */}
      <div className="hidden lg:block fixed right-0 top-0 h-full w-80 border-l-2 border-[#00F0FF] bg-[#1A1A1A]/95 backdrop-blur-sm p-6 pt-20 z-30 overflow-y-auto">
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-[#00F0FF]">Campaign Summary</h3>
          
          {/* Campaign Stats */}
          <div className="space-y-4">
            <div className="rounded-lg border border-[#00F0FF]/20 p-4">
              <div className="text-sm text-[#00F0FF]/60">Selected Leads</div>
              <div className="text-2xl font-medium text-[#00F0FF]">{campaignStats.count}</div>
            </div>

            <div className="rounded-lg border border-[#00F0FF]/20 p-4">
              <div className="text-sm text-[#00F0FF]/60">Price Per Postcard</div>
              <div className="text-2xl font-medium text-[#00F0FF]">
                ${campaignStats.pricePerCard.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg border border-[#00F0FF]/20 p-4">
              <div className="text-sm text-[#00F0FF]/60">Total Campaign Cost</div>
              <div className="text-2xl font-medium text-[#00F0FF]">
                ${campaignStats.cost.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg border border-[#00F0FF]/20 p-4">
              <div className="text-sm text-[#00F0FF]/60">Estimated Responses</div>
              <div className="text-2xl font-medium text-[#00F0FF]">
                {campaignStats.estimatedResponses}
              </div>
              <div className="text-sm text-[#00F0FF]/60">
                Based on 3% response rate
              </div>
            </div>
          </div>

          {/* Business Types */}
          <div className="rounded-lg border border-[#00F0FF]/20 p-4">
            <h4 className="text-lg font-medium text-[#00F0FF] mb-4">Business Types</h4>
            <div className="space-y-3">
              <div 
                className={`p-3 rounded cursor-pointer transition-colors ${
                  activeFilter === 'all' ? 'bg-[#00F0FF]/20' : 'hover:bg-[#00F0FF]/10'
                }`}
                onClick={() => setActiveFilter('all')}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[#EAEAEA]">All Types</span>
                  <span className="text-[#00F0FF]">{leads.length}</span>
                </div>
              </div>
              
              {businessTypes.map(type => (
                <div 
                  key={type.name}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    activeFilter === type.name ? 'bg-[#00F0FF]/20' : 'hover:bg-[#00F0FF]/10'
                  }`}
                  onClick={() => setActiveFilter(type.name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#EAEAEA] text-sm">{type.name}</span>
                    <span className="text-[#00F0FF]">{type.count}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#EAEAEA]/60">
                      {type.selectedCount} selected
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBulkSelectByType(type.name, true);
                        }}
                        className="px-2 py-1 text-xs bg-[#00F0FF]/10 text-[#00F0FF] rounded hover:bg-[#00F0FF]/20"
                      >
                        All
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBulkSelectByType(type.name, false);
                        }}
                        className="px-2 py-1 text-xs bg-[#00F0FF]/10 text-[#00F0FF] rounded hover:bg-[#00F0FF]/20"
                      >
                        None
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleSaveAndContinue}
            disabled={saving || campaignStats.count === 0}
            className="w-full px-6 py-3 bg-[#00F0FF] text-[#1A1A1A] rounded-lg font-semibold 
              hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.5)]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Continue to Brand Selection'}
          </button>
        </div>
      </div>

      {/* Mobile Bottom Actions */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1A1A1A]/95 backdrop-blur-sm border-t border-[#00F0FF]/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-[#00F0FF]/60">Selected</div>
            <div className="text-xl font-medium text-[#00F0FF]">{campaignStats.count}</div>
          </div>
          <div>
            <div className="text-sm text-[#00F0FF]/60">Total Cost</div>
            <div className="text-xl font-medium text-[#00F0FF]">
              ${campaignStats.cost.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-[#00F0FF]/60">Est. Responses</div>
            <div className="text-xl font-medium text-[#00F0FF]">
              {campaignStats.estimatedResponses}
            </div>
          </div>
        </div>
        
        <button
          onClick={handleSaveAndContinue}
          disabled={saving || campaignStats.count === 0}
          className="w-full px-6 py-3 bg-[#00F0FF] text-[#1A1A1A] rounded-lg font-semibold 
            hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.5)]
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Continue to Brand Selection'}
        </button>
      </div>
    </div>
  );
} 