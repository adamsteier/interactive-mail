'use client';

import { useState, useEffect, useCallback } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import TypewriterPrompt from '@/components/TypewriterPrompt';
import InputField from '@/components/InputField';
import InfoBox from '@/components/InfoBox';
import LoadingBar from '@/components/LoadingBar';
import EditModal from '@/components/EditModal';
import MarketingResults from '@/components/MarketingResults';
import { MarketingStrategy } from '@/types/marketing';
import { useMarketingStore } from '@/store/marketingStore';

interface LocationData {
  city: string;
  region: string;
  country: string;
}

interface Answer {
  label: string;
  value: string;
}

interface BusinessAnalysis {
  industry: string;
  description: string;
  customerTypes: string[];
  boundingBox: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
}

interface DisplayInfo {
  label: string;
  value: string;
  type: 'answer' | 'analysis';
  position?: 'first' | 'inline' | 'below';
  subInfo?: {
    industry: string;
    description: string;
  };
}

interface EditableInfo {
  targetArea: string;
  businessName: string;
  industry: string;
  description: string;
}

const LoadingSkeleton = () => (
  <div className="w-full rounded-lg border-2 border-electric-teal bg-charcoal/80 px-4 md:px-6 py-3 shadow-glow backdrop-blur-sm">
    <div className="text-sm text-electric-teal/80 mb-2">Industry</div>
    <LoadingBar height="28px" />
    <div className="text-sm text-electric-teal/80 mb-2 mt-4">Business Description</div>
    <LoadingBar height="48px" />
  </div>
);

