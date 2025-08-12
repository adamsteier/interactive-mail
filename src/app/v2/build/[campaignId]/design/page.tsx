'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  getDocs
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSession } from '@/lib/sessionService';
import { useAuth } from '@/contexts/AuthContext';
import { V2Brand } from '@/v2/types/brand';
import { 
  SimpleDesignRequest,
  queueDesignGeneration, 
  getGenerationStatus,
  DesignGenerationJob
} from '@/v2/services/aiDesignService';
import { CreativeBrief, BriefGenerationRequest } from '@/v2/types/design';
import { getBriefsLibrary } from '@/v2/services/briefManagementService';
import {
  DesignAssignment as DesignAssignmentType,
  createDesignAssignments,
  AssignmentStrategy
} from '@/v2/services/designAssignmentService';
import SimpleDesignForm from '@/v2/components/design/SimpleDesignForm';
import DesignAssignment from '@/v2/components/design/DesignAssignment';
import CampaignProgress from '@/v2/components/CampaignProgress';

type Params = Promise<{ campaignId: string }>;

interface CampaignData {
  id: string;
  brandId: string;
  totalLeadCount: number;
  businessTypes: string[];
  status: string;
  ownerUid: string;
  designAssignments?: DesignAssignmentType[];
  assignmentStrategy?: AssignmentStrategy['type'];
  businessData?: {
    targetArea?: string;
    businessName?: string;
    industry?: string;
    description?: string;
  };
}

interface BusinessTypeWithCount {
  type: string;
  count: number;
}

// Utility function to get business type counts from leads
async function getBusinessTypeCounts(campaignId: string): Promise<BusinessTypeWithCount[]> {
  try {
    const leadsRef = collection(db, 'campaigns', campaignId, 'leads');
    const leadsQuery = query(leadsRef);
    const snapshot = await getDocs(leadsQuery);
    
    const typeCounts: Record<string, number> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // STANDARDIZED: Use searchBusinessType as primary, with backward compatibility fallback
      const businessType = data.searchBusinessType || data.businessType;
      // Also handle V1 'selected' field and V2 status-based selection
      const isSelected = data.selected === true || (data.status && ['selected', 'autopilot_selected'].includes(data.status));
      
      if (businessType && isSelected) {
        typeCounts[businessType] = (typeCounts[businessType] || 0) + 1;
      }
    });
    
    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count
    }));
  } catch (error) {
    console.error('Error getting business type counts:', error);
    return [];
  }
}

// Utility function to get all available business types from leads
async function getAllBusinessTypeCounts(campaignId: string): Promise<BusinessTypeWithCount[]> {
  try {
    const leadsRef = collection(db, 'campaigns', campaignId, 'leads');
    const leadsQuery = query(leadsRef);
    const snapshot = await getDocs(leadsQuery);
    
    const typeCounts: Record<string, number> = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // STANDARDIZED: Use searchBusinessType as primary, with backward compatibility fallback
      const businessType = data.searchBusinessType || data.businessType;
      if (businessType) { // Count all leads, not just selected ones
        typeCounts[businessType] = (typeCounts[businessType] || 0) + 1;
      }
    });
    
    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count
    }));
  } catch (error) {
    console.error('Error getting all business type counts:', error);
    return [];
  }
}

