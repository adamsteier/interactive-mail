'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GooglePlace } from '@/types/places';

interface PlacesLeadsCollectionProps {
  places: GooglePlace[];
  onClose: () => void;
  isLoading?: boolean;
  progress?: number;
}

const PlacesLeadsCollection = ({ places, onClose, isLoading, progress }: PlacesLeadsCollectionProps) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-charcoal">
      {isLoading && (
        <div className="fixed top-0 left-0 right-0">
          <div className="h-1 bg-electric-teal/20">
            <div 
              className="h-full bg-electric-teal transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-electric-teal/60 text-sm px-4 py-1">
            Searching additional areas... Found {places.length} places so far
          </div>
        </div>
      )}
      {/* Header */}
      <div className="fixed top-0 left-0 right-0">
        <div className="flex justify-between items-center px-4 py-2">
          <div className="text-electric-teal/60 text-sm">
            Found {places.length} places
          </div>
          <button
            onClick={onClose}
            className="text-electric-teal hover:text-electric-teal/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Business Type Filters */}
      <div className="flex gap-2 p-4 mt-12 flex-wrap">
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

      {/* Places Table */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full overflow-auto">
          <table className="w-full min-w-[1024px] border-collapse">
            <thead className="sticky top-0 bg-charcoal z-10">
              <tr className="text-electric-teal/60 text-left">
                <th className="p-2 w-[15%]">Business Name</th>
                <th className="p-2 w-[12%]">Type</th>
                <th className="p-2 w-[20%]">Address</th>
                <th className="p-2 w-[8%]">Status</th>
                <th className="p-2 w-[15%]">Hours</th>
                <th className="p-2 w-[10%]">Phone</th>
                <th className="p-2 w-[8%]">Rating</th>
                <th className="p-2 w-[7%]">Relevance</th>
                <th className="p-2 w-[5%]">Website</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlaces.map((place, index) => (
                <motion.tr
                  key={`${place.name}-${place.formatted_address}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="border-b border-electric-teal/10 text-electric-teal/80 hover:bg-electric-teal/5"
                >
                  <td className="p-2 truncate">{place.name}</td>
                  <td className="p-2 truncate">{place.types[0]}</td>
                  <td className="p-2 whitespace-pre-line">{place.formatted_address}</td>
                  <td className="p-2 truncate">{place.business_status}</td>
                  <td className="p-2">
                    <div className="max-h-20 overflow-y-auto">
                      {place.opening_hours?.weekday_text?.join('\n')}
                    </div>
                  </td>
                  <td className="p-2 truncate">{place.formatted_phone_number}</td>
                  <td className="p-2">
                    {place.rating} {place.user_ratings_total && `(${place.user_ratings_total})`}
                  </td>
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
                  <td className="p-2">
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-electric-teal hover:text-electric-teal/80"
                      >
                        Visit
                      </a>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlacesLeadsCollection; 