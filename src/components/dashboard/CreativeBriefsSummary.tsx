'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getBriefsLibrary, getRecentBriefs } from '@/v2/services/briefManagementService';
import { CreativeBrief } from '@/v2/types/design';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CampaignInfo {
  id: string;
  name: string;
}

const CreativeBriefsSummary: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [recentBriefs, setRecentBriefs] = useState<CreativeBrief[]>([]);
  const [templateCount, setTemplateCount] = useState(0);
  const [totalBriefCount, setTotalBriefCount] = useState(0);
  const [campaigns, setCampaigns] = useState<Map<string, CampaignInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchBriefsData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch recent briefs
        const recent = await getRecentBriefs(user.uid, 5);
        setRecentBriefs(recent);
        
        // Fetch all briefs to get counts
        const allBriefs = await getBriefsLibrary(user.uid, {});
        setTotalBriefCount(allBriefs.length);
        
        // Count templates
        const templates = allBriefs.filter(b => b.isTemplate);
        setTemplateCount(templates.length);
        
        // Get unique campaign IDs
        const uniqueCampaignIds = [...new Set(allBriefs.map(b => b.campaignId))];
        
        // Fetch campaign names
        if (uniqueCampaignIds.length > 0) {
          const campaignsRef = collection(db, 'campaigns');
          const campaignsQuery = query(
            campaignsRef, 
            where('__name__', 'in', uniqueCampaignIds.slice(0, 10)) // Firestore 'in' limit
          );
          const campaignsSnap = await getDocs(campaignsQuery);
          
          const campaignMap = new Map<string, CampaignInfo>();
          campaignsSnap.forEach(doc => {
            const data = doc.data();
            campaignMap.set(doc.id, {
              id: doc.id,
              name: data.name || `Campaign ${doc.id.slice(0, 8)}`
            });
          });
          setCampaigns(campaignMap);
        }
        
      } catch (err) {
        console.error("Error fetching briefs data:", err);
        setError("Failed to load creative briefs.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBriefsData();
  }, [user]);

  const BriefCard: React.FC<{ brief: CreativeBrief }> = ({ brief }) => {
    const campaignInfo = campaigns.get(brief.campaignId);
    
    return (
      <div 
        onClick={() => router.push(`/v2/build/${brief.campaignId}/briefs`)}
        className="p-4 bg-charcoal/60 rounded-lg border border-gray-700 hover:border-electric-teal/50 transition-all cursor-pointer"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs px-2 py-1 bg-electric-teal/10 text-electric-teal rounded">
            {brief.model}
          </span>
          {brief.isTemplate && (
            <span className="text-xs text-neon-magenta">⭐ Template</span>
          )}
        </div>
        
        <p className="text-sm text-gray-300 line-clamp-2 mb-2">
          {brief.briefText.substring(0, 150)}...
        </p>
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{campaignInfo?.name || 'Campaign'}</span>
          {brief.usageCount > 0 && (
            <span>Used {brief.usageCount} times</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-charcoal/60 p-4 rounded-lg border border-gray-700 text-center">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Total Briefs</h3>
          {isLoading ? (
            <div className="h-6 w-16 mx-auto bg-gray-600/50 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-semibold text-electric-teal">{totalBriefCount}</p>
          )}
        </div>
        
        <div className="bg-charcoal/60 p-4 rounded-lg border border-gray-700 text-center">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Templates</h3>
          {isLoading ? (
            <div className="h-6 w-16 mx-auto bg-gray-600/50 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-semibold text-neon-magenta">{templateCount}</p>
          )}
        </div>
        
        <div className="bg-charcoal/60 p-4 rounded-lg border border-gray-700 text-center">
          <h3 className="text-sm font-medium text-gray-400 mb-1">Campaigns</h3>
          {isLoading ? (
            <div className="h-6 w-16 mx-auto bg-gray-600/50 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-semibold text-electric-teal">{campaigns.size}</p>
          )}
        </div>
      </div>

      {/* Recent Briefs */}
      {!isLoading && recentBriefs.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-electric-teal mb-3">Recently Used Briefs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentBriefs.slice(0, 4).map(brief => (
              <BriefCard key={brief.id} brief={brief} />
            ))}
          </div>
        </div>
      )}

      {/* No briefs message */}
      {!isLoading && totalBriefCount === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No creative briefs yet. Start a campaign to create your first brief!</p>
          <button 
            onClick={() => router.push('/v2/build')}
            className="px-4 py-2 rounded bg-electric-teal hover:bg-electric-teal/80 text-charcoal text-sm font-semibold shadow-glow transition-all"
          >
            Start New Campaign
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};

export default CreativeBriefsSummary;
