'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { getBrand } from '@/v2/services/brandService';
import { V2Brand } from '@/v2/types/brand';
import DesignReviewSection from '@/v2/components/design/DesignReviewSection';

// Types
type Params = Promise<{ campaignId: string }>;

interface CampaignData {
  id: string;
  brandId: string;
  totalLeadCount: number;
  businessTypes: string[];
  status: string;
  ownerUid: string;
  designAssignments?: DesignAssignmentType[];
  designs?: {
    [designId: string]: {
      jobId?: string;
      status?: string;
      [key: string]: unknown;
    };
  };
  pricing?: {
    totalCost: number;
    pricePerLead: number;
    tierApplied: string;
  };
}

// Using V2Brand interface imported above

interface DesignAssignmentType {
  designId: string;
  designName: string;
  businessTypes: string[];
  leadCount: number;
  selectedOption?: 'A' | 'B'; // User's A/B choice
  generationResult?: {
    brief1?: {
      frontImageUrl?: string;
      executionTime?: number;
      briefText?: string;
      model?: string;
      temperature?: number;
      reasoning?: string;
      briefId?: string;
    };
    brief2?: {
      frontImageUrl?: string;
      executionTime?: number;
      briefText?: string;
      model?: string;
      temperature?: number;
      reasoning?: string;
      briefId?: string;
    };
  };
  creativeBrief?: {
    briefText: string;
  };
  prompt?: string;
}

