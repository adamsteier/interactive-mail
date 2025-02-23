'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import SelectionSummary from './SelectionSummary';
import { useMarketingStore } from '@/store/marketingStore';
import LoadingBar from './LoadingBar';
import type { GooglePlace } from '@/types/places';

interface PlacesLeadsCollectionProps {
  onClose: () => void;
}

const PlacesLeadsCollection = ({ onClose }: PlacesLeadsCollectionProps) => {
  const { 
    searchResults,
    setCollectedLeads
  } = useMarketingStore();

  const { places, isLoading, progress } = searchResults;
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Get unique business types for filtering
  const businessTypes = useMemo(() => {
    const types = new Set(places.map(place => place.businessType));
    return Array.from(types);
  }, [places]);

  // Filter places based on active filter
  const filteredPlaces: GooglePlace[] = useMemo(() => {
    const filtered = activeFilter === 'all' 
      ? places 
      : places.filter(place => place.businessType === activeFilter);
    
    return filtered;
  }, [places, activeFilter]);

  // Log updates after all variables are defined
  useEffect(() => {
    console.log('PlacesLeadsCollection render:', {
      placesLength: places.length,
      isLoading,
      progress,
      hasPlaces: places.length > 0,
      firstPlace: places[0],
      filteredLength: filteredPlaces.length,
      businessTypes
    });

    console.log('Filtered places:', {
      activeFilter,
      totalPlaces: places.length,
      filteredCount: filteredPlaces.length
    });
  }, [places, isLoading, progress, filteredPlaces, businessTypes, activeFilter]);

  const handleSelectPlace = (placeId: string) => {
    setSelectedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-charcoal/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl rounded-lg border-2 border-electric-teal bg-charcoal shadow-glow my-8">
        {/* Header with close button */}
        <div className="border-b border-electric-teal/20 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-electric-teal">
            Found Places ({places.length}) {isLoading && <span>- Searching...</span>}
          </h2>
          <button 
            onClick={onClose}
            className="text-electric-teal hover:text-electric-teal/80"
          >
            Close
          </button>
        </div>
        {isLoading && <LoadingBar progress={progress} />}

        {/* Filters */}
        <div className="border-b border-electric-teal/20 p-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`rounded px-3 py-1 ${
                activeFilter === 'all' 
                  ? 'bg-electric-teal text-charcoal' 
                  : 'text-electric-teal hover:bg-electric-teal/10'
              }`}
            >
              All ({places.length})
            </button>
            {businessTypes.map(type => (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`rounded px-3 py-1 ${
                  activeFilter === type 
                    ? 'bg-electric-teal text-charcoal' 
                    : 'text-electric-teal hover:bg-electric-teal/10'
                }`}
              >
                {type} ({places.filter(p => p.businessType === type).length})
              </button>
            ))}
          </div>
        </div>

        {/* Results Table */}
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="text-left text-electric-teal/60">
                <th className="p-2">Select</th>
                <th className="p-2">Name</th>
                <th className="p-2">Address</th>
                <th className="p-2">Type</th>
                <th className="p-2">Rating</th>
                <th className="p-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlaces.map((place, index) => (
                <motion.tr
                  key={place.place_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="text-electric-teal/80 hover:bg-electric-teal/5"
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedPlaces.has(place.place_id)}
                      onChange={() => handleSelectPlace(place.place_id)}
                      className="rounded border-electric-teal text-electric-teal focus:ring-electric-teal"
                    />
                  </td>
                  <td className="p-2">{place.name}</td>
                  <td className="p-2">{place.vicinity}</td>
                  <td className="p-2">{place.businessType}</td>
                  <td className="p-2">{place.rating || 'N/A'}</td>
                  <td className="p-2">
                    <div className="flex items-center">
                      <div className={`h-2 w-2 rounded-full mr-2 ${
                        place.relevanceScore >= 15 ? 'bg-green-500' :
                        place.relevanceScore >= 10 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`} />
                      {place.relevanceScore}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selection Summary */}
        <SelectionSummary
          selectedPlaces={selectedPlaces}
          onStartCampaign={() => {
            const selectedBusinesses = filteredPlaces.filter(place => 
              selectedPlaces.has(place.place_id)
            );
            setCollectedLeads(selectedBusinesses);
            console.log('Starting campaign with', selectedPlaces.size, 'places');
          }}
        />
      </div>
    </div>
  );
};

export default PlacesLeadsCollection; 