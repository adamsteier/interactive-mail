'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

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
  pricing?: {
    totalCost: number;
    pricePerLead: number;
    tierApplied: string;
  };
}

interface BrandData {
  id: string;
  name: string;
  logo?: {
    url: string;
    aspectRatio: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface DesignAssignmentType {
  designId: string;
  designName: string;
  businessTypes: string[];
  leadCount: number;
  selectedOption?: 'A' | 'B'; // User's A/B choice
  generationResult?: {
    openai?: {
      frontImageUrl?: string;
      executionTime?: number;
    };
    ideogram?: {
      frontImageUrl?: string;
      executionTime?: number;
    };
  };
}

export default function ReviewPage({ params }: { params: Params }) {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [campaignId, setCampaignId] = useState<string>('');
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
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

        // Load brand data
        const brandDoc = await getDoc(
          doc(db, 'users', user.uid, 'brands', campaign.brandId)
        );
        
        if (brandDoc.exists()) {
          setBrandData({ id: brandDoc.id, ...brandDoc.data() } as BrandData);
        }

        // Load generation status for each design
        const designsWithResults = await Promise.all(
          (campaign.designAssignments || []).map(async (assignment) => {
            try {
              const statusDoc = await getDoc(
                doc(db, 'campaigns', campaignId, 'generationStatus', assignment.designId)
              );
              
              if (statusDoc.exists()) {
                const statusData = statusDoc.data();
                return {
                  ...assignment,
                  generationResult: statusData.result,
                  selectedOption: statusData.selectedOption || undefined
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
        ? assignment.generationResult?.openai
        : assignment.generationResult?.ideogram;
      
      return {
        ...assignment,
        selectedImageUrl: selectedResult?.frontImageUrl,
        selectedProvider: assignment.selectedOption === 'A' ? 'OpenAI gpt-image-1' : 'Ideogram 3.0',
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
              <div key={assignment.designId} className="bg-[#2F2F2F]/50 rounded-lg border border-[#00F0FF]/20 overflow-hidden">
                <div className="p-6 border-b border-[#2F2F2F]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#EAEAEA]">{assignment.designName}</h3>
                    <div className="flex items-center space-x-4">
                      <span className="text-[#EAEAEA]/60 text-sm">
                        {assignment.leadCount} recipients
                      </span>
                      {assignment.selectedOption && (
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            assignment.selectedOption === 'A' ? 'bg-[#00F0FF]' : 'bg-[#FF00B8]'
                          }`} />
                          <span className="text-[#EAEAEA] font-medium">
                            Option {assignment.selectedOption} Selected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {assignment.businessTypes.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-[#00F0FF]/10 text-[#00F0FF] rounded-full text-sm border border-[#00F0FF]/20"
                      >
                        {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>

                {/* A/B Comparison */}
                {assignment.generationResult && (
                  <div className="p-6">
                    <h4 className="text-lg font-semibold text-[#EAEAEA] mb-6 text-center">
                      Select Your Preferred Design
                    </h4>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Option A */}
                      <div className={`relative rounded-lg border-2 transition-all duration-200 ${
                        assignment.selectedOption === 'A' 
                          ? 'border-[#00F0FF] bg-[#00F0FF]/5' 
                          : 'border-[#2F2F2F] hover:border-[#00F0FF]/50'
                      }`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-[#EAEAEA] font-medium flex items-center gap-2">
                              <div className="w-6 h-6 bg-[#00F0FF] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                                A
                              </div>
                              Option A
                            </h5>
                            <span className="text-xs text-[#EAEAEA]/60">
                              {assignment.generationResult.openai?.executionTime}ms
                            </span>
                          </div>
                          
                          {assignment.generationResult.openai?.frontImageUrl ? (
                            <div className="relative group mb-4">
                              <img
                                src={assignment.generationResult.openai.frontImageUrl}
                                alt="Option A Design"
                                className="w-full h-40 object-cover rounded-lg"
                              />
                              {assignment.selectedOption === 'A' && (
                                <div className="absolute inset-0 bg-[#00F0FF]/10 rounded-lg flex items-center justify-center">
                                  <div className="w-8 h-8 bg-[#00F0FF] rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-40 bg-[#2F2F2F] rounded-lg border border-[#FF00B8]/40 flex items-center justify-center mb-4">
                              <span className="text-[#FF00B8] text-sm">Generation Failed</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleOptionSelect(assignment.designId, 'A')}
                            disabled={!assignment.generationResult.openai?.frontImageUrl || savingChanges}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                              assignment.selectedOption === 'A'
                                ? 'bg-[#00F0FF] text-[#1A1A1A]'
                                : 'bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] hover:bg-[#00F0FF]/30'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {assignment.selectedOption === 'A' ? 'Selected' : 'Select Option A'}
                          </button>
                        </div>
                      </div>

                      {/* Option B */}
                      <div className={`relative rounded-lg border-2 transition-all duration-200 ${
                        assignment.selectedOption === 'B' 
                          ? 'border-[#FF00B8] bg-[#FF00B8]/5' 
                          : 'border-[#2F2F2F] hover:border-[#FF00B8]/50'
                      }`}>
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-[#EAEAEA] font-medium flex items-center gap-2">
                              <div className="w-6 h-6 bg-[#FF00B8] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                B
                              </div>
                              Option B
                            </h5>
                            <span className="text-xs text-[#EAEAEA]/60">
                              {assignment.generationResult.ideogram?.executionTime}ms
                            </span>
                          </div>
                          
                          {assignment.generationResult.ideogram?.frontImageUrl ? (
                            <div className="relative group mb-4">
                              <img
                                src={assignment.generationResult.ideogram.frontImageUrl}
                                alt="Option B Design"
                                className="w-full h-40 object-cover rounded-lg"
                              />
                              {assignment.selectedOption === 'B' && (
                                <div className="absolute inset-0 bg-[#FF00B8]/10 rounded-lg flex items-center justify-center">
                                  <div className="w-8 h-8 bg-[#FF00B8] rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-40 bg-[#2F2F2F] rounded-lg border border-[#FF00B8]/40 flex items-center justify-center mb-4">
                              <span className="text-[#FF00B8] text-sm">Generation Failed</span>
                            </div>
                          )}

                          <button
                            onClick={() => handleOptionSelect(assignment.designId, 'B')}
                            disabled={!assignment.generationResult.ideogram?.frontImageUrl || savingChanges}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                              assignment.selectedOption === 'B'
                                ? 'bg-[#FF00B8] text-white'
                                : 'bg-[#FF00B8]/20 border border-[#FF00B8]/40 text-[#FF00B8] hover:bg-[#FF00B8]/30'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {assignment.selectedOption === 'B' ? 'Selected' : 'Select Option B'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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