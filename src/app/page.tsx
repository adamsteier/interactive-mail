'use client';

import { useEffect } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import TypewriterPrompt from '@/components/TypewriterPrompt';
import InputField from '@/components/InputField';
import InfoBox from '@/components/InfoBox';
import LoadingBar from '@/components/LoadingBar';
import EditModal from '@/components/EditModal';
import MarketingResults from '@/components/MarketingResults';
import { useMarketingStore } from '@/store/marketingStore';

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
    // State
    locationData,
    businessInfo,
    currentStep,
    userInput,
    isProcessing,
    inputPosition,
    displayInfos,
    isEditModalOpen,
    isLoadingStrategy,
    showResults,
    marketingStrategy,

    // Actions
    setLocationData,
    setUserInput,
    setInputPosition,
    setStep,
    setIsEditModalOpen,
    setShowResults,
    handleSubmit,
    handleSaveEdits,
    setDisplayInfos,
    fetchMarketingStrategy
  } = useMarketingStore();

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
    // Update display infos whenever business info changes
    const newDisplayInfos = [
      // Target Area
      ...(businessInfo.targetArea ? [{
        label: "Target Area",
        value: businessInfo.targetArea,
        type: 'answer' as const,
        position: 'first' as const
      }] : []),
      // Business Name
      ...(businessInfo.businessName ? [{
        label: "Your Business Name",
        value: businessInfo.businessName,
        type: 'answer' as const,
        position: 'inline' as const
      }] : []),
      // Business Analysis
      ...(businessInfo.businessAnalysis ? [{
        label: "Industry & Description",
        value: businessInfo.businessAnalysis.industry,
        type: 'analysis' as const,
        position: 'below' as const,
        subInfo: {
          industry: businessInfo.businessAnalysis.industry,
          description: businessInfo.businessAnalysis.description
        }
      }] : [])
    ];

    setDisplayInfos(newDisplayInfos);
  }, [businessInfo, setDisplayInfos]);

  useEffect(() => {
    if (businessInfo.businessAnalysis) {
      fetchMarketingStrategy();
    }
  }, [businessInfo.businessAnalysis, fetchMarketingStrategy]);

  return (
    <main className="relative min-h-screen w-full">
      <AnimatedBackground inputPosition={inputPosition || undefined} />
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
                      setUserInput(info.value);
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
              onPositionChange={setInputPosition}
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
                  if (marketingStrategy && businessInfo.businessAnalysis) {
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
              targetArea: businessInfo.targetArea,
              businessName: businessInfo.businessName,
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
