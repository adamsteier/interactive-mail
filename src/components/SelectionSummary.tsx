'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface SelectionSummaryProps {
  selectedPlaces: Set<string>;
  onStartCampaign: () => void;
  onSaveProgress?: () => void;
}

const calculateCost = (count: number) => {
  if (count < 100) return count * 2.25;
  if (count < 1000) return count * 1.75;
  return count * 1.50;
};

const SelectionSummary = ({ selectedPlaces, onStartCampaign, onSaveProgress }: SelectionSummaryProps) => {
  const stats = useMemo(() => {
    const count = selectedPlaces.size;
    const cost = calculateCost(count);
    const estimatedResponses = Math.ceil(count * 0.03);
    const pricePerCard = cost / count || 0;

    return {
      count,
      cost,
      estimatedResponses,
      pricePerCard
    };
  }, [selectedPlaces]);

  // Mobile bottom bar or desktop sidebar based on screen size
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed right-0 top-0 h-full w-80 border-l-2 border-electric-teal bg-charcoal/95 backdrop-blur-sm p-6 pt-20 z-30 overflow-y-auto">
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-electric-teal">Your AI Campaign Designer</h3>
          
          <div className="space-y-4">
            <div className="rounded-lg border border-electric-teal/20 p-4">
              <div className="text-sm text-electric-teal/60">Selected Leads</div>
              <div className="text-2xl font-medium text-electric-teal">{stats.count}</div>
            </div>

            <div className="rounded-lg border border-electric-teal/20 p-4">
              <div className="text-sm text-electric-teal/60">Price Per Postcard</div>
              <div className="text-2xl font-medium text-electric-teal">
                ${stats.pricePerCard.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg border border-electric-teal/20 p-4">
              <div className="text-sm text-electric-teal/60">Total Campaign Cost</div>
              <div className="text-2xl font-medium text-electric-teal">
                ${stats.cost.toFixed(2)}
              </div>
            </div>

            <div className="rounded-lg border border-electric-teal/20 p-4">
              <div className="text-sm text-electric-teal/60">Estimated Responses</div>
              <div className="text-2xl font-medium text-electric-teal">
                {stats.estimatedResponses}
              </div>
              <div className="text-sm text-electric-teal/60">
                Based on 3% response rate
              </div>
            </div>
          </div>

          {/* Review Selection Message */}
          {stats.count > 0 && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
                  <svg className="w-3 h-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-yellow-500">Review Your Selection</div>
                  <div className="text-xs text-yellow-500/80 mt-1">
                    Take a moment to review your selected leads. You can easily remove any leads you don&apos;t want to target by unchecking them.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={onStartCampaign}
              disabled={stats.count === 0}
              className="relative w-full rounded-lg px-4 py-3 text-charcoal font-semibold
                disabled:opacity-50 disabled:cursor-not-allowed 
                transition-all duration-200 overflow-hidden group cta-button-glow"
            >
            {/* Animated wave background */}
            <div className="absolute inset-0 bg-electric-teal">
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 560">
                  <motion.path
                    d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,234.7C1248,224,1344,224,1392,224L1440,224L1440,560L1392,560C1344,560,1248,560,1152,560C1056,560,960,560,864,560C768,560,672,560,576,560C480,560,384,560,288,560C192,560,96,560,48,560L0,560Z"
                    fill="currentColor"
                    animate={{
                      d: [
                        "M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,234.7C1248,224,1344,224,1392,224L1440,224L1440,560L1392,560C1344,560,1248,560,1152,560C1056,560,960,560,864,560C768,560,672,560,576,560C480,560,384,560,288,560C192,560,96,560,48,560L0,560Z",
                        "M0,224L48,234.7C96,245,192,267,288,250.7C384,235,480,181,576,165.3C672,149,768,171,864,197.3C960,224,1056,256,1152,272C1248,288,1344,288,1392,288L1440,288L1440,560L1392,560C1344,560,1248,560,1152,560C1056,560,960,560,864,560C768,560,672,560,576,560C480,560,384,560,288,560C192,560,96,560,48,560L0,560Z"
                      ]
                    }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 3,
                      ease: "easeInOut"
                    }}
                  />
                </svg>
              </div>
            </div>
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              Continue to Brand Selection
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
          </button>
          
          {onSaveProgress && (
            <button
              onClick={onSaveProgress}
              className="w-full rounded-lg px-4 py-3 border-2 border-electric-teal/50 text-electric-teal font-medium
                hover:bg-electric-teal/10 transition-all duration-200"
            >
              Save Progress & Continue Later
            </button>
          )}
          </div>
          
          <p className="text-xs text-electric-teal/60 text-center">
            You can modify your selection anytime during the campaign process
          </p>

          {/* Progress Indicator */}
          <div className="rounded-lg border border-electric-teal/20 p-4 bg-electric-teal/5">
            <div className="text-sm text-electric-teal/60 mb-3">Campaign Progress</div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-charcoal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-electric-teal">Business Info</span>
              </div>
              <div className="flex items-center gap-3">
                <motion.div 
                  className="flex-shrink-0 w-5 h-5 rounded-full bg-electric-teal"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 1, 0.6]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <span className="text-electric-teal">Select Leads</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-electric-teal/30" />
                <span className="text-electric-teal/60">Choose Brand</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-electric-teal/30" />
                <span className="text-electric-teal/60">AI Design</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-electric-teal/30" />
                <span className="text-electric-teal/60">Review & Pay</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t-2 border-electric-teal bg-charcoal/95 backdrop-blur-sm p-4 pb-safe z-50 shadow-[0_-4px_12px_-1px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-electric-teal/60">Selected</div>
            <div className="text-xl font-medium text-electric-teal">{stats.count}</div>
          </div>
          <div>
            <div className="text-sm text-electric-teal/60">Total Cost</div>
            <div className="text-xl font-medium text-electric-teal">
              ${stats.cost.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-electric-teal/60">Est. Responses</div>
            <div className="text-xl font-medium text-electric-teal">
              {stats.estimatedResponses}
            </div>
          </div>
        </div>

        {/* Review Selection Message for Mobile */}
        {stats.count > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-yellow-500/20 flex items-center justify-center mt-0.5">
                <svg className="w-2.5 h-2.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-yellow-500">Review Your Selection</div>
                <div className="text-xs text-yellow-500/80 mt-1">
                  Review your leads above. Uncheck any you don&apos;t want to target.
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onStartCampaign}
          disabled={stats.count === 0}
          className="relative w-full rounded-lg px-4 py-3 text-charcoal font-semibold
            disabled:opacity-50 disabled:cursor-not-allowed 
            transition-all duration-200 overflow-hidden group cta-button-glow"
        >
          {/* Animated wave background */}
          <div className="absolute inset-0 bg-electric-teal">
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 560">
                <motion.path
                  d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,234.7C1248,224,1344,224,1392,224L1440,224L1440,560L1392,560C1344,560,1248,560,1152,560C1056,560,960,560,864,560C768,560,672,560,576,560C480,560,384,560,288,560C192,560,96,560,48,560L0,560Z"
                  fill="currentColor"
                  animate={{
                    d: [
                      "M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,234.7C1248,224,1344,224,1392,224L1440,224L1440,560L1392,560C1344,560,1248,560,1152,560C1056,560,960,560,864,560C768,560,672,560,576,560C480,560,384,560,288,560C192,560,96,560,48,560L0,560Z",
                      "M0,224L48,234.7C96,245,192,267,288,250.7C384,235,480,181,576,165.3C672,149,768,171,864,197.3C960,224,1056,256,1152,272C1248,288,1344,288,1392,288L1440,288L1440,560L1392,560C1344,560,1248,560,1152,560C1056,560,960,560,864,560C768,560,672,560,576,560C480,560,384,560,288,560C192,560,96,560,48,560L0,560Z"
                    ]
                  }}
                  transition={{
                    repeat: Infinity,
                    repeatType: "reverse",
                    duration: 3,
                    ease: "easeInOut"
                  }}
                />
              </svg>
            </div>
          </div>
          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            Continue to Brand Selection
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
        </button>
        
        <p className="text-xs text-electric-teal/60 text-center mt-2">
          You can modify your selection anytime during the campaign process
        </p>
      </div>
    </>
  );
};

export default SelectionSummary; 