import { useState, useEffect } from 'react';
import { useMarketingStore } from '@/store/marketingStore';
import { Campaign } from '@/lib/campaignService';
import PostcardUploader from './PostcardUploader';

const CampaignManager = () => {
  const [campaignName, setCampaignName] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<Record<string, boolean>>({});
  
  const {
    activeBusiness,
    currentCampaign,
    businessCampaigns,
    campaignLeads,
    selectedBusinessTypes,
    collectedLeads,
    isLoadingCampaigns,
    isLoadingLeads,
    isSavingCampaign,
    
    createNewCampaign,
    loadBusinessCampaigns,
    setCurrentCampaign,
    loadCampaignById,
    loadCampaignLeads,
    updateCampaignLead,
    batchUpdateCampaignLeads,
    savePlacesToCampaign
  } = useMarketingStore();
  
  // Load business campaigns when component mounts
  useEffect(() => {
    if (activeBusiness?.id) {
      loadBusinessCampaigns(activeBusiness.id);
    }
  }, [activeBusiness, loadBusinessCampaigns]);
  
  // Handle campaign creation
  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      alert('Please enter a campaign name');
      return;
    }
    
    try {
      const campaignId = await createNewCampaign(campaignName);
      await loadCampaignById(campaignId);
      setCampaignName('');
    } catch (error) {
      console.error('Failed to create campaign:', error);
      alert('Failed to create campaign');
    }
  };
  
  // Handle saving leads to campaign
  const handleSaveLeads = async () => {
    try {
      await savePlacesToCampaign();
    } catch (error) {
      console.error('Failed to save leads:', error);
      alert('Failed to save leads to campaign');
    }
  };
  
  // Handle selecting a campaign
  const handleSelectCampaign = async (campaign: Campaign) => {
    setCurrentCampaign(campaign);
    if (campaign.id) {
      await loadCampaignLeads(campaign.id);
    }
  };
  
  // Handle selecting/deselecting all leads
  const handleSelectAll = (select: boolean) => {
    const updatedLeads = campaignLeads.map(lead => ({
      id: lead.id!,
      updates: { selected: select }
    }));
    
    // Update the local selection state
    const newSelections: Record<string, boolean> = {};
    campaignLeads.forEach(lead => {
      if (lead.id) {
        newSelections[lead.id] = select;
      }
    });
    setSelectedLeads(newSelections);
    
    // Update in database
    batchUpdateCampaignLeads(updatedLeads);
  };
  
  // Handle individual lead selection
  const handleLeadSelection = (leadId: string, selected: boolean) => {
    // Update local state
    setSelectedLeads(prev => ({
      ...prev,
      [leadId]: selected
    }));
    
    // Update in database
    updateCampaignLead(leadId, { selected });
  };
  
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">Campaign Manager</h2>
      
      {/* Campaign Creation Form */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Create New Campaign</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={campaignName}
            onChange={e => setCampaignName(e.target.value)}
            placeholder="Campaign Name"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleCreateCampaign}
            disabled={isSavingCampaign || !campaignName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
          >
            {isSavingCampaign ? 'Creating...' : 'Create Campaign'}
          </button>
        </div>
        
        <div className="mt-2">
          <h4 className="font-medium">Selected Business Types:</h4>
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(selectedBusinessTypes).map(type => (
              <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Campaigns List */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-lg font-semibold mb-2">Your Campaigns</h3>
        {isLoadingCampaigns ? (
          <p>Loading campaigns...</p>
        ) : businessCampaigns.length === 0 ? (
          <p>No campaigns yet. Create your first campaign above.</p>
        ) : (
          <div className="space-y-2">
            {businessCampaigns.map(campaign => (
              <div 
                key={campaign.id}
                className={`p-3 border rounded cursor-pointer ${
                  currentCampaign?.id === campaign.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSelectCampaign(campaign)}
              >
                <div className="font-medium">{campaign.name}</div>
                <div className="text-sm text-gray-500">
                  {campaign.leadCount} leads • {campaign.selectedLeadCount} selected
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Created: {campaign.createdAt ? new Date(campaign.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Collected Leads */}
      {collectedLeads.length > 0 && currentCampaign && (
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Newly Found Leads</h3>
            <button
              onClick={handleSaveLeads}
              disabled={isSavingCampaign}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded disabled:bg-green-300"
            >
              {isSavingCampaign ? 'Saving...' : 'Save to Campaign'}
            </button>
          </div>
          
          <div className="space-y-2">
            {collectedLeads.map(place => (
              <div key={place.place_id} className="p-2 border rounded">
                <div className="font-medium">{place.name}</div>
                <div className="text-sm">{place.vicinity || place.formatted_address}</div>
                <div className="text-xs text-gray-500 mt-1">{place.businessType}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Campaign Leads */}
      {currentCampaign && (
        <>
          <div className="bg-white p-4 rounded shadow">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">
                {currentCampaign.name} - Leads
              </h3>
              <div className="space-x-2">
                <button
                  onClick={() => handleSelectAll(true)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                >
                  Select All
                </button>
                <button
                  onClick={() => handleSelectAll(false)}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded"
                >
                  Deselect All
                </button>
              </div>
            </div>
            
            {isLoadingLeads ? (
              <p>Loading leads...</p>
            ) : campaignLeads.length === 0 ? (
              <p>No leads yet in this campaign.</p>
            ) : (
              <div className="space-y-2">
                {campaignLeads.map(lead => (
                  <div 
                    key={lead.id}
                    className={`p-3 border rounded flex items-start ${
                      lead.selected ? 'border-green-500 bg-green-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLeads[lead.id!] ?? lead.selected}
                      onChange={e => handleLeadSelection(lead.id!, e.target.checked)}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="font-medium">{lead.businessName}</div>
                      <div className="text-sm">{lead.address}</div>
                      {lead.phoneNumber && (
                        <div className="text-sm">{lead.phoneNumber}</div>
                      )}
                      {lead.website && (
                        <a 
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {lead.website}
                        </a>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{lead.businessType}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Postcard Designs Section */}
          <div className="mt-6">
            {currentCampaign.id && activeBusiness?.id && (
              <PostcardUploader 
                campaignId={currentCampaign.id} 
                businessId={activeBusiness.id} 
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CampaignManager; 