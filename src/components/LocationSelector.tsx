'use client';

import { useMarketingStore } from '@/store/marketingStore';
import { GeocodeResult } from '@/types/geocoding';

const LocationSelector = () => {
  const { 
    geocodeResults, 
    setSelectedLocation, 
    setGeocodeResults,
    setStep,
    updateBusinessInfo,
    setUserInput
  } = useMarketingStore();

  const handleLocationSelect = async (location: GeocodeResult) => {
    setSelectedLocation(location);
    updateBusinessInfo({ targetArea: location.formatted_address });
    setGeocodeResults([]); // Clear results after selection
    setStep(1); // Move to next step
    setUserInput(''); // Clear input
  };

  if (geocodeResults.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border-2 border-electric-teal bg-charcoal p-6 shadow-glow">
        <h2 className="mb-4 text-xl font-semibold text-electric-teal">
          Multiple locations found. Please select one:
        </h2>
        <div className="space-y-3">
          {geocodeResults.map((result, index) => (
            <button
              key={index}
              onClick={() => handleLocationSelect(result)}
              className="w-full rounded-lg border border-electric-teal/30 p-4 text-left 
                hover:bg-electric-teal/10 transition-colors"
            >
              <div className="text-electric-teal">{result.formatted_address}</div>
              <div className="mt-1 text-sm text-electric-teal/60">
                {result.geometry.location_type === 'APPROXIMATE' ? 'General area' : 'Specific location'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LocationSelector; 