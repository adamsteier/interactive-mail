'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import BrandSelector from '@/v2/components/brand/BrandSelector';
import BrandCreator from '@/v2/components/brand/BrandCreator';

// Define the params type for Next.js 15
type Params = Promise<{ campaignId: string }>;

interface CampaignData {
  id: string;
  totalLeadCount: number;
  businessTypes: string[];
  status: string;
  ownerUid: string;
}

export default function BrandSelectionPage({ params }: { params: Params }) {
  const router = useRouter();
  const { user } = useAuth();
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string>('');
  const [showBrandCreator, setShowBrandCreator] = useState(false);

  // Handle params promise for Next.js 15
  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setCampaignId(resolvedParams.campaignId);
    };
    loadParams();
  }, [params]);

  // Load campaign data
  useEffect(() => {
    const loadCampaign = async () => {
      if (!campaignId || !user?.uid) return;

      try {
        setLoading(true);
        setError(null);

        const campaignRef = doc(db, 'campaigns', campaignId);
        const campaignSnap = await getDoc(campaignRef);

        if (!campaignSnap.exists()) {
          throw new Error('Campaign not found');
        }

        const data = campaignSnap.data();
        
        // Verify ownership
        if (data.ownerUid !== user.uid) {
          throw new Error('Unauthorized access to campaign');
        }

        setCampaignData({
          id: campaignSnap.id,
          totalLeadCount: data.totalLeadCount || 0,
          businessTypes: data.businessTypes || [],
          status: data.status || 'draft',
          ownerUid: data.ownerUid
        });

      } catch (err) {
        console.error('Error loading campaign:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [campaignId, user?.uid]);

  const handleBrandSelected = async (brandId: string) => {
    if (!campaignData) return;

    try {
      // TODO: Update campaign with selected brand
      console.log('Brand selected:', brandId, 'for campaign:', campaignData.id);
      // await updateDoc(doc(db, 'campaigns', campaignData.id), {
      //   brandId: brandId,
      //   status: 'brand_selected',
      //   updatedAt: serverTimestamp()
      // });

      // Navigate to design step
      router.push(`/v2/build/${campaignData.id}/design`);
      
    } catch (err) {
      console.error('Error saving brand selection:', err);
      setError('Failed to save brand selection');
    }
  };

  const handleCreateNewBrand = () => {
    setShowBrandCreator(true);
  };

  const handleBrandCreated = async (brandId: string) => {
    setShowBrandCreator(false);
    // Auto-select the newly created brand
    await handleBrandSelected(brandId);
  };

  const handleCancelBrandCreation = () => {
    setShowBrandCreator(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        {/* Animated wave loader following brand guidelines */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative mb-6">
            {/* Wave animation */}
            <div className="flex space-x-1">
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
          </div>
          <p className="text-[#00F0FF] text-lg font-medium">
            Loading your campaign...
          </p>
          <p className="text-[#EAEAEA]/60 text-sm mt-2">
            Preparing brand selection
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
          {/* Error state with neon glow effect */}
          <div className="w-16 h-16 rounded-full bg-[#FF00B8]/20 flex items-center justify-center mx-auto mb-6 border border-[#FF00B8]/40">
            <svg className="w-8 h-8 text-[#FF00B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#EAEAEA] mb-4">
            Something went wrong
          </h1>
          <p className="text-[#EAEAEA]/60 mb-8">
            {error}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#00F0FF] text-[#1A1A1A] px-6 py-3 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,0,184,0.5)]"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  if (!campaignData) {
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

      {/* Campaign info header with wave design */}
      <div className="relative z-10 border-b border-[#00F0FF]/20 bg-[#1A1A1A]/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center space-x-4">
              {/* Wave icon */}
              <div className="w-12 h-12 rounded-lg bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#EAEAEA] mb-1">
                  AI Campaign Builder
                </h1>
                <p className="text-[#EAEAEA]/60">
                  Step 1 of 4: Choose your brand
                </p>
              </div>
            </div>
            
            {/* Campaign summary with neon styling */}
            <div className="text-right">
              <div className="bg-[#2F2F2F]/50 rounded-lg px-4 py-3 border border-[#00F0FF]/20">
                <div className="text-sm text-[#EAEAEA]/60 mb-1">Your Campaign</div>
                <div className="text-[#00F0FF] font-semibold">
                  {campaignData.totalLeadCount} leads • {campaignData.businessTypes.join(', ')}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Progress indicator with wave animation */}
      <div className="relative z-10 bg-[#1A1A1A]/90 backdrop-blur-sm border-b border-[#2F2F2F]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-8">
            {[
              { step: 1, label: 'Brand', active: true },
              { step: 2, label: 'Design', active: false },
              { step: 3, label: 'Review', active: false },
              { step: 4, label: 'Payment', active: false }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                  ${item.active 
                    ? 'bg-[#00F0FF] text-[#1A1A1A] shadow-[0_0_20px_rgba(0,240,255,0.4)]' 
                    : 'bg-[#2F2F2F] text-[#EAEAEA]/60'
                  }
                `}>
                  {item.step}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  item.active ? 'text-[#00F0FF]' : 'text-[#EAEAEA]/60'
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
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {showBrandCreator ? (
          <BrandCreator
            onSuccess={handleBrandCreated}
            onCancel={handleCancelBrandCreation}
            campaignId={campaignData.id}
            mode="page"
          />
        ) : (
          <BrandSelector
            leadCount={campaignData.totalLeadCount}
            businessTypes={campaignData.businessTypes}
            onBrandSelected={handleBrandSelected}
            onCreateNew={handleCreateNewBrand}
          />
        )}
      </motion.div>
    </div>
  );
} 