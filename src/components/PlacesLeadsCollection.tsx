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
  // Subscribe to specific fields we need
  const places = useMarketingStore(state => state.searchResults.places);
  const isLoading = useMarketingStore(state => state.searchResults.isLoading);
  const progress = useMarketingStore(state => state.searchResults.progress);
  const setCollectedLeads = useMarketingStore(state => state.setCollectedLeads);

  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

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

  useEffect(() => {
    console.log('Places updated in component:', {
      count: places.length,
      sample: places[0]
    });
  }, [places]);

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

  const handleSelectPlace = (placeId: string, shiftKey: boolean) => {
    if (!shiftKey) {
      // Normal selection
      setSelectedPlaces(prev => {
        const newSet = new Set(prev);
        if (newSet.has(placeId)) {
          newSet.delete(placeId);
        } else {
          newSet.add(placeId);
        }
        setLastSelectedId(placeId);
        return newSet;
      });
    } else if (lastSelectedId) {
      // Shift selection
      const currentIndex = filteredPlaces.findIndex(p => p.place_id === placeId);
      const lastIndex = filteredPlaces.findIndex(p => p.place_id === lastSelectedId);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        
        setSelectedPlaces(prev => {
          const newSet = new Set(prev);
          for (let i = start; i <= end; i++) {
            newSet.add(filteredPlaces[i].place_id);
          }
          return newSet;
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-charcoal p-4">
      <div className="rounded-lg border-2 border-electric-teal bg-charcoal shadow-glow">
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

        {/* Loading Progress */}
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
              {isLoading && places.length === 0 ? (
                // Show loading skeleton rows while loading
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`loading-${index}`} className="animate-pulse">
                    <td className="p-2"><div className="h-4 w-4 bg-electric-teal/20 rounded" /></td>
                    <td className="p-2"><div className="h-4 w-48 bg-electric-teal/20 rounded" /></td>
                    <td className="p-2"><div className="h-4 w-64 bg-electric-teal/20 rounded" /></td>
                    <td className="p-2"><div className="h-4 w-32 bg-electric-teal/20 rounded" /></td>
                    <td className="p-2"><div className="h-4 w-16 bg-electric-teal/20 rounded" /></td>
                    <td className="p-2"><div className="h-4 w-16 bg-electric-teal/20 rounded" /></td>
                  </tr>
                ))
              ) : (
                // Show actual results as they come in
                filteredPlaces.map((place, index) => (
                  <motion.tr
                    key={place.place_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="text-electric-teal/80 hover:bg-electric-teal/5 cursor-pointer"
                    onClick={(e) => handleSelectPlace(place.place_id, e.shiftKey)}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedPlaces.has(place.place_id)}
                        onChange={() => {}} // Handled by row click
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
                ))
              )}
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