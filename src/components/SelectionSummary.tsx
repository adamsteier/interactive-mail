'use client';

import { useMemo } from 'react';
import { GooglePlace } from '@/types/places';

interface SelectionSummaryProps {
  selectedPlaces: Set<string>;
  allPlaces: GooglePlace[];
  onStartCampaign: () => void;
}

const calculateCost = (count: number) => {
  if (count < 100) return count * 2.25;
  if (count < 1000) return count * 1.75;
  return count * 1.50;
};

const SelectionSummary = ({ selectedPlaces, allPlaces, onStartCampaign }: SelectionSummaryProps) => {
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
      <div className="hidden lg:block fixed right-0 top-0 h-full w-80 border-l border-electric-teal/20 bg-charcoal p-6">
        <div className="space-y-6">
          <h3 className="text-xl font-medium text-electric-teal">Campaign Summary</h3>
          
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

          <button
            onClick={onStartCampaign}
            disabled={stats.count === 0}
            className="w-full rounded-lg bg-electric-teal px-4 py-3 text-charcoal
              disabled:opacity-50 disabled:cursor-not-allowed hover:bg-electric-teal/90
              transition-colors duration-200"
          >
            Start Campaign
          </button>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-electric-teal/20 bg-charcoal p-4">
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

        <button
          onClick={onStartCampaign}
          disabled={stats.count === 0}
          className="w-full rounded-lg bg-electric-teal px-4 py-3 text-charcoal
            disabled:opacity-50 disabled:cursor-not-allowed hover:bg-electric-teal/90
            transition-colors duration-200"
        >
          Start Campaign (${stats.cost.toFixed(2)})
        </button>
      </div>
    </>
  );
};

export default SelectionSummary; 