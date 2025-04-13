// src/components/dashboard/CampaignHistory.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Campaign, getUserCampaigns } from '@/lib/campaignService'; // Import user-specific function
import CampaignLeadViewer from './CampaignLeadViewer'; // Import the lead viewer

// Removed businessId prop interface
// interface CampaignHistoryProps {
//   businessId: string; 
// }

// Component no longer needs props
const CampaignHistory: React.FC = () => {
  const { user } = useAuth(); // Get user from context
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- State for Modal ---
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch campaigns when user is available
    if (!user) {
      setLoading(false);
      // Optional: Set error or specific message if user is unexpectedly null
      setError("User not logged in."); 
      return;
    }

    const fetchCampaigns = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch campaigns using userId
        console.log(`Fetching campaigns for user: ${user.uid}`); 
        const fetchedCampaigns = await getUserCampaigns(user.uid);
        console.log("Fetched campaigns:", fetchedCampaigns); 
        setCampaigns(fetchedCampaigns);
      } catch (err) {
        console.error("Error fetching campaigns:", err);
        setError("Failed to load campaign history. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
    // Depend on user object (or user.uid) to refetch if user changes
  }, [user]); 

  // --- Modal Handlers ---
  const openLeadModal = (campaignId: string) => {
      setSelectedCampaignId(campaignId);
      setIsModalOpen(true);
  };

  const closeLeadModal = () => {
      setIsModalOpen(false);
      setSelectedCampaignId(null);
  };

  // --- Render Logic --- (Styling needed)

  if (loading) {
    return <div className="p-4 text-gray-400">Loading campaign history...</div>; // TODO: Style
  }

  if (error) {
    return <div className="p-4 text-red-400 bg-red-900/20 border border-red-700 rounded">Error: {error}</div>; // TODO: Style
  }

  return (
    <div className="campaign-history-container space-y-4 relative"> {/* Added relative for potential modal layering context */}
      <h2 className="text-xl font-semibold text-electric-teal">Campaign History</h2>
      {campaigns.length === 0 ? (
        <p className="text-gray-400 italic p-4 bg-charcoal/50 rounded-md border border-electric-teal/20">No campaigns found.</p> // TODO: Style
      ) : (
        <ul className="divide-y divide-gray-700"> {/* TODO: Style divider */} 
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="py-4 px-2 hover:bg-charcoal/40 rounded transition-colors"> {/* Adjusted padding; TODO: Style list item */} 
              <div className="flex justify-between items-start gap-2"> {/* Use items-start */} 
                 {/* Left Side: Details */} 
                 <div className="flex-grow">
                     <h3 className="text-lg font-medium text-white mb-1">{campaign.name || 'Untitled Campaign'}</h3>
                     <div className="mt-1 text-xs text-gray-400 space-y-0.5"> {/* TODO: Style details text */} 
                        <p>Created: {campaign.createdAt?.toDate ? campaign.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                        <p>Leads Found: <span className="font-medium text-gray-300">{campaign.leadCount ?? 0}</span></p>
                        <p>Leads Selected: <span className="font-medium text-gray-300">{campaign.selectedLeadCount ?? 0}</span></p>
                        {/* TODO: Add display for mailing status when implemented */}
                     </div>
                 </div>
                 {/* Right Side: Status & Actions */} 
                 <div className="flex flex-col items-end space-y-2 flex-shrink-0"> {/* Column layout for status and button */} 
                     <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${ // TODO: Style status badges
                        campaign.status === 'active' ? 'bg-green-700 text-green-100' : 
                        campaign.status === 'completed' ? 'bg-blue-700 text-blue-100' : 
                        'bg-gray-600 text-gray-200'
                     }`}>
                       {campaign.status?.toUpperCase() ?? 'DRAFT'}
                     </span>
                     {/* Update button onClick */} 
                     <button 
                        onClick={() => openLeadModal(campaign.id!)} // Pass campaign ID
                        className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-sm transition-colors"
                     >
                         View Leads
                     </button>
                 </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Lead Viewer Modal */} 
      {isModalOpen && selectedCampaignId && (
          <div 
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" 
              onClick={closeLeadModal} // Close on overlay click
          >
              {/* Modal Content Box */} 
              <div 
                  className="bg-charcoal p-5 rounded-lg shadow-xl border border-electric-teal/30 w-full max-w-4xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-electric-teal/30 scrollbar-track-transparent" 
                  onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
              >
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-electric-teal">Campaign Leads</h4>
                      <button 
                          onClick={closeLeadModal}
                          className="text-gray-400 hover:text-white text-2xl" 
                          aria-label="Close modal"
                       >
                           &times;
                       </button>
                  </div>
                  {/* Render the Lead Viewer Component */} 
                  <CampaignLeadViewer campaignId={selectedCampaignId} />
              </div>
          </div>
      )}

    </div>
  );
};

export default CampaignHistory;