export default function ReviewPage({ params }: { params: Params }) {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [campaignId, setCampaignId] = useState<string>('');
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [brandData, setBrandData] = useState<V2Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingChanges, setSavingChanges] = useState(false);

  // Load campaign ID from params
  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCampaignId(resolvedParams.campaignId);
    };
    loadParams();
  }, [params]);

  // Load campaign and brand data
  useEffect(() => {
    if (!campaignId || !user) return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Load campaign data
        const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
        if (!campaignDoc.exists()) {
          throw new Error('Campaign not found');
        }

        const campaign = { id: campaignDoc.id, ...campaignDoc.data() } as CampaignData;
        
        // Verify ownership
        if (campaign.ownerUid !== user.uid) {
          throw new Error('Not authorized to view this campaign');
        }

        setCampaignData(campaign);

        // Load brand data using V2 service
        const brand = await getBrand(user.uid, campaign.brandId);
        if (brand) {
          setBrandData(brand);
        }

        // Load generation status for each design using the correct aiJobs path
        const designsWithResults = await Promise.all(
          (campaign.designAssignments || []).map(async (assignment) => {
            try {
              // Get jobId from campaign designs data
              const jobId = campaign.designs?.[assignment.designId]?.jobId;
              
              if (!jobId) {
                console.warn(`No jobId found for design ${assignment.designId}`);
                return assignment;
              }
              
              // Fetch generation status from aiJobs collection
              const jobDoc = await getDoc(doc(db, 'aiJobs', jobId));
              
              if (jobDoc.exists()) {
                const jobData = jobDoc.data();
                return {
                  ...assignment,
                  generationResult: jobData.result,
                  selectedOption: jobData.selectedOption || undefined,
                  generationStatus: jobData.status,
                  progress: jobData.progress,
                  creativeBrief: jobData.creativeBrief ? { briefText: jobData.creativeBrief } : undefined,
                  prompt: jobData.prompt
                };
              }
              return assignment;
            } catch (err) {
              console.error('Error loading design status:', err);
              return assignment;
            }
          })
        );

        setCampaignData(prev => prev ? {
          ...prev,
          designAssignments: designsWithResults
        } : null);

      } catch (err) {
        console.error('Error loading review data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId, user]);

  const handleOptionSelect = async (designId: string, option: 'A' | 'B') => {
    if (!campaignData || savingChanges) return;

    try {
      setSavingChanges(true);

      // Update the selected option in Firestore
      await updateDoc(
        doc(db, 'campaigns', campaignId, 'generationStatus', designId),
        { selectedOption: option }
      );

      // Update local state
      setCampaignData(prev => {
        if (!prev?.designAssignments) return prev;
        
        return {
          ...prev,
          designAssignments: prev.designAssignments.map(assignment =>
            assignment.designId === designId
              ? { ...assignment, selectedOption: option }
              : assignment
          )
        };
      });

    } catch (error) {
      console.error('Error saving option selection:', error);
    } finally {
      setSavingChanges(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!campaignData) return;
    
    // Ensure all designs have selections
    const unselectedDesigns = campaignData.designAssignments?.filter(
      assignment => !assignment.selectedOption
    );

    if (unselectedDesigns && unselectedDesigns.length > 0) {
      alert('Please select your preferred option for all designs before proceeding.');
      return;
    }

    router.push(`/v2/build/${campaignId}/checkout`);
  };

  const getSelectedDesigns = () => {
    return campaignData?.designAssignments?.map(assignment => {
      const selectedResult = assignment.selectedOption === 'A' 
        ? assignment.generationResult?.brief1
        : assignment.generationResult?.brief2;
      
      return {
        ...assignment,
        selectedImageUrl: selectedResult?.frontImageUrl,
        selectedProvider: assignment.selectedOption === 'A' 
          ? `${selectedResult?.model || 'GPT-5'} (${selectedResult?.reasoning || 'minimal'})` 
          : `${selectedResult?.model || 'GPT-5'} (${selectedResult?.reasoning || 'medium'})`,
        generationTime: selectedResult?.executionTime
      };
    }) || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex space-x-1 mb-4">
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
          <p className="text-[#00F0FF] text-lg font-medium">Loading campaign review...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !campaignData || !brandData) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-full bg-[#FF00B8]/20 flex items-center justify-center mx-auto mb-6 border border-[#FF00B8]/40">
            <svg className="w-8 h-8 text-[#FF00B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#EAEAEA] mb-4">Unable to Load Review</h1>
          <p className="text-[#EAEAEA]/60 mb-8">{error || 'Campaign data not found'}</p>
          <button
            onClick={() => router.push(`/v2/build/${campaignId}/design`)}
            className="bg-[#00F0FF] text-[#1A1A1A] px-6 py-3 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200"
          >
            Back to Design
          </button>
        </motion.div>
      </div>
    );
  }

  const selectedDesigns = getSelectedDesigns();
  const allDesignsSelected = selectedDesigns.every(design => design.selectedImageUrl);

  return (
    <div className="min-h-screen bg-[#1A1A1A]">
      {/* Animated background waves */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0 opacity-5"
          animate={{
            background: [
              'radial-gradient(600px circle at 0% 0%, #00F0FF 0%, transparent 50%)',
              'radial-gradient(600px circle at 100% 100%, #FF00B8 0%, transparent 50%)',
              'radial-gradient(600px circle at 0% 100%, #00F0FF 0%, transparent 50%)',
              'radial-gradient(600px circle at 100% 0%, #FF00B8 0%, transparent 50%)',
            ]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-[#00F0FF]/20 bg-[#1A1A1A]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#EAEAEA] mb-1">
                  Review Designs
                </h1>
                <p className="text-[#EAEAEA]/60">
                  Step 3 of 4: Review your AI-generated designs
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="bg-[#2F2F2F]/50 rounded-lg px-4 py-3 border border-[#00F0FF]/20">
                <div className="text-sm text-[#EAEAEA]/60 mb-1">Using Brand</div>
                <div className="text-[#00F0FF] font-semibold">
                  {brandData.name}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="relative z-10 bg-[#1A1A1A]/90 backdrop-blur-sm border-b border-[#2F2F2F]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-8">
            {[
              { step: 1, label: 'Brand', active: false, complete: true },
              { step: 2, label: 'Design', active: false, complete: true },
              { step: 3, label: 'Review', active: true, complete: false },
              { step: 4, label: 'Payment', active: false, complete: false }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${item.complete
                    ? 'bg-[#00F0FF] text-[#1A1A1A]'
                    : item.active 
                    ? 'bg-[#00F0FF] text-[#1A1A1A] shadow-[0_0_20px_rgba(0,240,255,0.4)]' 
                    : 'bg-[#2F2F2F] text-[#EAEAEA]/60'
                  }
                `}>
                  {item.complete ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.step
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  item.active || item.complete ? 'text-[#00F0FF]' : 'text-[#EAEAEA]/60'
                }`}>
                  {item.label}
                </span>
                {index < 3 && (
                  <div className="w-12 h-px bg-[#2F2F2F] mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Campaign Summary */}
          <div className="bg-[#2F2F2F]/50 rounded-lg p-6 border border-[#00F0FF]/20 mb-8">
            <h2 className="text-xl font-bold text-[#EAEAEA] mb-4">Campaign Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00F0FF] mb-1">{campaignData.totalLeadCount}</div>
                <div className="text-[#EAEAEA]/60 text-sm">Total Recipients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00F0FF] mb-1">{campaignData.designAssignments?.length || 0}</div>
                <div className="text-[#EAEAEA]/60 text-sm">Unique Designs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#00F0FF] mb-1">
                  ${campaignData.pricing?.totalCost?.toFixed(2) || '0.00'}
                </div>
                <div className="text-[#EAEAEA]/60 text-sm">Total Cost</div>
              </div>
            </div>
          </div>

          {/* Design Reviews */}
          <div className="space-y-8">
            {campaignData.designAssignments?.map((assignment) => (
              <div key={assignment.designId}>
                {brandData && (
                  <DesignReviewSection
                    assignment={{
                      designId: assignment.designId,
                      businessTypes: assignment.businessTypes,
                      selectedOption: assignment.selectedOption,
                      generationResult: assignment.generationResult || {},
                      creativeBrief: assignment.creativeBrief,
                      prompt: assignment.prompt,
                      campaignId: campaignId
                    }}
                    brand={brandData}
                    onOptionSelect={handleOptionSelect}
                    savingChanges={savingChanges}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#2F2F2F]">
            <button
              onClick={() => router.push(`/v2/build/${campaignId}/design`)}
              className="bg-[#2F2F2F] text-[#EAEAEA] px-6 py-3 rounded-lg font-semibold hover:bg-[#3F3F3F] transition-all duration-200 border border-[#2F2F2F]"
            >
              Back to Design
            </button>

            <div className="flex items-center space-x-4">
              {!allDesignsSelected && (
                <div className="text-[#EAEAEA]/60 text-sm">
                  Please select your preferred option for all designs
                </div>
              )}
              
              <button
                onClick={handleProceedToPayment}
                disabled={!allDesignsSelected || savingChanges}
                className={`px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-3 ${
                  allDesignsSelected 
                    ? 'bg-[#00F0FF] text-[#1A1A1A] hover:bg-[#FF00B8] hover:shadow-[0_0_20px_rgba(255,0,184,0.4)]'
                    : 'bg-[#2F2F2F] text-[#EAEAEA]/60 cursor-not-allowed'
                }`}
              >
                {savingChanges ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 