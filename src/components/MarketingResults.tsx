'use client';

import { useState, useEffect } from 'react';
import { BusinessTarget, DatabaseTarget } from '@/types/marketing';
import { BusinessAnalysis } from '@/types/businessAnalysis';
import PlacesLeadsCollection from '@/components/PlacesLeadsCollection';
import { useMarketingStore } from '@/store/marketingStore';
import { MarketingStrategy } from '@/types/marketing';
import { useAuth } from '@/contexts/AuthContext';
import AuthOverlay from '@/components/AuthOverlay';

interface MarketingResultsProps {
  strategy: MarketingStrategy;
  boundingBox: BusinessAnalysis['boundingBox'];
  onClose: () => void;
}

const MarketingResults = ({ strategy, boundingBox, onClose }: MarketingResultsProps) => {
  const { 
    setMarketingStrategy,
    setSelectedBusinessTypes,
    selectedBusinessTypes,
    handleGoogleSearch,
    updateSearchResults,
    setBusinessAnalysis
  } = useMarketingStore();

  const [showLeadsCollection, setShowLeadsCollection] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    // Only update if marketingStrategy exists
    if (strategy) {
      setMarketingStrategy(strategy);
    }
  }, [strategy, setMarketingStrategy]);

  useEffect(() => {
    // If user becomes authenticated and overlay is shown, close it
    if (user && showAuthOverlay) {
      setShowAuthOverlay(false);
    }
  }, [user, showAuthOverlay]);

  const handleCheckboxChange = (targetType: string) => {
    setSelectedBusinessTypes((prev: Set<string>) => {
      const newSet = new Set(prev);
      if (newSet.has(targetType)) {
        newSet.delete(targetType);
      } else {
        newSet.add(targetType);
      }
      return newSet;
    });
  };

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
      
      // Check if user is authenticated
      if (!user) {
        setShowAuthOverlay(true);
      }
      
      // Always trigger the search in the background
      handleGoogleSearch();
      
      // Show the leads collection view after a short delay to show animation
      setTimeout(() => {
        setShowLeadsCollection(true);
        setIsLoading(false);
      }, 800); 
    }
  };

  const handleSearch = () => {
    if (selectedBusinessTypes.size > 0) {
      setIsLoading(true);
      // Start loading state immediately
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
      
      // Check if user is authenticated
      if (!user) {
        setShowAuthOverlay(true);
      }
      
      // Always trigger the search in the background
      handleGoogleSearch();
      
      // Show the leads collection view after a short delay to show animation
      setTimeout(() => {
        setShowLeadsCollection(true);
        setIsLoading(false);
      }, 800);
    }
  };

  return (
    <>
      {!showLeadsCollection ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl rounded-lg border-2 border-electric-teal bg-charcoal shadow-glow my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Sticky header - removed padding, added border */}
            <div className="sticky top-0 bg-charcoal z-10 border-b border-electric-teal/20">
              <div className="p-8 pb-6">
                <h2 className="text-2xl font-semibold text-electric-teal">Your Marketing Strategy</h2>
              </div>
            </div>
            
            {/* Main content - add padding to sides */}
            <div className="px-8">
              <div className="mb-8">
                <h3 className="text-lg text-electric-teal mb-2">Primary Recommendation</h3>
                <p className="text-electric-teal/80">{strategy?.primaryRecommendation}</p>
                <p className="mt-2 text-sm text-electric-teal/60">
                  Estimated total reach: {
                    strategy?.totalEstimatedReach != null 
                      ? strategy.totalEstimatedReach.toLocaleString() 
                      : 'Unknown'
                  } potential leads
                </p>
              </div>

              <div className="space-y-8 mb-8">
                {/* Direct Mail to Businesses with checkboxes */}
                {strategy?.recommendedMethods.includes('method1') && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-medium text-electric-teal border-b border-electric-teal/20 pb-2">
                      Direct Mail to Businesses
                    </h3>
                    <p className="text-electric-teal/80 mb-4">{strategy.method1Analysis.overallReasoning}</p>
                    
                    <div className="space-y-4">
                      {strategy.method1Analysis.businessTargets.map((target: BusinessTarget) => (
                        <div 
                          key={target.type}
                          className="rounded-lg border border-electric-teal/30 p-4 hover:bg-electric-teal/5 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <input
                              type="checkbox"
                              id={target.type}
                              checked={selectedBusinessTypes.has(target.type)}
                              onChange={() => handleCheckboxChange(target.type)}
                              className="w-4 h-4 rounded border-electric-teal text-electric-teal 
                                focus:ring-electric-teal focus:ring-offset-charcoal bg-charcoal"
                            />
                            <h4 className="text-lg font-medium text-electric-teal">{target.type}</h4>
                          </div>
                          <p className="text-electric-teal/60 mb-2">
                            Estimated number of businesses: {
                              target.estimatedReach != null 
                                ? target.estimatedReach.toLocaleString() 
                                : 'Unknown'
                            }
                          </p>
                          <p className="text-electric-teal/80">{target.reasoning}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleGetData}
                      disabled={selectedBusinessTypes.size === 0}
                      className="w-full mt-4 rounded-lg border-2 border-electric-teal bg-electric-teal/10 
                        px-6 py-3 text-base font-medium text-electric-teal shadow-glow 
                        transition-all duration-300 hover:bg-electric-teal/20 hover:shadow-glow-strong 
                        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {selectedBusinessTypes.size === 0 ? 'Select some businesses to get data' : 'Get Data'}
                    </button>
                  </div>
                )}

                {/* Database Targeting */}
                {strategy?.recommendedMethods.includes('method2') && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-medium text-electric-teal border-b border-electric-teal/20 pb-2">
                      Database Targeting
                    </h3>
                    <p className="text-electric-teal/80 mb-4">{strategy.method2Analysis.overallReasoning}</p>
                    
                    <div className="space-y-4">
                      {strategy.method2Analysis.databaseTargets.map((database: DatabaseTarget) => (
                        <div 
                          key={database.name}
                          className="rounded-lg border border-electric-teal/30 p-4 hover:bg-electric-teal/5 transition-colors"
                        >
                          <h4 className="text-lg font-medium text-electric-teal mb-1">{database.name}</h4>
                          <p className="text-sm text-electric-teal/60 mb-2">{database.type}</p>
                          <p className="text-electric-teal/80 mb-2">{database.reasoning}</p>
                          <p className="text-electric-teal/60">
                            Estimated reach: {database.estimatedReach.toLocaleString()} contacts
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mass Flyer Drop */}
                {strategy?.recommendedMethods.includes('method3') && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-medium text-electric-teal border-b border-electric-teal/20 pb-2">
                      Mass Flyer Drop
                    </h3>
                    <p className="text-electric-teal/80">{strategy.method3Analysis.reasoning}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky footer - removed margin, adjusted padding */}
            <div className="sticky bottom-0 bg-charcoal border-t border-electric-teal/20">
              <div className="p-8 pt-6">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={onClose}
                    className="rounded px-4 py-2 text-electric-teal hover:bg-electric-teal/10"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSearch}
                    disabled={selectedBusinessTypes.size === 0 || isLoading}
                    className={`relative rounded border-2 ${
                      isLoading ? 'border-electric-teal bg-electric-teal/10 text-electric-teal' :
                      selectedBusinessTypes.size > 0
                        ? 'border-electric-teal bg-electric-teal text-charcoal hover:bg-electric-teal/90'
                        : 'border-electric-teal/50 bg-transparent text-electric-teal/50'
                      } px-6 py-2 shadow-glow hover:shadow-glow-strong 
                      active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300`}
                  >
                    {isLoading ? (
                      <>
                        <span className="opacity-0">Search Selected Types</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex space-x-1">
                            {/* Wave animation dots */}
                            {[0, 1, 2, 3, 4].map((i) => (
                              <div 
                                key={i}
                                className="h-2 w-2 rounded-full bg-electric-teal"
                                style={{
                                  animation: `waveButton 1s ease-in-out ${i * 0.1}s infinite`,
                                  boxShadow: '0 0 8px #00F0FF',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <style jsx>{`
                          @keyframes waveButton {
                            0%, 100% {
                              transform: translateY(0);
                              opacity: 0.7;
                            }
                            50% {
                              transform: translateY(-6px);
                              opacity: 1;
                            }
                          }
                        `}</style>
                      </>
                    ) : (
                      "Search Selected Types"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <PlacesLeadsCollection
          onClose={() => {
            setShowLeadsCollection(false);
            onClose();
          }}
        />
      )}

      <AuthOverlay 
        isOpen={showAuthOverlay}
        onClose={() => setShowAuthOverlay(false)}
      />
    </>
  );
};

export default MarketingResults; 