export default function Home() {
  const { 
    locationData,
    businessInfo,
    currentStep,
    setLocationData,
    updateBusinessInfo,
    setStep,
    setBusinessAnalysis: setStoreBusinessAnalysis
  } = useMarketingStore();

  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputPosition, setInputPosition] = useState<{ top: number; height: number }>();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [displayInfos, setDisplayInfos] = useState<DisplayInfo[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [marketingStrategy, setMarketingStrategy] = useState<MarketingStrategy | null>(null);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const welcomeText = "Let's find you some new business. Tell me a little bit about your customers or who you're trying to reach.";
  
  const prompts = [
    {
      text: `${welcomeText}\nWhere do you want to target? You can be descriptive and use terms like North ${locationData?.city || 'Toronto'}.`,
      placeholder: "Type City, Province, Area, Neighbourhood"
    },
    {
      text: "What's the name of your business?",
      placeholder: "Enter your business name"
    }
  ];

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await fetch('/api/location');
        const data = await response.json();
        setLocationData({
          city: data.city,
          region: data.region,
          country: data.country
        });
      } catch (error) {
        console.error('Failed to fetch location:', error);
      }
    };

    if (!locationData) {
      fetchLocation();
    }
  }, [locationData, setLocationData]);

  useEffect(() => {
    // Update display infos whenever answers or business analysis change
    const newDisplayInfos: DisplayInfo[] = [
      ...answers.map((answer, index) => ({
        ...answer,
        type: 'answer' as const,
        position: index === 0 ? 'first' as const : 'inline' as const
      })),
      ...(businessInfo.businessAnalysis ? [
        {
          label: "Industry & Description",
          value: businessInfo.businessAnalysis.industry,
          type: 'analysis' as const,
          position: 'below' as const,
          subInfo: {
            industry: businessInfo.businessAnalysis.industry,
            description: businessInfo.businessAnalysis.description
          }
        }
      ] : [])
    ];
    setDisplayInfos(newDisplayInfos);
  }, [answers, businessInfo.businessAnalysis]);

  const handleSubmit = async (input: string) => {
    setIsProcessing(true);
    try {
      if (currentStep === 0) {
        updateBusinessInfo({ targetArea: input });
        setStep(1);
      } else if (currentStep === 1) {
        updateBusinessInfo({ businessName: input });
        
        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetArea: businessInfo.targetArea,
            businessName: input,
            userLocation: locationData?.city || 'Toronto',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const data = await response.json();
        if (data.analysis) {
          setStoreBusinessAnalysis(data.analysis);
        }
        setStep(2);
      }
      setUserInput('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePositionChange = useCallback((position: { top: number; height: number }) => {
    setInputPosition(position);
  }, []);

  const handleSaveEdits = (editedInfo: EditableInfo) => {
    // Update answers
    setAnswers([
      { label: "Target Area", value: editedInfo.targetArea },
      { label: "Your Business Name", value: editedInfo.businessName },
    ]);

    // Update business analysis
    setStoreBusinessAnalysis(prev => ({
      ...prev!,
      industry: editedInfo.industry,
      description: editedInfo.description,
    }));
  };

  const fetchMarketingStrategy = useCallback(async () => {
    setIsLoadingStrategy(true);
    try {
      const response = await fetch('/api/marketing-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetArea: answers.find(a => a.label === "Target Area")?.value,
          businessName: answers.find(a => a.label === "Your Business Name")?.value,
          industry: businessInfo.businessAnalysis?.industry,
          description: businessInfo.businessAnalysis?.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get marketing strategy');
      }

      const data = await response.json();
      setMarketingStrategy(data.analysis);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoadingStrategy(false);
    }
  }, [answers, businessInfo.businessAnalysis]);

  useEffect(() => {
    if (businessInfo.businessAnalysis && answers.length >= 2) {
      fetchMarketingStrategy();
    }
  }, [businessInfo.businessAnalysis, answers, fetchMarketingStrategy]);

  return (
    <main className="relative min-h-screen w-full">
      <AnimatedBackground inputPosition={inputPosition} />
      <div className="fixed left-0 top-0 w-full">
        <div className="relative mx-auto max-w-2xl px-4 pt-8">
          <div className="flex flex-col gap-4">
            {/* Top row for Target Area and Business Name */}
            <div className="flex flex-col md:flex-row md:gap-4">
              {displayInfos
                .filter(info => info.type === 'answer')
                .map((info, index) => (
                  <InfoBox
                    key={`${info.label}-${index}`}
                    label={info.label}
                    value={info.value}
                    show={true}
                    onClick={() => {
                      setStep(index);
                      setUserInput(info.value);
                    }}
                    position={index === 0 ? 'first' as const : 'inline' as const}
                  />
                ))}
            </div>
            
            {/* Show loading skeleton or analysis */}
            {(isProcessing && currentStep === 1) ? (
              <LoadingSkeleton />
            ) : (
              displayInfos
                .filter(info => info.type === 'analysis')
                .map((info, index) => (
                  <InfoBox
                    key={`${info.label}-${index}`}
                    label={info.label}
                    value={info.value}
                    show={true}
                    position="below"
                    subInfo={info.subInfo}
                    onClick={() => {
                      setStep(1);
                      setUserInput(answers[1].value);
                    }}
                  />
                ))
            )}
          </div>
        </div>
      </div>

      {/* Show input and prompt only before business name is submitted */}
      {currentStep <= 1 && !isProcessing && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
          <div className="max-w-4xl">
            <TypewriterPrompt 
              text={prompts[currentStep].text}
              key={currentStep}
            />
            <InputField 
              value={userInput}
              onChange={setUserInput}
              onSubmit={handleSubmit}
              disabled={isProcessing}
              onPositionChange={handlePositionChange}
              placeholder={prompts[currentStep].placeholder}
            />
          </div>
        </div>
      )}

      {/* Show verification message and buttons after business name */}
      {currentStep > 1 && (
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center gap-8 mt-32">
            <div className="text-xl font-normal text-electric-teal">
              Please verify your information.
            </div>
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => {
                  if (marketingStrategy) {
                    setShowResults(true);
                  }
                }}
                className="relative z-50 rounded-lg border-2 border-electric-teal bg-charcoal px-8 py-4 
                  text-lg font-medium text-electric-teal shadow-glow overflow-hidden
                  transition-all duration-300 hover:border-electric-teal/80 hover:shadow-glow-strong 
                  active:scale-95"
              >
                {isLoadingStrategy && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-y-0 -inset-x-full animate-loading-progress bg-neon-magenta/20" />
                  </div>
                )}
                <span className="relative z-10">
                  {isLoadingStrategy ? 'Analyzing your market...' : 'Looks good, now show me my leads'}
                </span>
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-lg border-2 border-electric-teal bg-electric-teal/10 px-6 py-3 
                  text-base font-medium text-electric-teal shadow-glow 
                  transition-all duration-300 hover:bg-electric-teal/20 hover:shadow-glow-strong 
                  active:scale-95"
              >
                Edit my info
              </button>
            </div>
          </div>
          <EditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleSaveEdits}
            info={{
              targetArea: answers.find(a => a.label === "Target Area")?.value || "",
              businessName: answers.find(a => a.label === "Your Business Name")?.value || "",
              industry: businessInfo.businessAnalysis?.industry || "",
              description: businessInfo.businessAnalysis?.description || "",
            }}
          />
        </div>
      )}

      {showResults && marketingStrategy && businessInfo.businessAnalysis && (
        <MarketingResults 
          strategy={marketingStrategy} 
          boundingBox={businessInfo.businessAnalysis.boundingBox}
          onClose={() => setShowResults(false)}
        />
      )}
    </main>
  );
}
