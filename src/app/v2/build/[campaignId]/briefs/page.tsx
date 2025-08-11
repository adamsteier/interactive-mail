'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { CreativeBrief, BriefGenerationRequest } from '@/v2/types/design';
import { V2Brand } from '@/v2/types/brand';
import { 
  getBriefsLibrary, 
  updateBriefUsage, 
  toggleBriefTemplate,
  updateBriefText,
  getSuggestedBriefs,
  BriefLibraryFilter 
} from '@/v2/services/briefManagementService';
import CreativeBriefSelector from '@/v2/components/design/CreativeBriefSelector';
import CampaignProgress from '@/v2/components/CampaignProgress';

type Params = Promise<{ campaignId: string }>;

interface CampaignData {
  id: string;
  brandId: string;
  totalLeadCount: number;
  businessTypes: string[];
  status: string;
  ownerUid: string;
  businessData?: {
    industry?: string;
    description?: string;
  };
}

type TabType = 'current' | 'all' | 'templates' | 'generate';

export default function BriefManagementPage({ params }: { params: Params }) {
  const router = useRouter();
  const { user } = useAuth();
  
  // Route params
  const [campaignId, setCampaignId] = useState<string>('');
  
  // Data state
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [brandData, setBrandData] = useState<V2Brand | null>(null);
  const [briefs, setBriefs] = useState<CreativeBrief[]>([]);
  const [suggestedBriefs, setSuggestedBriefs] = useState<CreativeBrief[]>([]);
  
  // UI state
  const [currentTab, setCurrentTab] = useState<TabType>('current');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBrief, setEditingBrief] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  
  // Generation state
  const [showGenerator, setShowGenerator] = useState(false);
  const [generationRequest, setGenerationRequest] = useState<BriefGenerationRequest | null>(null);

  // Handle params promise for Next.js 15
  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCampaignId(resolvedParams.campaignId);
    };
    loadParams();
  }, [params]);

  // Load briefs based on current tab and filters
  const loadBriefs = useCallback(async (filter: BriefLibraryFilter = {}) => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      const finalFilter = { ...filter };
      
      // Apply tab-specific filters
      switch (currentTab) {
        case 'current':
          finalFilter.campaignId = campaignId;
          break;
        case 'templates':
          finalFilter.isTemplate = true;
          break;
        case 'all':
          // No additional filters
          break;
      }
      
      // Apply search term
      if (searchTerm.trim()) {
        finalFilter.search = searchTerm.trim();
      }

      const briefsData = await getBriefsLibrary(user.uid, finalFilter);
      setBriefs(briefsData);
      
    } catch (err) {
      console.error('Error loading briefs:', err);
      setError('Failed to load briefs');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, campaignId, currentTab, searchTerm]);

  // Load initial data
  useEffect(() => {
    if (!campaignId || !user?.uid) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load campaign data
        const campaignRef = doc(db, 'campaigns', campaignId);
        const campaignSnap = await getDoc(campaignRef);
        
        if (!campaignSnap.exists()) {
          throw new Error('Campaign not found');
        }

        const campaignDoc = campaignSnap.data();
        if (campaignDoc.ownerUid !== user.uid) {
          throw new Error('Unauthorized access');
        }

        const campaign: CampaignData = {
          id: campaignSnap.id,
          brandId: campaignDoc.brandId,
          totalLeadCount: campaignDoc.totalLeadCount || 0,
          businessTypes: campaignDoc.businessTypes || [],
          status: campaignDoc.status || 'draft',
          ownerUid: campaignDoc.ownerUid,
          businessData: campaignDoc.businessData
        };
        setCampaignData(campaign);

        // Load brand data if available
        if (campaign.brandId) {
          const brandRef = doc(db, 'users', user.uid, 'brands', campaign.brandId);
          const brandSnap = await getDoc(brandRef);
          
          if (brandSnap.exists()) {
            setBrandData({ id: brandSnap.id, ...brandSnap.data() } as V2Brand);
          }
        }

        // Load suggested briefs if we have context
        if (campaign.businessData?.industry) {
          const suggested = await getSuggestedBriefs(
            user.uid, 
            campaignId, 
            campaign.businessData.industry, 
            'professional' // Default voice
          );
          setSuggestedBriefs(suggested);
        }

        // Load current campaign briefs
        await loadBriefs({ campaignId });

      } catch (err) {
        console.error('Error loading brief management data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId, user?.uid, loadBriefs]);

  // Reload briefs when tab or search changes
  useEffect(() => {
    if (currentTab !== 'generate') {
      loadBriefs();
    }
  }, [currentTab, searchTerm, loadBriefs]);

  // Handle brief selection
  const handleBriefSelect = async (brief: CreativeBrief) => {
    if (!user?.uid) return;

    try {
      // Update usage tracking
      await updateBriefUsage(user.uid, {
        briefId: brief.id,
        campaignId
      });

      // Update campaign with selected brief
      await updateDoc(doc(db, 'campaigns', campaignId), {
        selectedBriefId: brief.id,
        updatedAt: serverTimestamp()
      });

      // Navigate to design generation
      router.push(`/v2/build/${campaignId}/design?briefId=${brief.id}`);
      
    } catch (err) {
      console.error('Error selecting brief:', err);
      setError('Failed to select brief');
    }
  };

  // Handle template toggle
  const handleToggleTemplate = async (briefId: string, isTemplate: boolean) => {
    if (!user?.uid) return;

    try {
      await toggleBriefTemplate(user.uid, briefId, isTemplate);
      await loadBriefs(); // Reload to update UI
    } catch (err) {
      console.error('Error toggling template:', err);
      setError('Failed to update template status');
    }
  };

  // Handle brief editing
  const handleEditBrief = (brief: CreativeBrief) => {
    setEditingBrief(brief.id);
    setEditText(brief.briefText);
  };

  const handleSaveEdit = async () => {
    if (!user?.uid || !editingBrief) return;

    try {
      await updateBriefText(user.uid, editingBrief, editText);
      setEditingBrief(null);
      setEditText('');
      await loadBriefs(); // Reload to show changes
    } catch (err) {
      console.error('Error saving brief edit:', err);
      setError('Failed to save changes');
    }
  };

  // Handle new brief generation
  const handleShowGenerator = () => {
    if (!campaignData || !brandData) return;

    const request: BriefGenerationRequest = {
      campaignId,
      brandId: campaignData.brandId,
      formData: {
        industry: campaignData.businessData?.industry || '',
        goal: '',
        audience: '',
        voice: 'professional',
        imageryInstructions: ''
      },
      businessTypes: campaignData.businessTypes.map(type => ({ type, count: 1 }))
    };

    setGenerationRequest(request);
    setCurrentTab('generate');
    setShowGenerator(true);
  };

  const handleBriefGenerated = (brief: CreativeBrief) => {
    // Use the selected brief and refresh current campaign briefs
    handleBriefSelect(brief);
    setCurrentTab('current');
    setShowGenerator(false);
    loadBriefs({ campaignId });
  };

  if (loading && !briefs.length) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#EAEAEA]">
      {/* Header */}
      <div className="border-b border-[#2F2F2F] bg-[#0A0A0A]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <CampaignProgress 
            currentStep={3} 
            campaignId={campaignId}
            currentSubStep="briefs"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#EAEAEA] mb-2">
            Creative Brief Library
          </h1>
          <p className="text-[#EAEAEA]/60">
            Manage and reuse your creative briefs across campaigns
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Show Generator */}
        {showGenerator && generationRequest ? (
          <CreativeBriefSelector
            campaignId={campaignId}
            brandId={campaignData?.brandId || ''}
            generationRequest={generationRequest}
            onBriefSelected={handleBriefGenerated}
            onBack={() => {
              setShowGenerator(false);
              setCurrentTab('current');
            }}
          />
        ) : (
          <>
            {/* Tabs and Search */}
            <div className="mb-6 space-y-4">
              {/* Tab Navigation */}
              <div className="flex flex-wrap gap-1 bg-[#1A1A1A] rounded-lg p-1">
                {[
                  { id: 'current' as TabType, label: 'This Campaign', count: briefs.filter(b => b.campaignId === campaignId).length },
                  { id: 'all' as TabType, label: 'All Campaigns', count: null },
                  { id: 'templates' as TabType, label: 'Templates', count: null }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id)}
                    className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                      currentTab === tab.id
                        ? 'bg-[#00F0FF] text-[#0A0A0A] font-medium'
                        : 'text-[#EAEAEA]/60 hover:text-[#EAEAEA] hover:bg-[#2F2F2F]'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== null && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        currentTab === tab.id 
                          ? 'bg-[#0A0A0A]/20 text-[#0A0A0A]' 
                          : 'bg-[#00F0FF]/20 text-[#00F0FF]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search and Actions */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search briefs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg text-[#EAEAEA] placeholder-[#EAEAEA]/40 focus:border-[#00F0FF] focus:outline-none"
                  />
                </div>
                
                <button
                  onClick={handleShowGenerator}
                  className="px-6 py-2 bg-[#00F0FF] text-[#0A0A0A] rounded-lg font-medium hover:bg-[#00F0FF]/90 transition-colors"
                >
                  Generate New Briefs
                </button>
              </div>
            </div>

            {/* Suggested Briefs (only on current tab) */}
            {currentTab === 'current' && suggestedBriefs.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-[#EAEAEA] mb-4">
                  💡 Suggested from Your Other Campaigns
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestedBriefs.slice(0, 3).map((brief) => (
                    <BriefCard
                      key={brief.id}
                      brief={brief}
                      onSelect={() => handleBriefSelect(brief)}
                      onToggleTemplate={(isTemplate) => handleToggleTemplate(brief.id, isTemplate)}
                      onEdit={() => handleEditBrief(brief)}
                      isEditing={editingBrief === brief.id}
                      editText={editText}
                      onEditTextChange={setEditText}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={() => setEditingBrief(null)}
                      isSuggested={true}
                    />
                  ))}
                </div>
                <div className="border-b border-[#2F2F2F] my-6"></div>
              </div>
            )}

            {/* Quick Access to Templates (for all tabs except templates) */}
            {currentTab !== 'templates' && currentTab !== 'generate' && (
              <div className="mb-6">
                <button
                  onClick={() => setCurrentTab('templates')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6B9D]/10 text-[#FF6B9D] border border-[#FF6B9D]/20 rounded-lg hover:bg-[#FF6B9D]/20 transition-colors"
                >
                  <span>⭐</span>
                  <span>Quick Access: View All Templates</span>
                  <span className="text-xs bg-[#FF6B9D]/20 px-2 py-0.5 rounded">
                    {briefs.filter(b => b.isTemplate).length}
                  </span>
                </button>
              </div>
            )}

            {/* Brief Grid */}
            {briefs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-medium text-[#EAEAEA] mb-2">
                  {currentTab === 'current' ? 'No briefs for this campaign yet' : 
                   currentTab === 'templates' ? 'No template briefs saved' : 'No briefs found'}
                </h3>
                <p className="text-[#EAEAEA]/60 mb-4">
                  {currentTab === 'current' 
                    ? 'Generate your first creative brief to get started'
                    : 'Generate briefs and mark favorites as templates for reuse'
                  }
                </p>
                {currentTab === 'current' && (
                  <button
                    onClick={handleShowGenerator}
                    className="px-6 py-2 bg-[#00F0FF] text-[#0A0A0A] rounded-lg font-medium hover:bg-[#00F0FF]/90 transition-colors"
                  >
                    Generate Creative Briefs
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {briefs.map((brief) => (
                    <motion.div
                      key={brief.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <BriefCard
                        brief={brief}
                        onSelect={() => handleBriefSelect(brief)}
                        onToggleTemplate={(isTemplate) => handleToggleTemplate(brief.id, isTemplate)}
                        onEdit={() => handleEditBrief(brief)}
                        isEditing={editingBrief === brief.id}
                        editText={editText}
                        onEditTextChange={setEditText}
                        onSaveEdit={handleSaveEdit}
                        onCancelEdit={() => setEditingBrief(null)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Brief Card Component
interface BriefCardProps {
  brief: CreativeBrief;
  onSelect: () => void;
  onToggleTemplate: (isTemplate: boolean) => void;
  onEdit: () => void;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  isSuggested?: boolean;
}

function BriefCard({
  brief,
  onSelect,
  onToggleTemplate,
  onEdit,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  isSuggested = false
}: BriefCardProps) {
  const getCardStyle = () => {
    if (brief.isTemplate) {
      return 'border-[#FF6B9D]/40 bg-gradient-to-br from-[#1A1A1A] to-[#FF6B9D]/10 shadow-lg shadow-[#FF6B9D]/5';
    }
    if (isSuggested) {
      return 'border-[#FF6B9D]/30 bg-gradient-to-br from-[#1A1A1A] to-[#FF6B9D]/5';
    }
    return 'border-[#2F2F2F]';
  };

  return (
    <div className={`bg-[#1A1A1A] rounded-lg border p-4 transition-all hover:border-[#00F0FF]/30 ${getCardStyle()}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs px-2 py-1 bg-[#00F0FF]/10 text-[#00F0FF] rounded">
            {brief.model}
          </span>
          {brief.isTemplate && (
            <span className="text-xs px-2 py-1 bg-[#FF6B9D]/10 text-[#FF6B9D] rounded">
              Template
            </span>
          )}
          {isSuggested && (
            <span className="text-xs px-2 py-1 bg-[#FF6B9D]/20 text-[#FF6B9D] rounded">
              Suggested
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleTemplate(!brief.isTemplate);
            }}
            className={`p-1 rounded transition-colors ${
              brief.isTemplate 
                ? 'text-[#FF6B9D] hover:bg-[#FF6B9D]/10' 
                : 'text-[#EAEAEA]/40 hover:text-[#FF6B9D] hover:bg-[#FF6B9D]/10'
            }`}
            title={brief.isTemplate ? 'Remove from templates' : 'Save as template'}
          >
            ⭐
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1 text-[#EAEAEA]/40 hover:text-[#EAEAEA] hover:bg-[#2F2F2F] rounded transition-colors"
            title="Edit brief"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-[#0A0A0A] border border-[#2F2F2F] rounded text-[#EAEAEA] text-sm resize-none focus:border-[#00F0FF] focus:outline-none"
            placeholder="Edit your creative brief..."
          />
          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              className="px-3 py-1 bg-[#00F0FF] text-[#0A0A0A] rounded text-sm font-medium hover:bg-[#00F0FF]/90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelEdit}
              className="px-3 py-1 bg-[#2F2F2F] text-[#EAEAEA] rounded text-sm hover:bg-[#404040] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-[#EAEAEA]/80 text-sm leading-relaxed mb-4 line-clamp-4">
            {brief.briefText.substring(0, 200)}
            {brief.briefText.length > 200 && '...'}
          </div>

          {/* Tags */}
          {brief.tags && brief.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {brief.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-[#2F2F2F] text-[#EAEAEA]/60 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-[#EAEAEA]/40 mb-4">
            <span>
              {brief.context.industry} • {brief.context.voice}
            </span>
            {brief.usageCount > 0 && (
              <span>Used {brief.usageCount} times</span>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={onSelect}
            className="w-full py-2 bg-[#00F0FF]/10 text-[#00F0FF] rounded hover:bg-[#00F0FF]/20 transition-colors font-medium"
          >
            Use This Brief
          </button>
        </>
      )}
    </div>
  );
}
