'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { addDays, format, isWeekend, startOfDay } from 'date-fns';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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
  selectedOption?: 'A' | 'B';
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

// Utility functions
const addBusinessDays = (date: Date, days: number): Date => {
  let result = new Date(date);
  let daysToAdd = days;
  
  while (daysToAdd > 0) {
    result = addDays(result, 1);
    if (!isWeekend(result)) {
      daysToAdd--;
    }
  }
  
  return result;
};

const getMinimumSendDate = (): Date => {
  const now = new Date();
  const plus36Hours = addDays(now, 1.5); // 36 hours from now
  return startOfDay(plus36Hours);
};

const getEstimatedDelivery = (sendDate: Date) => {
  const start = addBusinessDays(sendDate, 5);
  const end = addBusinessDays(sendDate, 10);
  return { start, end };
};

// Stripe Payment Component
function PaymentForm({ 
  campaignData, 
  selectedSendDate, 
  onPaymentSuccess,
  onPaymentError,
  processing,
  setProcessing
}: {
  campaignData: CampaignData;
  selectedSendDate: Date;
  onPaymentSuccess: (paymentIntentId: string) => void;
  onPaymentError: (error: string) => void;
  processing: boolean;
  setProcessing: (processing: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [clientSecret, setClientSecret] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Create payment intent
  useEffect(() => {
    if (!campaignData?.pricing?.totalCost) return;

    const createPaymentIntent = async () => {
      try {
        // Get Firebase auth token
        const user = auth.currentUser;
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const idToken = await user.getIdToken();

        const response = await fetch('/api/v2/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            campaignId: campaignData.id,
            amount: Math.round(campaignData.pricing!.totalCost * 100), // Convert to cents
            scheduledSendDate: selectedSendDate.toISOString(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payment. Please try again.');
      }
    };

    createPaymentIntent();
  }, [campaignData, selectedSendDate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Payment form not loaded');
      setProcessing(false);
      return;
    }

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: 'Campaign Payment',
        },
      },
    });

    if (error) {
      setError(error.message || 'Payment failed');
      onPaymentError(error.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent.status === 'succeeded') {
      onPaymentSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[#2F2F2F]/50 rounded-lg p-6 border border-[#00F0FF]/20">
        <h3 className="text-lg font-semibold text-[#EAEAEA] mb-4">Payment Information</h3>
        
        <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2F2F2F]">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#EAEAEA',
                  '::placeholder': {
                    color: '#EAEAEA60',
                  },
                },
                invalid: {
                  color: '#FF00B8',
                },
              },
            }}
          />
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#FF00B8]/10 border border-[#FF00B8]/40 rounded-lg">
            <p className="text-[#FF00B8] text-sm">{error}</p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 ${
          processing 
            ? 'bg-[#2F2F2F] text-[#EAEAEA]/60 cursor-not-allowed'
            : 'bg-[#00F0FF] text-[#1A1A1A] hover:bg-[#FF00B8] hover:shadow-[0_0_20px_rgba(255,0,184,0.4)]'
        }`}
      >
        {processing ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
            />
            Processing Payment...
          </>
        ) : (
          <>
            Complete Payment - ${campaignData.pricing?.totalCost?.toFixed(2)}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}

// Main Checkout Page Component
export default function CheckoutPage({ params }: { params: Params }) {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [campaignId, setCampaignId] = useState<string>('');
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSendDate, setSelectedSendDate] = useState<Date>(getMinimumSendDate());
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

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

      } catch (err) {
        console.error('Error loading checkout data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [campaignId, user]);

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      // Update campaign with payment info
      await updateDoc(doc(db, 'campaigns', campaignId), {
        status: 'paid',
        paymentIntentId,
        scheduledSendDate: selectedSendDate,
        estimatedDelivery: getEstimatedDelivery(selectedSendDate),
        paidAt: new Date(),
        updatedAt: new Date(),
      });

      setPaymentSuccess(true);
      
      // Redirect to success page after 3 seconds
      setTimeout(() => {
        router.push(`/v2/dashboard?campaign=${campaignId}&status=paid`);
      }, 3000);

    } catch (err) {
      console.error('Error updating campaign:', err);
      setError('Payment succeeded but failed to update campaign. Please contact support.');
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setProcessing(false);
  };

  const minDate = getMinimumSendDate();
  const maxDate = addDays(new Date(), 90);
  const estimatedDelivery = getEstimatedDelivery(selectedSendDate);

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
          <p className="text-[#00F0FF] text-lg font-medium">Loading checkout...</p>
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
          <h1 className="text-2xl font-bold text-[#EAEAEA] mb-4">Unable to Load Checkout</h1>
          <p className="text-[#EAEAEA]/60 mb-8">{error || 'Campaign data not found'}</p>
          <button
            onClick={() => router.push(`/v2/build/${campaignId}/review`)}
            className="bg-[#00F0FF] text-[#1A1A1A] px-6 py-3 rounded-lg font-semibold hover:bg-[#FF00B8] transition-all duration-200"
          >
            Back to Review
          </button>
        </motion.div>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <motion.div 
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-20 h-20 rounded-full bg-[#00F0FF]/20 flex items-center justify-center mx-auto mb-6 border border-[#00F0FF]/40">
            <svg className="w-10 h-10 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#EAEAEA] mb-4">Payment Successful!</h1>
          <p className="text-[#EAEAEA]/60 mb-6">
            Your campaign has been created and scheduled for {format(selectedSendDate, 'EEEE, MMMM d, yyyy')}.
          </p>
          <div className="bg-[#2F2F2F]/50 rounded-lg p-4 border border-[#00F0FF]/20 mb-6">
            <div className="text-sm text-[#EAEAEA]/60 mb-2">Estimated Delivery</div>
            <div className="text-[#00F0FF] font-semibold">
              {format(estimatedDelivery.start, 'MMM d')} - {format(estimatedDelivery.end, 'MMM d, yyyy')}
            </div>
          </div>
          <p className="text-[#EAEAEA]/60 text-sm mb-8">
            Redirecting to dashboard in a few seconds...
          </p>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full mx-auto"
          />
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
              <div className="w-12 h-12 rounded-lg bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/20">
                <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#EAEAEA] mb-1">
                  Payment & Scheduling
                </h1>
                <p className="text-[#EAEAEA]/60">
                  Step 4 of 4: Complete your campaign
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
              { step: 3, label: 'Review', active: false, complete: true },
              { step: 4, label: 'Payment', active: true, complete: false }
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
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid lg:grid-cols-2 gap-8"
        >
          {/* Left Column - Order Summary */}
          <div className="space-y-6">
            <div className="bg-[#2F2F2F]/50 rounded-lg p-6 border border-[#00F0FF]/20">
              <h2 className="text-xl font-bold text-[#EAEAEA] mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#EAEAEA]/80">Total Recipients</span>
                  <span className="text-[#00F0FF] font-semibold">{campaignData.totalLeadCount}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#EAEAEA]/80">Price per Postcard</span>
                  <span className="text-[#00F0FF] font-semibold">${campaignData.pricing?.pricePerLead?.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[#EAEAEA]/80">Pricing Tier</span>
                  <span className="text-[#00F0FF] font-semibold">{campaignData.pricing?.tierApplied}</span>
                </div>
                
                <div className="border-t border-[#2F2F2F] pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#EAEAEA] font-semibold">Total Cost</span>
                    <span className="text-[#00F0FF] font-bold text-xl">${campaignData.pricing?.totalCost?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling Section */}
            <div className="bg-[#2F2F2F]/50 rounded-lg p-6 border border-[#00F0FF]/20">
              <h2 className="text-xl font-bold text-[#EAEAEA] mb-4">When should we send your postcards?</h2>
              
              {/* ASAP Option */}
              <button
                onClick={() => setSelectedSendDate(minDate)}
                className={`w-full mb-4 p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedSendDate.getTime() === minDate.getTime()
                    ? 'border-[#00F0FF] bg-[#00F0FF]/10'
                    : 'border-[#2F2F2F] hover:border-[#00F0FF]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">🚀</div>
                    <div className="text-left">
                      <div className="text-[#EAEAEA] font-semibold">ASAP (Ships {format(minDate, 'EEEE')})</div>
                      <div className="text-[#EAEAEA]/60 text-sm">Recommended for fastest delivery</div>
                    </div>
                  </div>
                  {selectedSendDate.getTime() === minDate.getTime() && (
                    <div className="w-6 h-6 bg-[#00F0FF] rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#1A1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>

              {/* Custom Date Selection */}
              <div className="mb-4">
                <label className="block text-[#EAEAEA] font-medium mb-2">Or choose a specific date:</label>
                <input
                  type="date"
                  value={format(selectedSendDate, 'yyyy-MM-dd')}
                  min={format(minDate, 'yyyy-MM-dd')}
                  max={format(maxDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedSendDate(new Date(e.target.value))}
                  className="w-full p-3 bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg text-[#EAEAEA] focus:border-[#00F0FF] focus:outline-none"
                />
              </div>

              {/* Estimated Delivery */}
              <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2F2F2F]">
                <div className="text-sm text-[#EAEAEA]/60 mb-2">Estimated Delivery</div>
                <div className="text-[#00F0FF] font-semibold">
                  {format(estimatedDelivery.start, 'MMM d')} - {format(estimatedDelivery.end, 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-[#EAEAEA]/40 mt-1">
                  Delivery times may vary based on USPS
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Payment Form */}
          <div className="space-y-6">
            <Elements stripe={stripePromise}>
              <PaymentForm
                campaignData={campaignData}
                selectedSendDate={selectedSendDate}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
                processing={processing}
                setProcessing={setProcessing}
              />
            </Elements>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#2F2F2F]">
          <button
            onClick={() => router.push(`/v2/build/${campaignId}/review`)}
            className="bg-[#2F2F2F] text-[#EAEAEA] px-6 py-3 rounded-lg font-semibold hover:bg-[#3F3F3F] transition-all duration-200 border border-[#2F2F2F]"
          >
            Back to Review
          </button>
          
          <div className="text-[#EAEAEA]/60 text-sm">
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Your payment is secure and encrypted
          </div>
        </div>
      </div>
    </div>
  );
} 