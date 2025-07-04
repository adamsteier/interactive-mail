'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

// Components
import DesignAssignment from '@/v2/components/design/DesignAssignment';
import SimpleDesignForm from '@/v2/components/design/SimpleDesignForm';

// Services
import { 
  DesignAssignment as DesignAssignmentType, 
  AssignmentStrategy,
  createDesignAssignments 
} from '@/v2/services/designAssignmentService';
import { 
  SimpleDesignRequest,
  queueDesignGeneration,
  getGenerationStatus,
  DesignGenerationJob
} from '@/v2/services/aiDesignService';
import { V2Brand } from '@/v2/types/brand';

// Define the params type for Next.js 15
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
}

interface BusinessTypeData {
  type: string;
  count: number;
}

export default function DesignPage({ params }: { params: Params }) {
  const router = useRouter();
  const { user } = useAuth();
  
  // Route params
  const [campaignId, setCampaignId] = useState<string>('');
  
  // Data state
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [brandData, setBrandData] = useState<V2Brand | null>(null);
  const [businessTypeData, setBusinessTypeData] = useState<BusinessTypeData[]>([]);
  
  // Flow state
  const [currentStep, setCurrentStep] = useState<'assignment' | 'forms' | 'generating' | 'complete'>('assignment');
  const [assignments, setAssignments] = useState<DesignAssignmentType[]>([]);
  const [currentDesignIndex, setCurrentDesignIndex] = useState(0);
  const [generationJobs, setGenerationJobs] = useState<Record<string, string>>({}); // designId -> jobId
  const [generationStatus, setGenerationStatus] = useState<Record<string, DesignGenerationJob>>({});
  
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
      if (!campaignId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        // Load campaign data
        const campaignRef = doc(db, 'campaigns', campaignId);
        const campaignSnap = await getDoc(campaignRef);

        if (!campaignSnap.exists()) {
          throw new Error('Campaign not found');
        }

        const campaignDataFromFirestore = campaignSnap.data();
        
        // Verify ownership
        if (campaignDataFromFirestore.ownerUid !== user.uid) {
          throw new Error('Unauthorized access to campaign');
        }

        setCampaignData({ ...campaignDataFromFirestore, id: campaignSnap.id } as CampaignData);

        // Load brand data
        if (campaignDataFromFirestore.brandId) {
          const brandRef = doc(db, 'users', user.uid, 'brands', campaignDataFromFirestore.brandId);
          const brandSnap = await getDoc(brandRef);
          
          if (brandSnap.exists()) {
            setBrandData({ id: brandSnap.id, ...brandSnap.data() } as V2Brand);
          }
        }

        // Calculate business type data (this would normally come from lead analysis)
        const businessTypeData: BusinessTypeData[] = (campaignDataFromFirestore.businessTypes as string[]).map((type: string) => ({
          type,
          count: Math.floor(campaignDataFromFirestore.totalLeadCount / campaignDataFromFirestore.businessTypes.length) // Simple distribution
        }));
        setBusinessTypeData(businessTypeData);

        // Check if assignments already exist
        if (campaignDataFromFirestore.designAssignments && campaignDataFromFirestore.designAssignments.length > 0) {
          setAssignments(campaignDataFromFirestore.designAssignments);
          setCurrentStep('forms');
        }

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId, user?.uid]);

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

  // Handle design form submission
  const handleDesignSubmit = async (request: SimpleDesignRequest) => {
    if (!brandData || !campaignData) return;

    try {
      setIsGenerating(true);
      
      const currentAssignment = assignments[currentDesignIndex];
      
      // Queue generation
      const result = await queueDesignGeneration(
        campaignId,
        currentAssignment.designId,
        request,
        brandData
      );

      if (result.success && result.jobId) {
        setGenerationJobs(prev => ({
          ...prev,
          [currentAssignment.designId]: result.jobId!
        }));

        // Move to next design or complete
        if (currentDesignIndex < assignments.length - 1) {
          setCurrentDesignIndex(currentDesignIndex + 1);
        } else {
          setCurrentStep('generating');
        }
      } else {
        throw new Error(result.error || 'Failed to start generation');
      }

    } catch (err) {
      console.error('Error submitting design:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit design');
      setIsGenerating(false);
    }
  };

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
    return null;
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
              <div className="w-12 h-12 rounded-lg bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#EAEAEA] mb-1">
                  Design Creation
                </h1>
                <p className="text-[#EAEAEA]/60">
                  Step 2 of 4: Create your postcard designs
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
              { step: 2, label: 'Design', active: true, complete: false },
              { step: 3, label: 'Review', active: false, complete: false },
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

                <SimpleDesignForm
                  brandId={brandData.id!}
                  businessTypes={assignments[currentDesignIndex]?.businessTypes || []}
                  onSubmit={handleDesignSubmit}
                  onToggleAdvanced={() => {}} // TODO: Implement advanced mode
                  loading={isGenerating}
                />
              </div>
            </motion.div>
          )}

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
                              isComplete ? 'bg-green-500' :
                              isFailed ? 'bg-[#FF00B8]' :
                              'bg-[#00F0FF]'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                          {isGenerating && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                              animate={{ x: [-100, 300] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                        </div>

                        {/* Status Messages */}
                        {!isComplete && !isFailed && (
                          <div className="text-center mb-4">
                            <p className="text-[#EAEAEA]/60 text-sm">
                              {progress < 20 && "Initializing AI generation..."}
                              {progress >= 20 && progress < 40 && "Loading brand and design requirements..."}
                              {progress >= 40 && progress < 80 && "Creating design options with both AI providers..."}
                              {progress >= 80 && progress < 100 && "Finalizing and processing results..."}
                            </p>
                          </div>
                        )}

                        {/* Dual Provider Results - Blind A/B Testing */}
                        {isComplete && status?.result && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="space-y-4"
                          >
                            <h4 className="text-[#00F0FF] font-semibold mb-4 text-center">
                              Generated Design Options - Choose Your Preferred Version
                            </h4>
                            
                            <div className="grid md:grid-cols-2 gap-6">
                              {/* Option A */}
                              <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2F2F2F] hover:border-[#00F0FF]/50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-[#EAEAEA] font-medium flex items-center gap-2">
                                    <div className="w-6 h-6 bg-[#00F0FF] text-[#1A1A1A] rounded-full flex items-center justify-center text-sm font-bold">
                                      A
                                    </div>
                                    Option A
                                  </h5>
                                  <span className="text-xs text-[#EAEAEA]/60">
                                    {status.result.openai?.executionTime}ms
                                  </span>
                                </div>
                                
                                {status.result.openai?.frontImageUrl ? (
                                  <div className="relative group">
                                    <img
                                      src={status.result.openai.frontImageUrl}
                                      alt="Design Option A"
                                      className="w-full h-40 object-cover rounded-lg border border-[#2F2F2F] group-hover:border-[#00F0FF]/50 transition-colors"
                                      onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/400x267?text=Option+A+Generation+Failed';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                                  </div>
                                ) : (
                                  <div className="w-full h-40 bg-[#2F2F2F] rounded-lg border border-[#FF00B8]/40 flex items-center justify-center">
                                    <span className="text-[#FF00B8] text-sm">Generation Failed</span>
                                  </div>
                                )}
                              </div>

                              {/* Option B */}
                              <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2F2F2F] hover:border-[#00F0FF]/50 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="text-[#EAEAEA] font-medium flex items-center gap-2">
                                    <div className="w-6 h-6 bg-[#FF00B8] text-white rounded-full flex items-center justify-center text-sm font-bold">
                                      B
                                    </div>
                                    Option B
                                  </h5>
                                  <span className="text-xs text-[#EAEAEA]/60">
                                    {status.result.ideogram?.executionTime}ms
                                  </span>
                                </div>
                                
                                {status.result.ideogram?.frontImageUrl ? (
                                  <div className="relative group">
                                    <img
                                      src={status.result.ideogram.frontImageUrl}
                                      alt="Design Option B"
                                      className="w-full h-40 object-cover rounded-lg border border-[#2F2F2F] group-hover:border-[#00F0FF]/50 transition-colors"
                                      onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/400x267?text=Option+B+Generation+Failed';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                                  </div>
                                ) : (
                                  <div className="w-full h-40 bg-[#2F2F2F] rounded-lg border border-[#FF00B8]/40 flex items-center justify-center">
                                    <span className="text-[#FF00B8] text-sm">Generation Failed</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Comparison Stats */}
                            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2F2F2F] mt-4">
                              <h6 className="text-[#EAEAEA] font-medium mb-3">Generation Statistics</h6>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-[#EAEAEA]/60">Option A Speed:</span>
                                  <span className="text-[#EAEAEA] ml-2">{status.result.openai?.executionTime || 0}ms</span>
                                </div>
                                <div>
                                  <span className="text-[#EAEAEA]/60">Option B Speed:</span>
                                  <span className="text-[#EAEAEA] ml-2">{status.result.ideogram?.executionTime || 0}ms</span>
                                </div>
                                <div>
                                  <span className="text-[#EAEAEA]/60">Faster Option:</span>
                                  <span className="text-[#00F0FF] ml-2">
                                    {(status.result.openai?.executionTime || Infinity) < (status.result.ideogram?.executionTime || Infinity) ? 'Option A' : 'Option B'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[#EAEAEA]/60">Both Generated:</span>
                                  <span className={`ml-2 ${
                                    status.result.openai?.frontImageUrl && status.result.ideogram?.frontImageUrl 
                                      ? 'text-green-400' : 'text-[#FF00B8]'
                                  }`}>
                                    {status.result.openai?.frontImageUrl && status.result.ideogram?.frontImageUrl ? 'Yes' : 'No'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Selection Buttons for Blind Testing */}
                            <div className="flex gap-4 mt-6">
                              <button 
                                className="flex-1 bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] py-3 px-4 rounded-lg hover:bg-[#00F0FF]/30 transition-colors font-medium flex items-center justify-center gap-2"
                                onClick={() => {
                                  // TODO: Mark Option A as preferred
                                  console.log('Preferred Option A (OpenAI) for', assignment.designId);
                                }}
                              >
                                <div className="w-5 h-5 bg-[#00F0FF] text-[#1A1A1A] rounded-full flex items-center justify-center text-xs font-bold">
                                  A
                                </div>
                                Choose Option A
                              </button>
                              <button 
                                className="flex-1 bg-[#FF00B8]/20 border border-[#FF00B8]/40 text-[#FF00B8] py-3 px-4 rounded-lg hover:bg-[#FF00B8]/30 transition-colors font-medium flex items-center justify-center gap-2"
                                onClick={() => {
                                  // TODO: Mark Option B as preferred
                                  console.log('Preferred Option B (Ideogram) for', assignment.designId);
                                }}
                              >
                                <div className="w-5 h-5 bg-[#FF00B8] text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  B
                                </div>
                                Choose Option B
                              </button>
                            </div>

                            <p className="text-center text-[#EAEAEA]/60 text-xs mt-4">
                              Select your preferred design option. This helps us improve our AI generation quality.
                            </p>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
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
                <div className="w-20 h-20 rounded-full bg-[#00F0FF]/20 flex items-center justify-center mx-auto mb-6 border-2 border-[#00F0FF]">
                  <svg className="w-10 h-10 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h2 className="text-3xl font-bold text-[#EAEAEA] mb-4">
                  Designs Complete!
                </h2>
                <p className="text-[#EAEAEA]/60 mb-8">
                  {assignments.length} unique design{assignments.length > 1 ? 's' : ''} generated successfully. Ready for review.
                </p>

                <button
                  onClick={handleComplete}
                  className="bg-[#00F0FF] text-[#1A1A1A] px-8 py-4 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.4)] flex items-center gap-3 mx-auto"
                >
                  Review Designs
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 