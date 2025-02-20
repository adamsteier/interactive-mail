'use client';

import { useState } from 'react';
import { MarketingStrategy, DatabaseTarget } from '@/types/marketing';
import ProcessingModal from './ProcessingModal';

interface BusinessType {
  name: string;
  count: number;
  isSelected: boolean;
}

interface MarketingResultsProps {
  strategy: MarketingStrategy;
  onClose: () => void;
}

const MarketingResults = ({ strategy, onClose }: MarketingResultsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>(() => {
    // Extract business types from method1Analysis if it exists
    if (strategy.method1Analysis?.businessTargets) {
      return strategy.method1Analysis.businessTargets.map(target => ({
        name: target.type,
        count: target.estimatedCount,
        isSelected: false
      }));
    }
    return [];
  });

  const handleCheckboxChange = (index: number) => {
    setBusinessTypes(prev => prev.map((type, i) => 
      i === index ? { ...type, isSelected: !type.isSelected } : type
    ));
  };

  const startCampaign = async () => {
    setIsProcessing(true);
    setShowProcessing(true);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    // Maybe show success message or next steps
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-4xl rounded-lg border-2 border-electric-teal bg-charcoal shadow-glow my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          {/* Sticky header - increased z-index */}
          <div className="sticky top-0 bg-charcoal z-30 border-b border-electric-teal/20">
            <div className="p-8 pb-6">
              <h2 className="text-2xl font-semibold text-electric-teal">Your Marketing Strategy</h2>
            </div>
          </div>
          
          {/* Main content - add padding to sides */}
          <div className="px-8">
            <div className="mb-8">
              <h3 className="text-lg text-electric-teal mb-2">Primary Recommendation</h3>
              <p className="text-electric-teal/80">{strategy.primaryRecommendation}</p>
              <p className="mt-2 text-sm text-electric-teal/60">
                Estimated total reach: {strategy.totalEstimatedReach.toLocaleString()} potential leads
              </p>
            </div>

            <div className="space-y-8 mb-8">
              {/* Direct Mail to Businesses */}
              {strategy.recommendedMethods.includes('method1') && (
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-electric-teal border-b border-electric-teal/20 pb-2">
                    Direct Mail to Businesses
                  </h3>
                  <p className="text-electric-teal/80 mb-4">{strategy.method1Analysis.overallReasoning}</p>
                  
                  <div className="text-electric-teal/80 mb-4 p-4 border border-electric-teal/30 rounded-lg bg-electric-teal/5">
                    Select one or more business types below to gather detailed data for your campaign
                  </div>
                  
                  <div className="space-y-4">
                    {businessTypes.map((business, index) => (
                      <div 
                        key={index}
                        className="rounded-lg border border-electric-teal/30 p-4 hover:bg-electric-teal/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative w-6 h-6">
                            <input
                              type="checkbox"
                              checked={business.isSelected}
                              onChange={() => handleCheckboxChange(index)}
                              className="absolute inset-0 h-6 w-6 rounded-md border-2 border-electric-teal 
                                text-electric-teal focus:ring-electric-teal focus:ring-offset-0 
                                bg-charcoal transition-all duration-300
                                checked:bg-electric-teal checked:border-electric-teal
                                hover:border-electric-teal/80
                                cursor-pointer z-20"
                            />
                            {!business.isSelected && (
                              <div className="absolute inset-0 animate-pulse-slow pointer-events-none z-10">
                                <div className="absolute inset-0 rounded-md border-2 border-electric-teal/50"></div>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-medium text-electric-teal">{business.name}</h4>
                            <p className="text-electric-teal/60">
                              Estimated number of businesses: {business.count.toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-electric-teal/80 mt-3 ml-10">
                          {strategy.method1Analysis.businessTargets.find(t => t.type === business.name)?.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>

                  {businessTypes.length > 0 && (
                    <div className="mt-6">
                      <button
                        onClick={startCampaign}
                        disabled={!businessTypes.some(type => type.isSelected) || isProcessing}
                        className="w-full rounded-lg border-2 border-electric-teal bg-electric-teal/10 px-6 py-3 
                          text-base font-medium text-electric-teal shadow-glow 
                          transition-all duration-300 hover:bg-electric-teal/20 hover:shadow-glow-strong 
                          active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Processing Campaign...' : 
                          businessTypes.some(type => type.isSelected) 
                            ? 'Get Data'
                            : 'Select a Business Type to Get Data'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Database Targeting */}
              {strategy.recommendedMethods.includes('method2') && (
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-electric-teal border-b border-electric-teal/20 pb-2">
                    Database Targeting
                  </h3>
                  <p className="text-electric-teal/80 mb-4">{strategy.method2Analysis.overallReasoning}</p>
                  
                  <div className="space-y-4">
                    {strategy.method2Analysis.databaseTargets.map((database: DatabaseTarget, index: number) => (
                      <div 
                        key={index}
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
              {strategy.recommendedMethods.includes('method3') && (
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-electric-teal border-b border-electric-teal/20 pb-2">
                    Mass Flyer Drop
                  </h3>
                  <p className="text-electric-teal/80">{strategy.method3Analysis.reasoning}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sticky footer - increased z-index */}
          <div className="sticky bottom-0 bg-charcoal z-30 border-t border-electric-teal/20">
            <div className="p-8 pt-6">
              <div className="flex justify-between items-center">
                <p className="text-electric-teal/60">
                  {!businessTypes.some(type => type.isSelected) && 
                    'Select a business type to get detailed data'}
                </p>
                <div className="flex gap-4">
                  {businessTypes.some(type => type.isSelected) && (
                    <button
                      onClick={startCampaign}
                      disabled={isProcessing}
                      className="rounded-lg border-2 border-electric-teal bg-electric-teal/10 px-6 py-2 
                        text-base font-medium text-electric-teal shadow-glow 
                        transition-all duration-300 hover:bg-electric-teal/20 hover:shadow-glow-strong 
                        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                        animate-pulse-glow"
                    >
                      {isProcessing ? 'Processing...' : 'Get Data'}
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="rounded px-4 py-2 text-electric-teal hover:bg-electric-teal/10"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add ProcessingModal */}
      {showProcessing && (
        <ProcessingModal
          selectedBusinesses={businessTypes.filter(b => b.isSelected)}
          targetArea={strategy.targetArea}
          onComplete={handleProcessingComplete}
          onClose={() => {
            setShowProcessing(false);
            setIsProcessing(false);
          }}
        />
      )}
    </>
  );
};

export default MarketingResults; 