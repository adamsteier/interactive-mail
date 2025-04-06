'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import SelectionSummary from './SelectionSummary';
import { useMarketingStore } from '@/store/marketingStore';
import { useLeadsStore } from '@/store/leadsStore';
import LoadingBar from './LoadingBar';
import type { GooglePlace } from '@/types/places';
import { useRouter } from 'next/navigation';

interface PlacesLeadsCollectionProps {
  onClose: () => void;
}

const PlacesLeadsCollection = ({ onClose }: PlacesLeadsCollectionProps) => {
  // Subscribe to specific fields we need from marketingStore
  const places = useMarketingStore(state => state.searchResults.places);
  const isLoading = useMarketingStore(state => state.searchResults.isLoading);
  const progress = useMarketingStore(state => state.searchResults.progress);
  // Get the action from leadsStore
  const processSelectedLeads = useLeadsStore(state => state.processSelectedLeads);

  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const router = useRouter();

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

  const handleBulkSelect = (filter: string = activeFilter) => {
    setSelectedPlaces(prev => {
      const newSet = new Set(prev);
      const placesToSelect = filter === 'all' 
        ? places 
        : places.filter(place => place.businessType === filter);
      
      placesToSelect.forEach(place => newSet.add(place.place_id));
      return newSet;
    });
  };

  const handleBulkDeselect = (filter: string = activeFilter) => {
    setSelectedPlaces(prev => {
      const newSet = new Set(prev);
      const placesToDeselect = filter === 'all' 
        ? places 
        : places.filter(place => place.businessType === filter);
      
      placesToDeselect.forEach(place => newSet.delete(place.place_id));
      return newSet;
    });
  };

  // Handle starting the campaign - Updated to use leadsStore
  const handleStartCampaign = () => {
    // Get the currently selected place objects
    const selectedBusinesses = places.filter(place => 
      selectedPlaces.has(place.place_id)
    );
    
    try {
        console.log("Attempting to process leads in store...");
        // Call the action from the leadsStore to process and store them
        processSelectedLeads(selectedBusinesses);
        console.log("Successfully processed leads in store.");

        console.log("Attempting to navigate to /design...");
        // Navigate to design page
        router.push('/design');
        console.log("Navigation call successful.");

      } catch (error) {
        console.error("!!! Error during processSelectedLeads or navigation !!!", error); 
        alert("An error occurred while preparing the campaign. Please check the console."); 
      }
  };

  return (
    <div className="min-h-screen bg-charcoal p-2 sm:p-4">
      <div className="rounded-lg border-2 border-electric-teal bg-charcoal shadow-glow">
        {/* Header */}
        <div className="border-b border-electric-teal/20 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-electric-teal">
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

        {/* Bulk Selection Controls */}
        <div className="border-b border-electric-teal/20 p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-electric-teal/80">Quick Select:</span>
            <button
              onClick={() => handleBulkSelect('all')}
              className="px-4 py-2 rounded-lg border border-electric-teal/50 bg-electric-teal/10 
                text-electric-teal hover:bg-electric-teal/20 transition-colors duration-200"
            >
              Select All ({places.length})
            </button>
            <button
              onClick={() => handleBulkDeselect('all')}
              className="px-4 py-2 rounded-lg border border-electric-teal/50 bg-electric-teal/10 
                text-electric-teal hover:bg-electric-teal/20 transition-colors duration-200"
            >
              Deselect All
            </button>
            {activeFilter !== 'all' && (
              <>
                <div className="w-px h-6 bg-electric-teal/20" /> {/* Divider */}
                <button
                  onClick={() => handleBulkSelect(activeFilter)}
                  className="px-4 py-2 rounded-lg border border-electric-teal text-electric-teal 
                    bg-electric-teal/10 hover:bg-electric-teal/20 transition-colors duration-200"
                >
                  Select All {activeFilter} ({filteredPlaces.length})
                </button>
                <button
                  onClick={() => handleBulkDeselect(activeFilter)}
                  className="px-4 py-2 rounded-lg border border-electric-teal/50 bg-electric-teal/10 
                    text-electric-teal hover:bg-electric-teal/20 transition-colors duration-200"
                >
                  Deselect All {activeFilter}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-electric-teal/20 p-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
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
        <div className="p-2 overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-left text-electric-teal/60">
                <th className="p-2 w-10">Select</th>
                <th className="p-2 w-1/4">Name</th>
                <th className="p-2 w-1/3">Address</th>
                <th className="p-2 w-1/6">Type</th>
                <th className="p-2 w-16">Rating</th>
                <th className="p-2 w-16">Score</th>
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
                        onChange={() => {}}
                        className="rounded border-electric-teal text-electric-teal focus:ring-electric-teal"
                      />
                    </td>
                    <td className="p-2 break-words">{place.name}</td>
                    <td className="p-2 break-words">{place.vicinity}</td>
                    <td className="p-2 break-words">{place.businessType}</td>
                    <td className="p-2">{place.rating || 'N/A'}</td>
                    <td className="p-2">
                      <div className="flex items-center">
                        <div className={`h-1.5 w-1.5 rounded-full mr-1 ${
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
          onStartCampaign={handleStartCampaign}
        />
      </div>
    </div>
  );
};

export default PlacesLeadsCollection; 