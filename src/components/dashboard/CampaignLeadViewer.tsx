// src/components/dashboard/CampaignLeadViewer.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { CampaignLead, getCampaignLeads, batchUpdateLeads } from '@/lib/campaignService'; // Assuming path
// TODO: Add styling imports or setup

interface CampaignLeadViewerProps {
  campaignId: string;
}

const CampaignLeadViewer: React.FC<CampaignLeadViewerProps> = ({ campaignId }) => {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // State to track which leads are selected in the UI
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  // State to track if any selections have changed since load
  const [hasSelectionChanged, setHasSelectionChanged] = useState<boolean>(false);
  // State for batch update loading/error
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setIsLoading(false);
      setError("Campaign ID is required to view leads.");
      return;
    }

    const fetchLeads = async () => {
      setIsLoading(true);
      setError(null);
      setUpdateError(null);
      setHasSelectionChanged(false); // Reset change tracking on fetch
      try {
        console.log(`Fetching leads for campaign: ${campaignId}`);
        const fetchedLeads = await getCampaignLeads(campaignId);
        console.log("Fetched leads:", fetchedLeads);
        fetchedLeads.sort((a, b) => a.businessName.localeCompare(b.businessName));
        setLeads(fetchedLeads);
        
        // Initialize selected IDs based on fetched data
        const initialSelected = new Set<string>();
        fetchedLeads.forEach(lead => {
            if (lead.selected) {
                initialSelected.add(lead.id!);
            }
        });
        setSelectedLeadIds(initialSelected);

      } catch (err) {
        console.error(`Error fetching leads for campaign ${campaignId}:`, err);
        setError("Failed to load leads. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeads();
  }, [campaignId]);

  // --- Handlers for Selection --- 
  const handleSelectLead = (leadId: string, isSelected: boolean) => {
      setSelectedLeadIds(prevSelected => {
          const newSelected = new Set(prevSelected);
          if (isSelected) {
              newSelected.add(leadId);
          } else {
              newSelected.delete(leadId);
          }
          return newSelected;
      });
      setHasSelectionChanged(true); // Mark that changes have been made
      setUpdateError(null); // Clear previous update errors on new selection change
  };

  // --- TODO: Handler for Select All --- 
  // const handleSelectAll = (isSelected: boolean) => { ... }

  // --- Handler for Batch Update --- 
  const handleBatchUpdateSelection = async () => {
      setIsUpdating(true);
      setUpdateError(null);

      // Determine which leads need updating
      const updatesToBatch: Array<{ id: string; updates: { selected: boolean } }> = [];
      leads.forEach(lead => {
          const currentlySelected = selectedLeadIds.has(lead.id!);
          if (lead.selected !== currentlySelected) { // Check if the state differs from original
              updatesToBatch.push({ id: lead.id!, updates: { selected: currentlySelected } });
          }
      });

      if (updatesToBatch.length === 0) {
          console.log("No selection changes to update.");
          setIsUpdating(false);
          setHasSelectionChanged(false); // Reset if no actual changes were sent
          return;
      }

      try {
          console.log("Batch updating leads:", updatesToBatch);
          await batchUpdateLeads(campaignId, updatesToBatch);
          console.log("Batch update successful");
          // Update the local 'leads' state to reflect the persisted changes
          // This prevents needing a full refetch
          setLeads(prevLeads => 
              prevLeads.map(lead => {                  
                  if (selectedLeadIds.has(lead.id!)) {
                      return { ...lead, selected: true };
                  } else {
                      return { ...lead, selected: false };
                  }
              })
          );
          setHasSelectionChanged(false); // Reset change tracking after successful update
      } catch (err) {
          console.error("Error batch updating lead selections:", err);
          const message = err instanceof Error ? err.message : "Unknown error";
          setUpdateError(`Failed to update selections: ${message}. Please try again.`);
      } finally {
          setIsUpdating(false);
      }
  };

  // --- Render Logic ---

  if (isLoading) {
    // TODO: Use branded skeleton/spinner for table/list
    return <div className="p-4 text-gray-400">Loading leads...</div>;
  }

  if (error) {
    // TODO: Use branded error component
    return <div className="p-4 text-red-400 bg-red-900/20 border border-red-700 rounded">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center"> {/* Container for title and button */} 
        <h3 className="text-lg font-semibold text-electric-teal/90">Leads for Campaign</h3>
        {/* Batch Update Button */} 
        <button
            onClick={handleBatchUpdateSelection}
            disabled={!hasSelectionChanged || isUpdating}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
            {isUpdating ? 'Updating...' : 'Update Selection'}
        </button>
      </div>
      {updateError && <p className="text-xs text-red-400">{updateError}</p>}
      {/* TODO: Add filtering/sorting controls */}

      {leads.length === 0 ? (
        <p className="text-gray-400 italic">No leads found for this campaign.</p>
      ) : (
        <div className="overflow-x-auto relative bg-charcoal/60 rounded-lg border border-gray-700">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-electric-teal/80 uppercase bg-charcoal/80">
              <tr>
                {/* TODO: Add checkbox for select all */}
                <th scope="col" className="py-3 px-4">
                    <input type="checkbox" disabled className="opacity-50" /> {/* Placeholder */} 
                </th>
                <th scope="col" className="py-3 px-4">Business Name</th>
                <th scope="col" className="py-3 px-4">Address</th>
                <th scope="col" className="py-3 px-4">Type</th>
                <th scope="col" className="py-3 px-4">Phone</th>
                <th scope="col" className="py-3 px-4">Website</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-700 hover:bg-charcoal/40">
                  {/* Use selection state for checked status and add onChange */}
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.has(lead.id!)}
                      onChange={(e) => handleSelectLead(lead.id!, e.target.checked)}
                      className="w-4 h-4 text-electric-teal bg-gray-700 border-gray-600 rounded focus:ring-electric-teal focus:ring-2 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4 font-medium text-white whitespace-nowrap">{lead.businessName}</td>
                  <td className="py-3 px-4">{lead.address}</td>
                  <td className="py-3 px-4">{lead.searchBusinessType}</td>
                  <td className="py-3 px-4">{lead.phoneNumber || 'N/A'}</td>
                  <td className="py-3 px-4">
                    {lead.website ? (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Visit
                      </a>
                    ) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CampaignLeadViewer;