'use client';

import { useState } from 'react';
import { MarketingStrategy } from '@/types/marketing';

interface MarketingResultsProps {
  strategy: MarketingStrategy;
  onClose: () => void;
}

const MarketingResults = ({ strategy, onClose }: MarketingResultsProps) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-charcoal/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-lg border-2 border-electric-teal bg-charcoal p-8 shadow-glow my-8">
        <h2 className="mb-6 text-2xl font-semibold text-electric-teal">Your Marketing Strategy</h2>
        
        <div className="mb-8">
          <h3 className="text-lg text-electric-teal mb-2">Primary Recommendation</h3>
          <p className="text-electric-teal/80">{strategy.primaryRecommendation}</p>
          <p className="mt-2 text-sm text-electric-teal/60">
            Estimated total reach: {strategy.totalEstimatedReach.toLocaleString()} potential leads
          </p>
        </div>

        <div className="space-y-8">
          {/* Direct Mail to Businesses */}
          {strategy.recommendedMethods.includes('method1') && (
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-electric-teal border-b border-electric-teal/20 pb-2">
                Direct Mail to Businesses
              </h3>
              <p className="text-electric-teal/80 mb-4">{strategy.method1Analysis.overallReasoning}</p>
              
              <div className="space-y-4">
                {strategy.method1Analysis.businessTargets.map((target, index) => (
                  <div 
                    key={index}
                    className="rounded-lg border border-electric-teal/30 p-4 hover:bg-electric-teal/5 transition-colors"
                  >
                    <h4 className="text-lg font-medium text-electric-teal mb-2">{target.type}</h4>
                    <p className="text-electric-teal/60 mb-2">
                      Estimated number of businesses: {target.estimatedCount.toLocaleString()}
                    </p>
                    <p className="text-electric-teal/80">{target.reasoning}</p>
                  </div>
                ))}
              </div>
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
                {strategy.method2Analysis.databaseTargets.map((database, index) => (
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

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-electric-teal hover:bg-electric-teal/10"
          >
            Close
          </button>
          <button
            className="rounded border-2 border-electric-teal bg-electric-teal/10 px-6 py-2 text-electric-teal shadow-glow 
              hover:bg-electric-teal/20 hover:shadow-glow-strong"
          >
            Start Campaign
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketingResults; 