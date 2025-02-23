'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GooglePlace } from '@/types/places';
import SelectionSummary from './SelectionSummary';

interface PlacesLeadsCollectionProps {
  places: GooglePlace[];
  businessContext: {
    businessName: string;
    targetArea: string;
    industry: string;
    description: string;
    targetingRationale: {
      businessType: string;
      reasoning: string;
      estimatedReach: number;
    }[];
  };
  onClose: () => void;
  isLoading?: boolean;
  progress?: number;
  totalGridPoints?: number;
  currentGridPoint?: number;
}

const PlacesLeadsCollection = ({ places, businessContext, onClose, isLoading, progress, totalGridPoints, currentGridPoint }: PlacesLeadsCollectionProps) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  
  // Calculate business type counts
  const businessTypes = useMemo(() => {
    const typeCounts = new Map<string, number>();
    places.forEach(place => {
      const type = place.businessType;
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    });
    return typeCounts;
  }, [places]);

  // Filter places based on active filter
  const filteredPlaces = useMemo(() => {
    if (activeFilter === 'all') return places;
    return places.filter(place => place.businessType === activeFilter);
  }, [places, activeFilter]);

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

  const handleSelectAll = () => {
    if (selectedPlaces.size === filteredPlaces.length) {
      setSelectedPlaces(new Set());
    } else {
      setSelectedPlaces(new Set(filteredPlaces.map(place => place.place_id)));
    }
  };

  // Add a function to get rationale for current filter
  const getCurrentRationale = () => {
    if (activeFilter === 'all') return null;
    return businessContext.targetingRationale.find(
      target => target.businessType === activeFilter
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal">
      {/* Add business context header */}
      <div className={`fixed top-0 left-0 right-0 ${isLoading ? 'mt-8' : ''}`}>
        <div className="bg-electric-teal/5 border-b border-electric-teal/20 px-4 py-3">
          <div className="text-electric-teal text-sm">
            <span className="font-medium">{businessContext.businessName}</span>
            <span className="mx-2">•</span>
            <span className="text-electric-teal/80">{businessContext.industry}</span>
            <span className="mx-2">•</span>
            <span className="text-electric-teal/60">{businessContext.targetArea}</span>
          </div>
        </div>
      </div>

      {/* Add rationale display when filter is active */}
      {getCurrentRationale() && (
        <div className="px-4 py-3 bg-electric-teal/10 border-b border-electric-teal/20">
          <div className="text-electric-teal/80 text-sm">
            <span className="font-medium">Why {getCurrentRationale()?.businessType}?</span>
            <p className="mt-1">{getCurrentRationale()?.reasoning}</p>
            <p className="mt-1 text-electric-teal/60">
              Estimated potential: {getCurrentRationale()?.estimatedReach.toLocaleString()} businesses
            </p>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0">
          <div className="h-1 bg-electric-teal/20">
            <div 
              className="h-full bg-electric-teal transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-electric-teal/60 text-sm px-4 py-1">
            Searching grid point {currentGridPoint} of {totalGridPoints}... 
            Found {places.length} places so far
          </div>
        </div>
      )}
      
      {/* Header - Add mt-8 when loading */}
      <div className={`fixed top-0 left-0 right-0 ${isLoading ? 'mt-8' : ''}`}>
        <div className="flex justify-between items-center px-4 py-2">
          <div className="text-electric-teal/60 text-sm">
            Found {places.length} places
          </div>
          <button onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Adjust top margin of filters based on loading state */}
      <div className={`flex gap-2 p-4 ${isLoading ? 'mt-20' : 'mt-12'} flex-wrap`}>
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 rounded-lg transition-all duration-300 ${
            activeFilter === 'all'
              ? 'bg-electric-teal text-charcoal'
              : 'bg-electric-teal/20 text-electric-teal hover:bg-electric-teal/30'
          }`}
        >
          All Places ({places.length})
        </button>
        {Array.from(businessTypes).map(([type, count]) => (
          <motion.button
            key={type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setActiveFilter(type)}
            className={`px-4 py-2 rounded-lg transition-all duration-300 ${
              type === activeFilter
                ? 'bg-electric-teal text-charcoal'
                : 'bg-electric-teal/20 text-electric-teal hover:bg-electric-teal/30'
            }`}
          >
            {type} ({count})
          </motion.button>
        ))}
      </div>

      {/* Places Table - Add custom scrollbar class */}
      <div className="flex-1 overflow-hidden p-4 lg:pr-[20rem]">
        <div className="h-full overflow-auto custom-scrollbar">
          <table className="w-full min-w-[1024px] border-collapse">
            <thead className="sticky top-0 bg-charcoal z-10">
              <tr className="text-electric-teal/60 text-left">
                <th className="p-2 w-[5%]">
                  <input
                    type="checkbox"
                    checked={selectedPlaces.size === filteredPlaces.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-electric-teal text-electric-teal 
                      focus:ring-electric-teal focus:ring-offset-charcoal bg-charcoal"
                  />
                </th>
                <th className="p-2 w-[15%] max-w-[200px]">Business Name</th>
                <th className="p-2 w-[12%] max-w-[150px]">Type</th>
                <th className="p-2 w-[20%] max-w-[250px]">Address</th>
                <th className="p-2 w-[8%] max-w-[100px]">Status</th>
                <th className="p-2 w-[15%] max-w-[180px]">Rating</th>
                <th className="p-2 w-[10%] max-w-[120px]">Relevance</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlaces.map((place, index) => (
                <motion.tr
                  key={`${place.name}-${place.vicinity}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-electric-teal/10 text-electric-teal/80 hover:bg-electric-teal/5"
                  onClick={() => handleSelectPlace(place.place_id)}
                >
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedPlaces.has(place.place_id)}
                      onChange={() => handleSelectPlace(place.place_id)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-electric-teal text-electric-teal 
                        focus:ring-electric-teal focus:ring-offset-charcoal bg-charcoal"
                    />
                  </td>
                  <td className="p-2 max-w-[200px]">
                    <div className="break-words">{place.name}</div>
                  </td>
                  <td className="p-2 max-w-[150px]">
                    <div className="break-words">{place.types[0]}</div>
                  </td>
                  <td className="p-2 max-w-[250px]">
                    <div className="break-words">{place.vicinity || ''}</div>
                  </td>
                  <td className="p-2 max-w-[100px]">
                    <div className="break-words">{place.business_status || ''}</div>
                  </td>
                  <td className="p-2 max-w-[180px]">
                    <div className="break-words">
                      {place.rating ? `${place.rating} (${place.user_ratings_total})` : ''}
                    </div>
                  </td>
                  <td className="p-2 max-w-[120px]">
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
      </div>

      {/* Selection Summary */}
      <SelectionSummary
        selectedPlaces={selectedPlaces}
        onStartCampaign={() => {
          console.log('Starting campaign with', selectedPlaces.size, 'places');
          // Add campaign start logic here
        }}
      />
    </div>
  );
};

export default PlacesLeadsCollection; 