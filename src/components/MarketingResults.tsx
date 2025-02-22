'use client';

import { useState } from 'react';
import { MarketingStrategy, BusinessTarget, DatabaseTarget } from '@/types/marketing';
import { BusinessAnalysis } from '@/types/businessAnalysis';
import LeadsCollection from '@/components/LeadsCollection';
import PlacesLeadsCollection from '@/components/PlacesLeadsCollection';

interface MarketingResultsProps {
  strategy: MarketingStrategy;
  boundingBox: BusinessAnalysis['boundingBox'];
  onClose: () => void;
}

interface TaskInfo {
  id: string;
  businessType: string;
  source: 'browse-ai' | 'google-places';
  places?: GooglePlace[]; // Optional field for Google Places data
}

interface GooglePlace {
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  types: string[];
  businessType: string;
}

const generateSearchQuery = (businessType: string, boundingBox: BusinessAnalysis['boundingBox']) => {
  // Calculate grid points for better coverage
  const gridSize = 3; // 3x3 grid
  const latStep = (boundingBox.northeast.lat - boundingBox.southwest.lat) / (gridSize - 1);
  const lngStep = (boundingBox.northeast.lng - boundingBox.southwest.lng) / (gridSize - 1);

  const searchUrls: string[] = [];

  // Generate search URLs for each grid point
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = boundingBox.southwest.lat + (i * latStep);
      const lng = boundingBox.southwest.lng + (j * lngStep);
      
      // Encode the business type for URL
      const encodedType = encodeURIComponent(businessType);
      
      // Create Google Maps search URL
      const searchUrl = `https://www.google.com/maps/search/${encodedType}/@${lat},${lng},12z`;
      searchUrls.push(searchUrl);
    }
  }

  return {
    businessType,
    searchUrls
  };
};

const calculateRadius = (boundingBox: BusinessAnalysis['boundingBox']) => {
  const R = 6371e3; // Earth's radius in meters
  const lat1 = boundingBox.southwest.lat * Math.PI / 180;
  const lat2 = boundingBox.northeast.lat * Math.PI / 180;
  const lon1 = boundingBox.southwest.lng * Math.PI / 180;
  const lon2 = boundingBox.northeast.lng * Math.PI / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1) * Math.cos(lat2) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Returns radius in meters
};

const MarketingResults = ({ strategy, boundingBox, onClose }: MarketingResultsProps) => {
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
  const [showLeadsCollection, setShowLeadsCollection] = useState(false);
  const [taskInfos, setTaskInfos] = useState<TaskInfo[]>([]);

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

  const handleGetData = async () => {
    try {
      const newTaskInfos: TaskInfo[] = [];
      
      // Create tasks for each selected business type
      for (const businessType of selectedTargets) {
        const query = generateSearchQuery(businessType, boundingBox);
        console.log(`\nProcessing ${businessType}:`);
        console.log('Search URLs:', query.searchUrls);

        // Create tasks for each search URL
        for (const searchUrl of query.searchUrls) {
          try {
            const browseResponse = await fetch('/api/browse-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                inputParameters: {
                  google_map_url: searchUrl,
                  max_results: 100
                }
              })
            });

            if (!browseResponse.ok) {
              throw new Error(`Failed to create Browse.ai task: ${await browseResponse.text()}`);
            }

            const browseData = await browseResponse.json();
            console.log('Task created successfully:', browseData.result.id);
            
            // Store task ID with its business type
            newTaskInfos.push({
              id: browseData.result.id,
              businessType,
              source: 'browse-ai'
            });
          } catch (error) {
            console.error('Failed to create task for URL:', searchUrl, error);
          }
        }
      }

      console.log('Total tasks created:', newTaskInfos.length);
      setTaskInfos(newTaskInfos);
      setShowLeadsCollection(true);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleGoogleSearch = async () => {
    try {
      const center = {
        lat: (boundingBox.northeast.lat + boundingBox.southwest.lat) / 2,
        lng: (boundingBox.northeast.lng + boundingBox.southwest.lng) / 2
      };
      
      const radius = calculateRadius(boundingBox);
      const searchPromises = Array.from(selectedTargets).map(async (businessType) => {
        const response = await fetch('/api/google-places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: center,
            radius,
            keyword: businessType // Send the exact business type
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch places for ${businessType}`);
        }

        const data = await response.json();
        return data.places.map((place: GooglePlace) => ({
          ...place,
          businessType // Add the search category
        }));
      });

      const results = await Promise.all(searchPromises);
      const allPlaces = results.flat();
      
      // Convert to task info format for compatibility
      const taskInfo: TaskInfo = {
        id: 'google-places-search',
        businessType: 'google-places',
        source: 'google-places',
        places: allPlaces
      };

      setTaskInfos([taskInfo]);
      setShowLeadsCollection(true);
    } catch (error) {
      console.error('Google Places search error:', error);
    }
  };

  return (
    <>
      {!showLeadsCollection ? (
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
                    {selectedTargets.size === 0 ? 'Select some businesses to get data' : 'Scrape Data'}
                  </button>
                  <button
                    onClick={handleGoogleSearch}
                    disabled={selectedTargets.size === 0}
                    className="rounded border-2 border-electric-teal bg-electric-teal/10 px-6 py-2 
                      text-electric-teal shadow-glow hover:bg-electric-teal/20 hover:shadow-glow-strong 
                      active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedTargets.size === 0 ? 'Select some businesses to get data' : 'Google Search'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        taskInfos[0]?.source === 'google-places' ? (
          <PlacesLeadsCollection
            places={taskInfos[0].places || []}
            onClose={() => {
              setShowLeadsCollection(false);
              onClose();
            }}
          />
        ) : (
          <LeadsCollection
            taskInfos={taskInfos}
            onClose={() => {
              setShowLeadsCollection(false);
              onClose();
            }}
          />
        )
      )}
    </>
  );
};

export default MarketingResults; 