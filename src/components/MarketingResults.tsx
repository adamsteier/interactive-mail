'use client';

import { useState, useEffect } from 'react';
import { useMarketingStore } from '@/store/marketingStore';
import { MarketingStrategy, BusinessTarget, DatabaseTarget } from '@/types/marketing';
import { useAuth } from '@/contexts/AuthContext';
import PlacesLeadsCollection from '@/components/PlacesLeadsCollection';
import { createDraftCampaign } from '@/services/campaignService';
import { showAuthOverlay } from '@/lib/auth';

interface MarketingResultsProps {
  strategy: MarketingStrategy;
  boundingBox: {
    southwest: { lat: number; lng: number; };
    northeast: { lat: number; lng: number; };
  };
  onClose: () => void;
}

const MarketingResults = ({ strategy, boundingBox, onClose }: MarketingResultsProps) => {
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<Set<string>>(new Set());
  const [showLeadsCollection, setShowLeadsCollection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'database'>('business');
  const [interestedInDatabase, setInterestedInDatabase] = useState(false);
  
  const { user, isAnonymous, anonymousAuthFailed } = useAuth();
  
  console.log('MarketingResults - user:', user, 'isAnonymous:', isAnonymous);
  
  const { 
    setMarketingStrategy, 
    setBusinessAnalysis,
    updateSearchResults,
    handleGoogleSearch,
    setSelectedBusinessTypes: setStoreSelectedBusinessTypes,
    setCurrentCampaign,
    businessInfo,
  } = useMarketingStore();

  // Mock values for the UI for the estimated reach if not present in the strategy object
  const totalEstimatedReach = strategy.totalEstimatedReach || 500;
  const businessCount = strategy.method1Analysis?.businessTargets?.length * 50 || 100;
  const conversionRate = 2.5;

  // Check if method2 (database targeting) is recommended in the strategy
  const hasMethod2 = strategy.recommendedMethods?.includes('method2') || false;

  // Force sign up if anonymous auth failed
  useEffect(() => {
    if (anonymousAuthFailed && !user) {
      console.log('Anonymous auth failed, showing auth overlay');
      showAuthOverlay();
    }
  }, [anonymousAuthFailed, user]);

  useEffect(() => {
    if (strategy) {
      setMarketingStrategy(strategy);
      // Initialize business types with first target
      if (strategy.method1Analysis.businessTargets.length > 0) {
        setSelectedBusinessTypes(new Set([strategy.method1Analysis.businessTargets[0].type]));
      }
    }
  }, [strategy, setMarketingStrategy]);

  const handleGetData = async () => {
    if (selectedBusinessTypes.size > 0) {
      // Always start loading state immediately
      setIsLoading(true);
      updateSearchResults({
        places: [],
        isLoading: true,
        progress: 0,
        totalGridPoints: 0,
        currentGridPoint: 0
      });
      
      // Update the store with the bounding box
      setBusinessAnalysis({
        industry: strategy.method1Analysis.businessTargets[0]?.type || '',
        description: strategy.primaryRecommendation,
        customerTypes: strategy.method1Analysis.businessTargets.map(t => t.type),
        boundingBox
      });
      
      // Update the global store's selectedBusinessTypes
      setStoreSelectedBusinessTypes(selectedBusinessTypes);
      
      try {
        // Create a draft campaign for both anonymous and authenticated users
        if (!user) {
          console.error('No user available - anonymous auth should have completed by now');
          console.log('isAnonymous:', isAnonymous, 'user:', user);
          // Don't create campaign without user - leads won't be saved properly
          return;
        }
        
        const draftCampaign = await createDraftCampaign(
          user.uid,
          {
            targetArea: businessInfo.targetArea,
            businessName: businessInfo.businessName,
            industry: businessInfo.businessAnalysis?.industry,
            description: businessInfo.businessAnalysis?.description,
          },
          isAnonymous
        );
        
        // Set the draft campaign in the store
        setCurrentCampaign({
          id: draftCampaign.id,
          name: `${businessInfo.businessName} - ${new Date().toLocaleDateString()}`,
          status: 'draft',
          createdAt: null, // Will be set by Firestore
          updatedAt: null,
          leadCount: 0,
          selectedLeadCount: 0,
          userId: user.uid,
          businessId: 'temp_' + draftCampaign.id, // Temporary ID until business is created
          businessTypes: Array.from(selectedBusinessTypes)
        });
        
        console.log('Draft campaign created:', draftCampaign.id);
        console.log('Campaign set in store with ID:', draftCampaign.id);
      } catch (error) {
        console.error('Failed to create draft campaign:', error);
        // Continue anyway - we can still show leads even if campaign creation fails
      }
      
      // ALWAYS trigger the search in the background
      handleGoogleSearch();
      
      // Remove the immediate auth overlay - let users see their leads first!
      // The PlacesLeadsCollection component will handle prompting for account creation
      // after they've seen the value
      
      // ALWAYS show leads collection after a short delay
      setTimeout(() => {
        setShowLeadsCollection(true);
        setIsLoading(false);
      }, 800);
    }
  };

  const handleCheckboxChange = (targetType: string) => {
    setSelectedBusinessTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetType)) {
        newSet.delete(targetType);
      } else {
        newSet.add(targetType);
      }
      return newSet;
    });
  };

  // Handle database interest submission
  const handleDatabaseInterest = () => {
    setInterestedInDatabase(true);
    // Additional logic to store this information would go here
  };

  return (
    <>
      {/* Always show the leads collection when it's requested, even if user is not authenticated */}
      {showLeadsCollection && (
        <div className="fixed inset-0 z-30">
          <PlacesLeadsCollection onClose={() => setShowLeadsCollection(false)} />
        </div>
      )}

      {/* Show the marketing strategy UI when not showing leads collection or when auth is needed */}
      {(!showLeadsCollection || (!user && showLeadsCollection)) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="relative max-h-[90vh] w-[90vw] max-w-4xl overflow-y-auto rounded-lg 
            border-2 border-electric-teal bg-charcoal p-6 shadow-glow"
          >
            <div className="mb-6 flex justify-between">
              <h2 className="text-2xl font-semibold text-electric-teal">Your Marketing Strategy</h2>
              <button onClick={onClose} className="text-electric-teal hover:text-electric-teal/80">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Primary Recommendation */}
            <div className="mb-8">
              <h3 className="mb-2 text-lg font-medium text-electric-teal/80">Primary Marketing Recommendation</h3>
              <p className="text-electric-teal">{strategy.primaryRecommendation}</p>
            </div>
            
            {/* Targeted Methods */}
            <div className="mb-8">
              <h3 className="mb-2 text-lg font-medium text-electric-teal/80">Estimated Reach</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-lg border border-electric-teal/30 bg-charcoal-dark p-4">
                  <div className="text-3xl font-bold text-electric-teal">{totalEstimatedReach.toLocaleString()}</div>
                  <div className="text-sm text-electric-teal/60">Potential customers</div>
                  {strategy.totalEstimatedReach > 0 && (
                    <div className="mt-2 inline-block px-3 py-1 rounded-full bg-electric-teal/10 text-electric-teal text-xs">
                      AI Estimated Reach
                    </div>
                  )}
                </div>
                <div className="rounded-lg border border-electric-teal/30 bg-charcoal-dark p-4">
                  <div className="text-3xl font-bold text-electric-teal">{businessCount.toLocaleString()}</div>
                  <div className="text-sm text-electric-teal/60">Local businesses</div>
                </div>
                <div className="rounded-lg border border-electric-teal/30 bg-charcoal-dark p-4">
                  <div className="text-3xl font-bold text-electric-teal">{conversionRate}%</div>
                  <div className="text-sm text-electric-teal/60">Avg. conversion rate</div>
                </div>
              </div>
            </div>

            {/* Method Tabs - Only show if method2 is available */}
            {hasMethod2 && (
              <div className="mb-6">
                <div className="flex w-full rounded-lg border border-electric-teal/30 p-1">
                  <button 
                    type="button"
                    onClick={() => setActiveTab('business')}
                    className={`flex-1 rounded-md py-2 text-center transition-all ${
                      activeTab === 'business' 
                        ? 'bg-electric-teal text-charcoal font-medium' 
                        : 'text-electric-teal/70 hover:text-electric-teal'
                    }`}
                  >
                    Business Targeting
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('database')}
                    className={`flex-1 rounded-md py-2 text-center transition-all ${
                      activeTab === 'database' 
                        ? 'bg-electric-teal text-charcoal font-medium' 
                        : 'text-electric-teal/70 hover:text-electric-teal'
                    }`}
                  >
                    Database Targeting
                  </button>
                </div>
              </div>
            )}
            
            {/* Business Targets - Show when active tab is business or method2 is not available */}
            {(activeTab === 'business' || !hasMethod2) && (
              <div className="mb-8">
                <h3 className="mb-4 text-lg font-medium text-electric-teal/80">
                  Which business types would you like to target?
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {strategy.method1Analysis.businessTargets.map((target: BusinessTarget) => (
                    <div 
                      key={target.type} 
                      className={`flex flex-col rounded-lg border p-4 transition-colors cursor-pointer
                        ${selectedBusinessTypes.has(target.type) 
                          ? 'border-electric-teal bg-electric-teal/10' 
                          : 'border-electric-teal/30 hover:bg-electric-teal/5'}`}
                      onClick={() => handleCheckboxChange(target.type)}
                    >
                      <div className="flex items-start space-x-3 mb-2">
                        <input
                          type="checkbox"
                          id={`target-${target.type}`}
                          checked={selectedBusinessTypes.has(target.type)}
                          onChange={() => handleCheckboxChange(target.type)}
                          className="mt-1.5 h-4 w-4 rounded border-electric-teal/50 
                            bg-charcoal text-electric-teal focus:ring-1 focus:ring-electric-teal"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <label htmlFor={`target-${target.type}`} className="block font-medium text-electric-teal">
                            {target.type}
                          </label>
                          <p className="text-sm text-electric-teal/60 mt-1">{target.reasoning}</p>
                        </div>
                      </div>
                      
                      {/* Estimated Reach Tag */}
                      {target.estimatedReach > 0 && (
                        <div className="flex items-center mt-2 justify-between">
                          <span className="text-sm text-electric-teal/60">Estimated Reach:</span>
                          <span className="px-3 py-1 rounded-full bg-electric-teal/10 text-electric-teal text-sm font-medium">
                            {target.estimatedReach.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Database Targets - Only show when method2 is available and active tab is database */}
            {hasMethod2 && activeTab === 'database' && (
              <div className="mb-8">
                <div className="mb-4 rounded-lg border border-electric-teal/30 bg-charcoal-dark p-4">
                  <h3 className="mb-2 text-lg font-medium text-electric-teal">Recurring Database Targeting</h3>
                  <p className="text-sm text-electric-teal/80 mb-3">
                    These data sources require custom setup for recurring access. Our team can help you set up
                    regular mailings to these valuable, time-sensitive leads such as new real estate listings, 
                    recently sold homes, and building permits.
                  </p>
                  {strategy.method2Analysis?.overallReasoning && (
                    <p className="text-electric-teal/80 mb-4">{strategy.method2Analysis.overallReasoning}</p>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Only show database targets that are explicitly provided by the AI */}
                  {strategy.method2Analysis?.databaseTargets?.map((database: DatabaseTarget) => (
                    <div
                      key={database.name}
                      className="rounded-lg border border-electric-teal/30 p-4 hover:bg-electric-teal/5 transition-colors"
                    >
                      <h4 className="text-lg font-medium text-electric-teal mb-1">{database.name}</h4>
                      <p className="text-sm text-electric-teal/60 mb-2">{database.type}</p>
                      <p className="text-electric-teal/80 mb-2">{database.reasoning}</p>
                      {database.estimatedReach && (
                        <p className="text-electric-teal/60">
                          Estimated reach: {database.estimatedReach.toLocaleString()} contacts
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {/* Show message if no database targets are provided */}
                  {(!strategy.method2Analysis?.databaseTargets || strategy.method2Analysis.databaseTargets.length === 0) && (
                    <div className="p-4 rounded-lg bg-electric-teal/10 border border-electric-teal/30">
                      <p className="text-electric-teal text-center">
                        No specific database targets were identified for your industry.
                        Please contact our team for a custom database targeting consultation.
                      </p>
                    </div>
                  )}
                </div>

                {!interestedInDatabase ? (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleDatabaseInterest}
                      className="rounded-lg bg-electric-teal px-6 py-3 text-charcoal font-medium 
                        hover:bg-electric-teal/90 transition-colors"
                    >
                      I&apos;m Interested in Database Targeting
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 p-4 rounded-lg bg-electric-teal/10 border border-electric-teal/30">
                    <p className="text-electric-teal">
                      Thanks for your interest! Our team will contact you about setting up recurring database targeting.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Action Buttons - only shown when not already showing leads */}
            {!showLeadsCollection && (
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-between">
                {/* Get Data button */}
                <button
                  onClick={handleGetData}
                  disabled={selectedBusinessTypes.size === 0 || isLoading}
                  className={`rounded-lg border-2 px-6 py-3 font-medium
                    ${isLoading 
                      ? 'animate-pulse border-electric-teal/50 text-electric-teal/50' 
                      : selectedBusinessTypes.size === 0
                        ? 'border-electric-teal/30 bg-electric-teal/5 text-electric-teal/50'
                        : 'border-electric-teal bg-electric-teal text-charcoal shadow-glow hover:bg-electric-teal/90 active:scale-[0.98]'
                    }
                    transition-all duration-300`}
                >
                  {isLoading ? 'Loading...' : 'Get Data for Selected Business Types'}
                </button>
                
                <button
                  onClick={onClose}
                  className="rounded-lg border-2 border-electric-teal/50 bg-transparent px-6 py-3 
                    font-medium text-electric-teal hover:bg-electric-teal/10 
                    transition-all duration-300 active:scale-[0.98]"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Auth overlay removed - PlacesLeadsCollection handles account prompts */}
    </>
  );
};

export default MarketingResults; 