'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import SelectionSummary from './SelectionSummary';
import { useMarketingStore } from '@/store/marketingStore';
import LoadingBar from './LoadingBar';
import { CampaignLead } from '@/lib/campaignService';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createCampaign, navigateToCampaignBuild, CampaignMode, LeadData } from '@/services/campaignService';
import AnonymousUserPrompt from './AnonymousUserPrompt';
import EmailCaptureModal from './EmailCaptureModal';
import { useAuth } from '@/contexts/AuthContext';
import { showAuthOverlay } from '@/lib/auth';

interface DisplayCampaignLead extends CampaignLead {
    rating?: number | null;
    relevanceScore?: number | null;
}

interface PlacesLeadsCollectionProps {
  onClose: () => void;
}

const PlacesLeadsCollection: React.FC<PlacesLeadsCollectionProps> = ({ onClose }) => {
  const campaignId = useMarketingStore(state => state.currentCampaign?.id ?? null);
  const isLoadingSearch = useMarketingStore(state => state.searchResults.isLoading);
  const progress = useMarketingStore(state => state.searchResults.progress);
  const { isAnonymous } = useAuth();

  const [leads, setLeads] = useState<DisplayCampaignLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState<boolean>(true);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const [searchFinalized, setSearchFinalized] = useState<boolean>(false);
  const [isUpdatingSelection, setIsUpdatingSelection] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // New state for account prompts
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [hasSeenSoftPrompt, setHasSeenSoftPrompt] = useState(false);

  useEffect(() => {
    if (!campaignId) {
        console.log("No campaignId, waiting...");
        setIsLoadingLeads(false);
        setLeads([]);
        setSelectedLeadIds(new Set());
        setSearchFinalized(false);
        return;
    }

    console.log(`Setting up Firestore listener for campaignLeads, campaignId: ${campaignId}`);
    setIsLoadingLeads(true);

    const leadsQuery = query(
      collection(db, 'campaignLeads'),
      where('campaignId', '==', campaignId)
    );

    const unsubscribe = onSnapshot(leadsQuery, (querySnapshot) => {
      console.log(`Firestore snapshot received for campaign ${campaignId}, docs: ${querySnapshot.size}`);
      const fetchedLeads: DisplayCampaignLead[] = [];
      const initialSelected = new Set<string>();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
         const createdAtTimestamp = data.createdAt instanceof Timestamp ? data.createdAt : null;

         const leadDoc: DisplayCampaignLead = {
             id: doc.id,
             campaignId: data.campaignId,
             placeId: data.placeId,
             businessName: data.businessName,
             address: data.address,
             phoneNumber: data.phoneNumber,
             website: data.website,
             businessType: data.businessType,
             selected: data.selected,
             location: data.location,
             contacted: data.contacted,
             notes: data.notes,
             createdAt: createdAtTimestamp,
             ...(data.rating !== undefined && { rating: data.rating }),
             ...(data.relevanceScore !== undefined && { relevanceScore: data.relevanceScore }),
         };

         if (!leadDoc.businessName) {
            console.warn("Skipping lead doc due to missing business name:", doc.id, data);
            return;
         }

         fetchedLeads.push(leadDoc);
         if (leadDoc.selected) {
            initialSelected.add(leadDoc.id!);
         }
      });
      
      fetchedLeads.sort((a, b) => a.businessName.localeCompare(b.businessName));
      setLeads(fetchedLeads);
      setSelectedLeadIds(initialSelected); 
      setSearchFinalized(!isLoadingSearch);
      setIsLoadingLeads(false);
    }, (err) => {
      console.error(`Error fetching leads snapshot for campaign ${campaignId}:`, err);
      setUpdateError("Failed to load leads in real-time. Please try refreshing.");
      setIsLoadingLeads(false);
    });

    return () => {
        console.log(`Cleaning up Firestore listener for campaign ${campaignId}`);
        unsubscribe();
    };
  }, [campaignId, isLoadingSearch]);

  useEffect(() => {
      if (!isLoadingSearch) {
          setSearchFinalized(true);
      }
  }, [isLoadingSearch]);

  const businessTypes = useMemo(() => {
    const types = new Set(leads.map(lead => lead.businessType).filter(Boolean));
    return Array.from(types);
  }, [leads]);

  const filteredLeads: DisplayCampaignLead[] = useMemo(() => {
    return activeFilter === 'all' 
      ? leads 
      : leads.filter(lead => lead.businessType === activeFilter);
  }, [leads, activeFilter]);

  const handleSelectLead = (leadId: string, shiftKey: boolean) => {
    if (isUpdatingSelection || !searchFinalized) return;

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
                 newSet.add(filteredLeads[i].id!);
              } else {
                 newSet.delete(filteredLeads[i].id!);
              }
            }
          }
          return newSet;
        });
      }
    }
    setUpdateError(null);
  };

  const handleBulkSelectFiltered = (select = true) => {
    if (isUpdatingSelection || !searchFinalized) return;
    setSelectedLeadIds(prev => {
      const newSet = new Set(prev);
      filteredLeads.forEach(lead => {
        if (select) {
            newSet.add(lead.id!);
        } else {
            newSet.delete(lead.id!);
        }
      });
      return newSet;
    });
     setUpdateError(null);
  };

  const handleStopSearch = () => {
      console.log("User requested stop search.");
      setSearchFinalized(true);
  };

  // Show soft prompt after leads are loaded (once per session)
  useEffect(() => {
    if (!isLoadingLeads && leads.length > 0 && isAnonymous && !hasSeenSoftPrompt && !showAccountPrompt) {
      const timer = setTimeout(() => {
        setShowAccountPrompt(true);
        setHasSeenSoftPrompt(true);
      }, 3000); // Show after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isLoadingLeads, leads.length, isAnonymous, hasSeenSoftPrompt, showAccountPrompt]);

  const handleConfirmSelection = async () => {
      if (selectedLeadIds.size === 0) {
          if (!confirm("You haven't selected any leads. Do you still want to proceed?")) {
              return;
          }
      }

      // Check if user is anonymous and show medium prompt
      if (isAnonymous) {
          setShowAccountPrompt(true);
          return;
      }

      // Call the internal handler
      handleConfirmSelectionInternal();
  };

  const handleCreateAccount = () => {
      setShowAccountPrompt(false);
      showAuthOverlay();
  };

  const handleContinueAsGuest = () => {
      setShowAccountPrompt(false);
      if (hasSeenSoftPrompt) {
          // If they've already dismissed the soft prompt, show email capture
          setShowEmailCapture(true);
      } else {
          // Otherwise, continue with the selection
          handleConfirmSelectionInternal();
      }
  };

  const handleConfirmSelectionInternal = async () => {
      setIsUpdatingSelection(true);
      setUpdateError(null);

      try {
          // Convert the leads array to the format expected by the Cloud Function
          const allFoundLeadsData: LeadData[] = leads.map(lead => ({
              searchBusinessType: lead.businessType || 'Unknown',
              aiReasoning: 'N/A',
              
              googlePlaceId: lead.placeId,
              googleBusinessName: lead.businessName,
              googleFormattedAddress: lead.address,
              googleTypes: lead.businessType ? [lead.businessType] : [],
              googlePhoneNumber: lead.phoneNumber,
              googleWebsite: lead.website,
              googleRating: lead.rating === null ? undefined : lead.rating,
          }));

          // Get selected place IDs as an array
          const selectedPlaceIds = Array.from(selectedLeadIds);

          // Get strategy ID from the marketing store if available - a simple identifier is fine
          const strategyId = null; // We'll implement proper strategy ID handling later

          // Call the Cloud Function (one-off mode for now)
          const result = await createCampaign(
              allFoundLeadsData,
              selectedPlaceIds,
              strategyId,
              CampaignMode.ONE_OFF
          );

          console.log("Campaign created:", result);

          // Navigate to the campaign build page
          navigateToCampaignBuild(result.campaignId);
      } catch (err) {
          console.error("Error creating campaign:", err);
          const message = err instanceof Error ? err.message : "Unknown error";
          setUpdateError(`Failed to create campaign: ${message}. Please try again.`);
      } finally {
          setIsUpdatingSelection(false);
      }
  };

  const showRatingColumn = leads.some(l => l.rating !== undefined);
  const showScoreColumn = leads.some(l => l.relevanceScore !== undefined);

  return (
    <div className="min-h-screen bg-charcoal p-2 sm:p-4">
      {/* Anonymous user prompt banner (soft ask) */}
      {isAnonymous && leads.length > 0 && !hasSeenSoftPrompt && (
        <div className="mb-4">
          <AnonymousUserPrompt
            stage="soft"
            onCreateAccount={handleCreateAccount}
            onContinueAnonymous={() => setHasSeenSoftPrompt(true)}
          />
        </div>
      )}

      <div className="rounded-lg border-2 border-electric-teal bg-charcoal shadow-glow flex flex-col max-h-[95vh]">
        <div className="border-b border-electric-teal/20 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 flex-shrink-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-electric-teal">
                Leads Found ({leads.length}) 
                {(isLoadingLeads && leads.length === 0) && <span> - Initializing...</span>}
                {isLoadingSearch && !searchFinalized && <span> - Searching...</span>}
            </h2>
            <button onClick={onClose} className="text-electric-teal hover:text-electric-teal/80">
                Close
            </button>
        </div>

        {isLoadingSearch && !searchFinalized && <LoadingBar progress={progress} />} 

        <div className="border-b border-electric-teal/20 p-3 flex-shrink-0">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-electric-teal/80 text-sm">Quick Select:</span>
                <button
                  onClick={() => handleBulkSelectFiltered(true)}
                  disabled={!searchFinalized || isUpdatingSelection}
                  className="px-3 py-1 rounded text-xs border border-electric-teal/50 bg-electric-teal/10 text-electric-teal hover:bg-electric-teal/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Select All ({filteredLeads.length})
                </button>
                <button
                  onClick={() => handleBulkSelectFiltered(false)}
                   disabled={!searchFinalized || isUpdatingSelection}
                  className="px-3 py-1 rounded text-xs border border-electric-teal/50 bg-electric-teal/10 text-electric-teal hover:bg-electric-teal/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Deselect All
                </button>
            </div>
            {isLoadingSearch && !searchFinalized && (
                <button
                    onClick={handleStopSearch}
                    className="px-4 py-1.5 rounded bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-semibold transition-colors"
                >
                    Stop Search
                </button>
            )}
          </div>
           {updateError && <p className="text-xs text-red-400 mt-2">{updateError}</p>}
        </div>

        <div className="border-b border-electric-teal/20 p-2 overflow-x-auto flex-shrink-0">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveFilter('all')}
              className={`rounded px-3 py-1 text-sm ${
                activeFilter === 'all' 
                  ? 'bg-electric-teal text-charcoal font-medium' 
                  : 'text-electric-teal hover:bg-electric-teal/10'
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
                    ? 'bg-electric-teal text-charcoal font-medium' 
                    : 'text-electric-teal hover:bg-electric-teal/10'
                }`}
              >
                {type} ({leads.filter(p => p.businessType === type).length})
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 overflow-auto flex-grow">
          {isLoadingLeads && leads.length === 0 ? (
             <table className="w-full min-w-[700px]">
                 <thead className="sticky top-0 z-10 bg-charcoal">
                      <tr className="text-left text-electric-teal/60">
                          <th className="p-2 w-10"></th>
                          <th className="p-2 w-1/4">Name</th>
                          <th className="p-2 w-1/3">Address</th>
                          <th className="p-2 w-1/6">Type</th>
                          {showRatingColumn && <th className="p-2 w-16">Rating</th>}
                          {showScoreColumn && <th className="p-2 w-16">Score</th>}
                      </tr>
                  </thead>
                  <tbody>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <tr key={`loading-${i}`} className="animate-pulse">
                            <td className="p-2"><div className="h-4 w-4 bg-electric-teal/20 rounded" /></td>
                            <td className="p-2"><div className="h-4 w-48 bg-electric-teal/20 rounded" /></td>
                            <td className="p-2"><div className="h-4 w-64 bg-electric-teal/20 rounded" /></td>
                            <td className="p-2"><div className="h-4 w-32 bg-electric-teal/20 rounded" /></td>
                            {showRatingColumn && <td className="p-2"><div className="h-4 w-16 bg-electric-teal/20 rounded" /></td>}
                            {showScoreColumn && <td className="p-2"><div className="h-4 w-16 bg-electric-teal/20 rounded" /></td>}
                        </tr>
                      ))}
                  </tbody>
              </table>
          ) : filteredLeads.length === 0 ? (
              <p className="text-center text-gray-400 italic py-6">
                  {activeFilter === 'all' ? 'No leads found yet.' : `No ${activeFilter} leads found.`}
              </p>
          ) : (
             <table className="w-full min-w-[700px]">
                <thead className="sticky top-0 z-10 bg-charcoal">
                    <tr className="text-left text-electric-teal/60">
                      <th className="p-2 w-10">
                           <input 
                              type="checkbox" 
                              disabled={!searchFinalized || isUpdatingSelection || filteredLeads.length === 0}
                              className="rounded border-electric-teal text-electric-teal focus:ring-electric-teal disabled:opacity-50"
                              onChange={(e) => handleBulkSelectFiltered(e.target.checked)} 
                              checked={filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeadIds.has(lead.id!))}
                            /> 
                      </th>
                      <th className="p-2 w-1/4">Name</th>
                      <th className="p-2 w-1/3">Address</th>
                      <th className="p-2 w-1/6">Type</th>
                      {showRatingColumn && <th className="p-2 w-16">Rating</th>}
                      {showScoreColumn && <th className="p-2 w-16">Score</th>}
                    </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className={`text-electric-teal/80 hover:bg-electric-teal/5 cursor-pointer ${selectedLeadIds.has(lead.id!) ? 'bg-electric-teal/10' : ''}`}
                      onClick={(e) => handleSelectLead(lead.id!, e.shiftKey)}
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.has(lead.id!)}
                          onChange={(e) => {
                              e.stopPropagation(); 
                              handleSelectLead(lead.id!, e.target.checked)
                          }}
                          className="rounded border-electric-teal text-electric-teal focus:ring-electric-teal"
                          disabled={!searchFinalized || isUpdatingSelection}
                        />
                      </td>
                      <td className="p-2 break-words font-medium text-white">{lead.businessName}</td>
                      <td className="p-2 break-words">{lead.address}</td>
                      <td className="p-2 break-words">{lead.businessType}</td>
                      {showRatingColumn && 
                          <td className="p-2">{lead.rating ?? 'N/A'}</td>
                      }
                      {showScoreColumn && (
                         <td className="p-2">
                           <div className="flex items-center">
                             <div className={`h-1.5 w-1.5 rounded-full mr-1 ${ 
                               lead.relevanceScore && lead.relevanceScore >= 15 ? 'bg-green-500' :
                               lead.relevanceScore && lead.relevanceScore >= 10 ? 'bg-yellow-500' :
                               'bg-orange-500'
                             }`} /> 
                             {lead.relevanceScore ?? 'N/A'}
                           </div>
                         </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-electric-teal/20 mt-auto">
            <SelectionSummary
                selectedPlaces={selectedLeadIds}
                onStartCampaign={handleConfirmSelection}
            />
        </div>
      </div>

      {/* Medium prompt modal when confirming selection */}
      {showAccountPrompt && hasSeenSoftPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-w-md mx-4">
            <AnonymousUserPrompt
              stage="medium"
              onCreateAccount={handleCreateAccount}
              onContinueAnonymous={handleContinueAsGuest}
            />
          </div>
        </div>
      )}

      {/* Email capture modal */}
      <EmailCaptureModal
        isOpen={showEmailCapture}
        onClose={() => {
          setShowEmailCapture(false);
          handleConfirmSelectionInternal();
        }}
        onComplete={() => {
          setShowEmailCapture(false);
          handleConfirmSelectionInternal();
        }}
        campaignId={campaignId || undefined}
      />
    </div>
  );
};

export default PlacesLeadsCollection; 