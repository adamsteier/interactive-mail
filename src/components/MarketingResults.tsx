'use client';

import { useState, useEffect } from 'react';
import { useMarketingStore } from '@/store/marketingStore';
import { MarketingStrategy, BusinessTarget, DatabaseTarget } from '@/types/marketing';
import { useAuth } from '@/contexts/AuthContext';
import AuthOverlay from '@/components/AuthOverlay';
import PlacesLeadsCollection from '@/components/PlacesLeadsCollection';

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
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'database'>('business');
  const [interestedInDatabase, setInterestedInDatabase] = useState(false);
  
  const { user } = useAuth();
  
  const { 
    setMarketingStrategy, 
    setBusinessAnalysis,
    updateSearchResults,
    handleGoogleSearch,
    setSelectedBusinessTypes: setStoreSelectedBusinessTypes
  } = useMarketingStore();

  // Mock values for the UI for the estimated reach if not present in the strategy object
  const totalEstimatedReach = strategy.totalEstimatedReach || 500;
  const businessCount = strategy.method1Analysis?.businessTargets?.length * 50 || 100;
  const conversionRate = 2.5;

  // Check if method2 (database targeting) is recommended in the strategy
  const hasMethod2 = strategy.recommendedMethods?.includes('method2') || false;

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
      
      // CRITICAL FIX: Update the global store's selectedBusinessTypes
      setStoreSelectedBusinessTypes(selectedBusinessTypes);
      
      // IMPORTANT: Always trigger the search in the background first
      // so it continues during authentication
      handleGoogleSearch();
      
      // Check if user is authenticated
      if (!user) {
        setShowAuthOverlay(true);
        // Don't show leads collection yet, but search is already running
        return;
      }
      
      // User is already authenticated, show the leads collection view
      // after a short delay to show animation
      setTimeout(() => {
        setShowLeadsCollection(true);
        setIsLoading(false);
      }, 800); 
    }
  };

  // Handle auth completion
  const handleAuthComplete = () => {
    setShowAuthOverlay(false);
    
    // Show the leads collection view after a short delay
    setTimeout(() => {
      setShowLeadsCollection(true);
      setIsLoading(false);
    }, 300);
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
      {!showLeadsCollection ? (
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
                  <div className="text-3xl font-bold text-electric-teal">{totalEstimatedReach}</div>
                  <div className="text-sm text-electric-teal/60">Potential customers</div>
                </div>
                <div className="rounded-lg border border-electric-teal/30 bg-charcoal-dark p-4">
                  <div className="text-3xl font-bold text-electric-teal">{businessCount}</div>
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
                    <div key={target.type} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id={`target-${target.type}`}
                        checked={selectedBusinessTypes.has(target.type)}
                        onChange={() => handleCheckboxChange(target.type)}
                        className="mt-1.5 h-4 w-4 rounded border-electric-teal/50 
                          bg-charcoal text-electric-teal focus:ring-1 focus:ring-electric-teal"
                      />
                      <div>
                        <label htmlFor={`target-${target.type}`} className="font-medium text-electric-teal">
                          {target.type}
                        </label>
                        <p className="text-sm text-electric-teal/60">{target.reasoning}</p>
                      </div>
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
            
            {/* Action Button - Only show for business targeting */}
            {(activeTab === 'business' || !hasMethod2) && (
              <div className="flex justify-end">
                <button
                  onClick={handleGetData}
                  disabled={selectedBusinessTypes.size === 0 || isLoading}
                  className="relative overflow-hidden rounded-lg bg-electric-teal 
                    px-6 py-3 text-charcoal font-medium transition-colors duration-200
                    hover:bg-electric-teal/90 disabled:bg-electric-teal/50 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    'Get Data for Selected Business Types'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <PlacesLeadsCollection onClose={onClose} />
      )}

      <AuthOverlay 
        isOpen={showAuthOverlay}
        onClose={handleAuthComplete}
      />
    </>
  );
};

export default MarketingResults; 