'use client';

import { useState } from 'react';
import { MarketingStrategy, BusinessTarget, DatabaseTarget } from '@/types/marketing';

interface MarketingResultsProps {
  strategy: MarketingStrategy;
  onClose: () => void;
}

const MarketingResults = ({ strategy, onClose }: MarketingResultsProps) => {
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());

  const handleCheckboxChange = (targetType: string) => {
    setSelectedTargets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetType)) {
        newSet.delete(targetType);
      } else {
        newSet.add(targetType);
      }
      return newSet;
    });
  };

  const handleGetData = () => {
    // For now, just log the selected targets
    console.log('Selected targets:', Array.from(selectedTargets));
    // We'll implement the data fetching later
  };

  return (
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
            <p className="text-electric-teal/80">{strategy.primaryRecommendation}</p>
            <p className="mt-2 text-sm text-electric-teal/60">
              Estimated total reach: {strategy.totalEstimatedReach.toLocaleString()} potential leads
            </p>
          </div>

          <div className="space-y-8 mb-8">
            {/* Direct Mail to Businesses with checkboxes */}
            {strategy.recommendedMethods.includes('method1') && (
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
                          checked={selectedTargets.has(target.type)}
                          onChange={() => handleCheckboxChange(target.type)}
                          className="w-4 h-4 rounded border-electric-teal text-electric-teal 
                            focus:ring-electric-teal focus:ring-offset-charcoal bg-charcoal"
                        />
                        <h4 className="text-lg font-medium text-electric-teal">{target.type}</h4>
                      </div>
                      <p className="text-electric-teal/60 mb-2">
                        Estimated number of businesses: {target.estimatedCount.toLocaleString()}
                      </p>
                      <p className="text-electric-teal/80">{target.reasoning}</p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleGetData}
                  disabled={selectedTargets.size === 0}
                  className="w-full mt-4 rounded-lg border-2 border-electric-teal bg-electric-teal/10 
                    px-6 py-3 text-base font-medium text-electric-teal shadow-glow 
                    transition-all duration-300 hover:bg-electric-teal/20 hover:shadow-glow-strong 
                    active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedTargets.size === 0 ? 'Select some businesses to get data' : 'Get Data'}
                </button>
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
                onClick={handleGetData}
                disabled={selectedTargets.size === 0}
                className="rounded border-2 border-electric-teal bg-electric-teal/10 px-6 py-2 
                  text-electric-teal shadow-glow hover:bg-electric-teal/20 hover:shadow-glow-strong 
                  active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedTargets.size === 0 ? 'Select some businesses to get data' : 'Get Data'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingResults; 