export default function DesignPage({ params }: { params: Params }) {
  const router = useRouter();
  const { user } = useAuth();
  
  // Route params
  const [campaignId, setCampaignId] = useState<string>('');
  
  // Data state
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [brandData, setBrandData] = useState<V2Brand | null>(null);
  const [businessTypeData, setBusinessTypeData] = useState<BusinessTypeWithCount[]>([]);
  const [allBusinessTypes, setAllBusinessTypes] = useState<BusinessTypeWithCount[]>([]);
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<'assignment' | 'forms' | 'generating' | 'complete'>('assignment');
  const [assignments, setAssignments] = useState<DesignAssignmentType[]>([]);
  const [currentDesignIndex, setCurrentDesignIndex] = useState(0);
  const [generationJobs, setGenerationJobs] = useState<Record<string, string>>({}); // designId -> jobId
  const [generationStatus, setGenerationStatus] = useState<Record<string, DesignGenerationJob>>({});
  // const [selectedBrief] = useState<CreativeBrief | null>(null);
  const [briefGenerationRequest, setBriefGenerationRequest] = useState<BriefGenerationRequest | null>(null);
  
  // Existing briefs state
  const [existingBriefs, setExistingBriefs] = useState<CreativeBrief[]>([]);
  const [hasBriefs, setHasBriefs] = useState(false);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle params promise for Next.js 15
  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCampaignId(resolvedParams.campaignId);
    };
    loadParams();
  }, [params]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Await the params promise
        const resolvedParams = await params;
        const id = resolvedParams.campaignId;
        setCampaignId(id);

        if (!id || !user?.uid) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        // Load campaign data
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

        // Validate and load brand if brandId is set
        if (data.brandId) {
          const brandRef = doc(db, 'users', user.uid, 'brands', data.brandId);
          const brandSnap = await getDoc(brandRef);

          if (!brandSnap.exists()) {
            console.warn('Brand not found, redirecting to brand selection');
            router.push(`/v2/build/${id}/brand`);
            return;
          }

          // Load brand data into state so the page can render
          const loadedBrand = { id: brandSnap.id, ...(brandSnap.data() as V2Brand) } as V2Brand;
          setBrandData(loadedBrand);
          
          // Load existing briefs for this campaign
          try {
            const briefs = await getBriefsLibrary(user.uid, { campaignId: id });
            setExistingBriefs(briefs);
            setHasBriefs(briefs.length > 0);
          } catch (briefErr) {
            console.warn('Error loading existing briefs:', briefErr);
            // Don't fail the whole page if briefs can't be loaded
          }
        } else {
          // No brand selected, send back to brand selection step
          router.push(`/v2/build/${id}/brand`);
          return;
        }

        // Prefer campaign businessData; fallback to session if missing
        let combinedBusinessData = data.businessData;
        if (!combinedBusinessData) {
          try {
            const session = await getSession();
            if (session?.businessData) {
              combinedBusinessData = session.businessData;
            }
          } catch (e) {
            console.warn('Could not load session for businessData fallback', e);
          }
        }

        setCampaignData({
          id: campaignSnap.id,
          totalLeadCount: data.totalLeadCount || data.selectedLeadCount || 0, // FIXED: Fallback values
          businessTypes: data.businessTypes || [],
          status: data.status || 'draft',
          ownerUid: data.ownerUid,
          brandId: data.brandId,
          businessData: combinedBusinessData
        });

        // Get business type counts from leads (handles both V1 and V2 data)
        const [selectedTypes, allTypes] = await Promise.all([
          getBusinessTypeCounts(id),
          getAllBusinessTypeCounts(id)
        ]);

        setBusinessTypeData(selectedTypes);
        setAllBusinessTypes(allTypes);

        // Check if assignments already exist
        if (data.designAssignments && data.designAssignments.length > 0) {
          setAssignments(data.designAssignments);
          setCurrentStep('forms');
        }

      } catch (err) {
        console.error('Error loading campaign/brand data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params, user?.uid, router]);

  // Poll generation status
  useEffect(() => {
    if (Object.keys(generationJobs).length === 0) return;

    const pollInterval = setInterval(async () => {
      const updatedStatus: Record<string, DesignGenerationJob> = {};
      let allComplete = true;

      for (const [designId, jobId] of Object.entries(generationJobs)) {
        try {
          const status = await getGenerationStatus(jobId);
          if (status) {
            updatedStatus[designId] = status;
            if (status.status !== 'complete' && status.status !== 'failed') {
              allComplete = false;
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }

      setGenerationStatus(updatedStatus);

      if (allComplete) {
        clearInterval(pollInterval);
        setIsGenerating(false);
        setCurrentStep('complete');
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [generationJobs]);

  // Handle business types change
  const handleBusinessTypesChange = async (newBusinessTypes: BusinessTypeWithCount[]) => {
    try {
      setBusinessTypeData(newBusinessTypes);
      
      // Update campaign document
      await updateDoc(doc(db, 'campaigns', campaignId), {
        businessTypes: newBusinessTypes.map(bt => bt.type),
        selectedLeadCount: newBusinessTypes.reduce((sum, bt) => sum + bt.count, 0),
        totalLeadCount: newBusinessTypes.reduce((sum, bt) => sum + bt.count, 0),
        updatedAt: serverTimestamp()
      });
      
      // TODO: Update actual lead selection in subcollection
      // This would require updating the 'selected' field on leads based on business types
      
    } catch (error) {
      console.error('Error updating business types:', error);
    }
  };

  // Handle business description change
  const handleBusinessDescriptionChange = async (newDescription: string) => {
    try {
      // Update campaign document
      await updateDoc(doc(db, 'campaigns', campaignId), {
        'businessData.description': newDescription,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setCampaignData(prev => prev ? {
        ...prev,
        businessData: {
          ...prev.businessData,
          description: newDescription
        }
      } : null);
      
    } catch (error) {
      console.error('Error updating business description:', error);
    }
  };

  // Handle assignment completion
  const handleAssignmentComplete = async (
    newAssignments: DesignAssignmentType[], 
    strategy: AssignmentStrategy['type']
  ) => {
    try {
      setLoading(true);

      // Save assignments to campaign
      const result = await createDesignAssignments(
        campaignId,
        strategy,
        businessTypeData,
        newAssignments
      );

      if (result.success && result.assignments) {
        setAssignments(result.assignments);
        setCurrentStep('forms');
      } else {
        throw new Error(result.error || 'Failed to create assignments');
      }

    } catch (err) {
      console.error('Error saving assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assignments');
    } finally {
      setLoading(false);
    }
  };

  // Handle design form submission (now auto-processes both briefs)
  const handleDesignSubmit = async (request: SimpleDesignRequest) => {
    if (!brandData || !campaignData) return;

    try {
      setLoading(true);
      
      // Create brief generation request
      const briefRequest: BriefGenerationRequest = {
        campaignId,
        brandId: brandData.id!,
        formData: {
          voice: request.voice,
          goal: request.goal,
          industry: request.industry,
          audience: request.audience,
          businessDescription: request.businessDescription,
          imageryInstructions: undefined // We'll handle this from the form if needed
        },
        businessTypes: businessTypeData
      };
      
      // Generate both briefs automatically
      await handleAutoBriefGeneration(briefRequest);

    } catch (err) {
      console.error('Error processing design:', err);
      setError(err instanceof Error ? err.message : 'Failed to process design');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate briefs and process both for image generation
  const handleAutoBriefGeneration = async (briefRequest: BriefGenerationRequest) => {
    if (!brandData || !user) return;

    try {
      setIsGenerating(true);
      
      // Generate the 2 creative briefs
      const token = await user.getIdToken();
      const response = await fetch('/api/v2/generate-creative-briefs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(briefRequest)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate briefs');
      }

      const result = await response.json();
      
      if (!result.success || !result.briefs || result.briefs.length < 2) {
        throw new Error('Failed to generate both creative briefs');
      }

      // Get the 2 generated briefs
      const [brief1, brief2] = result.briefs;
      
      const currentAssignment = assignments[currentDesignIndex];
      
      // Create design request with both briefs
      const designRequest = {
        brandId: brandData.id!,
        voice: briefRequest.formData.voice as 'professional' | 'friendly' | 'casual' | 'authoritative' | 'creative',
        goal: briefRequest.formData.goal,
        industry: briefRequest.formData.industry,
        audience: briefRequest.formData.audience,
        businessDescription: briefRequest.formData.businessDescription,
        brief1: brief1,
        brief2: brief2
      } as SimpleDesignRequest & { brief1: any; brief2: any };
      
      // Queue generation with both briefs
      const generationResult = await queueDesignGeneration(
        campaignId,
        currentAssignment.designId,
        designRequest,
        brandData
      );

      if (generationResult.success && generationResult.jobId) {
        setGenerationJobs(prev => ({
          ...prev,
          [currentAssignment.designId]: generationResult.jobId!
        }));

        // Move to next design or complete
        if (currentDesignIndex < assignments.length - 1) {
          setCurrentDesignIndex(currentDesignIndex + 1);
          setCurrentStep('forms');
        } else {
          setCurrentStep('generating');
        }
      } else {
        throw new Error(generationResult.error || 'Failed to start generation');
      }

    } catch (err) {
      console.error('Error in auto brief generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate designs');
      setIsGenerating(false);
    }
  };

  // Brief selection functions removed - now auto-processes both briefs

  // Handle completion and navigation
  const handleComplete = async () => {
    try {
      // Update campaign status
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'designs_complete',
        updatedAt: serverTimestamp()
      });

      // Navigate to review
      router.push(`/v2/build/${campaignId}/review`);

    } catch (err) {
      console.error('Error completing designs:', err);
      setError('Failed to complete designs');
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
          <p className="text-[#00F0FF] text-lg font-medium">
            {currentStep === 'assignment' ? 'Loading campaign data...' :
             currentStep === 'forms' ? 'Preparing design forms...' :
             currentStep === 'generating' ? 'Generating designs...' :
             'Processing...'}
          </p>
        </motion.div>
      </div>
    );
  }

  if (error) {
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
          <h1 className="text-2xl font-bold text-[#EAEAEA] mb-4">Something went wrong</h1>
          <p className="text-[#EAEAEA]/60 mb-8">{error}</p>
          <button
            onClick={() => router.push(`/v2/build/${campaignId}/brand`)}
            className="bg-[#00F0FF] text-[#1A1A1A] px-6 py-3 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200"
          >
            Back to Brand Selection
          </button>
        </motion.div>
      </div>
    );
  }

  if (!campaignData || !brandData) {
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
          <p className="text-[#00F0FF] text-lg font-medium">Loading brand...</p>
        </motion.div>
      </div>
    );
  }

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
              {/* Back button */}
              <button
                onClick={() => router.push(`/v2/build/${campaignId}/brand`)}
                className="p-2 rounded-lg bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 transition-colors border border-[#00F0FF]/20"
                title="Back to brand selection"
              >
                <svg className="w-5 h-5 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-12 h-12 rounded-lg bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#EAEAEA] mb-1">
                  AI Campaign Builder
                </h1>
                <p className="text-[#EAEAEA]/60">
                  Step 3 of 5: Create your postcard designs
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
      {campaignId && (
        <CampaignProgress currentStep={3} campaignId={campaignId} currentSubStep="form" />
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {currentStep === 'assignment' && (
            <motion.div
              key="assignment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <DesignAssignment
                businessTypes={businessTypeData}
                totalLeads={campaignData.totalLeadCount}
                onAssignmentComplete={handleAssignmentComplete}
                loading={loading}
              />
            </motion.div>
          )}

          {currentStep === 'forms' && (
            <motion.div
              key="forms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="max-w-4xl mx-auto">
                {/* Progress within forms */}
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-[#EAEAEA] mb-2">
                    Design {currentDesignIndex + 1} of {assignments.length}
                  </h2>
                  <p className="text-[#EAEAEA]/60">
                    {assignments[currentDesignIndex]?.designName} - {assignments[currentDesignIndex]?.leadCount} leads
                  </p>
                  
                  {/* Progress bar */}
                  <div className="w-64 h-2 bg-[#2F2F2F] rounded-full mx-auto mt-4">
                    <motion.div
                      className="h-full bg-[#00F0FF] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${((currentDesignIndex + 1) / assignments.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Show existing briefs if available */}
                {hasBriefs && (
                  <div className="mb-8 p-6 bg-[#1A1A1A] rounded-lg border border-[#2F2F2F]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#EAEAEA]">
                        Your Creative Briefs
                      </h3>
                      <span className="text-sm text-[#EAEAEA]/60">
                        {existingBriefs.length} brief{existingBriefs.length !== 1 ? 's' : ''} saved
                      </span>
                    </div>
                    <p className="text-[#EAEAEA]/70 mb-4">
                      You have existing creative briefs for this campaign. You can manage them or create new ones.
                    </p>
                    <button
                      onClick={() => router.push(`/v2/build/${campaignId}/briefs`)}
                      className="px-6 py-2 bg-[#00F0FF] text-[#0A0A0A] rounded-lg font-medium hover:bg-[#00F0FF]/90 transition-colors"
                    >
                      Manage Creative Briefs
                    </button>
                  </div>
                )}

                <SimpleDesignForm
                  brandId={brandData.id!}
                  businessTypes={businessTypeData}
                  availableBusinessTypes={allBusinessTypes}
                  campaignId={campaignId}
                  onSubmit={handleDesignSubmit}
                  loading={isGenerating}
                  initialIndustry={campaignData.businessData?.industry}
                  initialDescription={campaignData.businessData?.description}
                  onBusinessTypesChange={handleBusinessTypesChange}
                  onBusinessDescriptionChange={handleBusinessDescriptionChange}
                />
              </div>
            </motion.div>
          )}

          {/* Brief selection step removed - now auto-processes both briefs */}

          {currentStep === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-[#EAEAEA] mb-4">
                  Generating Your Designs
                </h2>
                <p className="text-[#EAEAEA]/60 mb-4">
                  AI is creating {assignments.length} unique postcard design{assignments.length > 1 ? 's' : ''} using two different providers for comparison
                </p>
                <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-lg p-4 mb-8 max-w-2xl mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[#00F0FF] font-medium">Estimated Generation Time</span>
                  </div>
                  <p className="text-[#EAEAEA]/80 text-sm">
                    This process typically takes <strong>10-60 seconds</strong> depending on complexity.
                    <br />We&apos;re generating two options simultaneously for quality comparison.
                  </p>
                </div>

                {/* Generation progress */}
                <div className="space-y-6">
                  {assignments.map((assignment) => {
                    const status = generationStatus[assignment.designId];
                    const isComplete = status?.status === 'complete';
                    const isFailed = status?.status === 'failed';
                    const isGenerating = status?.status === 'generating';
                    const progress = status?.progress || 0;

                    return (
                      <div key={assignment.designId} className="bg-[#2F2F2F]/50 rounded-lg p-6 border border-[#00F0FF]/20">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[#EAEAEA] font-medium text-lg">
                            {assignment.designName}
                          </span>
                          <div className="flex items-center gap-3">
                            {isGenerating && (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-[#00F0FF] border-t-transparent rounded-full"
                              />
                            )}
                            <span className={`text-sm font-semibold ${
                              isComplete ? 'text-green-400' : 
                              isFailed ? 'text-[#FF00B8]' : 
                              'text-[#00F0FF]'
                            }`}>
                              {isComplete ? 'Complete' : 
                               isFailed ? 'Failed' : 
                               isGenerating ? `Generating... ${progress}%` :
                               'Queued'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-3 bg-[#1A1A1A] rounded-full mb-6 relative overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isComplete ? 'bg-green-400' :
                              isFailed ? 'bg-[#FF00B8]' :
                              'bg-[#00F0FF]'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ 
                              width: isComplete ? '100%' : 
                                     isFailed ? '100%' : 
                                     `${progress}%` 
                            }}
                            transition={{ duration: 0.5 }}
                          />
                          
                          {/* Shimmer effect during generation */}
                          {isGenerating && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              animate={{ x: ['-100%', '100%'] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                        </div>

                        {/* Status message */}
                        <p className="text-[#EAEAEA]/60 text-sm text-center">
                          {isComplete ? '✨ Ready for review' :
                           isFailed ? '❌ Generation failed - please try again' :
                           isGenerating ? '🎨 Creating your unique design...' :
                           '⏳ Waiting in queue...'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Complete button - only show when all done */}
                {Object.keys(generationStatus).length === assignments.length && 
                 Object.values(generationStatus).every(status => status.status === 'complete' || status.status === 'failed') && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <button
                      onClick={handleComplete}
                      className="bg-[#00F0FF] text-[#1A1A1A] px-8 py-4 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)]"
                    >
                      Continue to Review & Payment
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 10 }}
                  className="w-24 h-24 rounded-full bg-[#00F0FF]/20 flex items-center justify-center mx-auto mb-8 border-4 border-[#00F0FF]"
                >
                  <svg className="w-12 h-12 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                
                <h2 className="text-3xl font-bold text-[#EAEAEA] mb-4">
                  Designs Complete!
                </h2>
                <p className="text-[#EAEAEA]/60 mb-8">
                  Your AI-generated postcards are ready for review. You can compare different options and select your favorites.
                </p>
                
                <button
                  onClick={handleComplete}
                  className="bg-[#00F0FF] text-[#1A1A1A] px-8 py-4 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)]"
                >
                  Review & Select Designs
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 