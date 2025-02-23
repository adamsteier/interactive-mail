'use client';

import { useState } from 'react';
import { MarketingStrategy, BusinessTarget, DatabaseTarget } from '@/types/marketing';
import { BusinessAnalysis } from '@/types/businessAnalysis';
import LeadsCollection from '@/components/LeadsCollection';
import PlacesLeadsCollection from '@/components/PlacesLeadsCollection';
import { GooglePlace } from '@/types/places';

interface MarketingResultsProps {
  strategy: MarketingStrategy;
  boundingBox: BusinessAnalysis['boundingBox'];
  onClose: () => void;
}

interface TaskInfo {
  id: string;
  businessType: string;
  source: 'browse-ai' | 'google-places';
  places?: GooglePlace[];
  isLoading?: boolean;
  progress?: number;
  totalGridPoints?: number;
  currentGridPoint?: number;
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

const generateHexagonalGrid = (businessType: string, boundingBox: BusinessAnalysis['boundingBox'], estimatedReach: number = 100) => {
  // Calculate area dimensions in meters
  const totalRadius = calculateRadius(boundingBox);
  const areaWidth = totalRadius * 2;
  
  // Use 500m as base radius for urban areas, but scale up for larger areas
  const baseRadius = 500; // 500m base for dense urban areas
  const searchRadius = Math.min(
    Math.max(baseRadius, areaWidth / 20), // Scale up more gradually
    25000 // Cap at 25km for large areas
  );

  // Calculate hex grid dimensions
  // For hexagons, optimal spacing is 2 * radius * cos(30°) ≈ 1.732 * radius
  const hexSpacing = searchRadius * 1.732;
  
  // Calculate number of hexagons needed
  const latCount = Math.min(
    Math.ceil((boundingBox.northeast.lat - boundingBox.southwest.lat) / (hexSpacing / 111111)), // Convert meters to degrees (approx)
    4 // Cap at 4 rows
  );
  const lngCount = Math.min(
    Math.ceil((boundingBox.northeast.lng - boundingBox.southwest.lng) / (hexSpacing / (111111 * Math.cos(boundingBox.southwest.lat * Math.PI / 180)))),
    4 // Cap at 4 columns
  );

  console.log(`Area width: ${areaWidth}m`);
  console.log(`Search radius: ${searchRadius}m`);
  console.log(`Estimated businesses: ${estimatedReach}`);
  console.log(`Hex grid: ${latCount}x${lngCount} (${latCount * lngCount} points)`);

  const searchPoints: Array<{
    lat: number;
    lng: number;
    radius: number;
  }> = [];

  // Generate hexagonal grid points
  for (let row = 0; row < latCount; row++) {
    for (let col = 0; col < lngCount; col++) {
      // Calculate center of hexagon
      // Offset every other row by half a hex
      const latOffset = row * (hexSpacing / 111111);
      const lngOffset = col * (hexSpacing / (111111 * Math.cos(boundingBox.southwest.lat * Math.PI / 180)));
      
      const lat = boundingBox.southwest.lat + latOffset;
      const lng = boundingBox.southwest.lng + lngOffset + (row % 2 ? hexSpacing / (2 * 111111) : 0);

      // Only add point if it's within bounds
      if (lat <= boundingBox.northeast.lat && lng <= boundingBox.northeast.lng) {
        searchPoints.push({
          lat,
          lng,
          radius: searchRadius
        });
      }
    }
  }

  return {
    businessType,
    searchPoints,
    totalPoints: searchPoints.length
  };
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
      setTaskInfos([{
        id: 'google-places-search',
        businessType: 'google-places',
        source: 'google-places',
        places: [],
        isLoading: true,
        progress: 0,
        totalGridPoints: 0,
        currentGridPoint: 0
      }]);
      setShowLeadsCollection(true);

      let allPlacesAcrossTypes: GooglePlace[] = [];

      // Start grid-based search for each business type
      for (const businessType of selectedTargets) {
        // Get the estimated reach for this specific business type
        const businessTypeConfig = strategy.method1Analysis.businessTargets.find(
          (bt: BusinessTarget) => bt.type === businessType
        );

        if (!businessTypeConfig) {
          console.error(`No configuration found for business type: ${businessType}`);
          continue;
        }

        console.log(`Processing ${businessType} with estimated reach: ${businessTypeConfig.estimatedReach}`);

        const gridConfig = generateHexagonalGrid(
          businessType, 
          boundingBox,
          businessTypeConfig.estimatedReach ?? 100
        );

        console.log(`Starting grid search for ${businessType}`);
        console.log(`Grid size: ${Math.sqrt(gridConfig.searchPoints.length)}x${Math.sqrt(gridConfig.searchPoints.length)}`);
        console.log(`Total points: ${gridConfig.searchPoints.length}`);

        // Update total grid points
        setTaskInfos(current => [{
          ...current[0],
          totalGridPoints: gridConfig.searchPoints.length
        }]);

        // Process each grid point
        for (let i = 0; i < gridConfig.searchPoints.length; i++) {
          const point = gridConfig.searchPoints[i];
          
          console.log(`Searching grid point ${i + 1}/${gridConfig.searchPoints.length}`);
          console.log(`Location: ${point.lat}, ${point.lng}`);
          console.log(`Radius: ${point.radius}m`);

          // Update current grid point
          setTaskInfos(current => [{
            ...current[0],
            currentGridPoint: i + 1,
            progress: 5 + ((i + 1) / gridConfig.searchPoints.length * 95)
          }]);

          const response = await fetch('/api/google-places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: {
                lat: point.lat,
                lng: point.lng
              },
              radius: point.radius,
              keyword: businessType
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('API Response:', data);
            console.log(`Found ${data.places?.length || 0} new places at point ${i + 1}`);
            
            // Add businessType to each place
            const placesWithType = data.places.map((place: GooglePlace) => ({
              ...place,
              businessType
            }));
            
            // Deduplicate against all places found so far
            const newPlaces = placesWithType.filter((newPlace: GooglePlace) => 
              !allPlacesAcrossTypes.some(existing => existing.place_id === newPlace.place_id)
            );
            
            console.log(`After deduplication: ${newPlaces.length} unique new places`);
            
            allPlacesAcrossTypes = [...allPlacesAcrossTypes, ...newPlaces];
            console.log(`Total unique places across all types: ${allPlacesAcrossTypes.length}`);

            // Update places immediately
            setTaskInfos(current => [{
              ...current[0],
              places: allPlacesAcrossTypes
            }]);
          } else {
            console.error('API Error:', await response.text());
          }
        }
      }

      // Final update
      setTaskInfos(current => [{
        ...current[0],
        places: allPlacesAcrossTypes,
        isLoading: false,
        progress: 100
      }]);

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
                  Estimated total reach: {
                    strategy.totalEstimatedReach != null 
                      ? strategy.totalEstimatedReach.toLocaleString() 
                      : 'Unknown'
                  } potential leads
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
                            Estimated number of businesses: {
                              target.estimatedReach != null 
                                ? target.estimatedReach.toLocaleString() 
                                : 'Unknown'
                            }
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
            isLoading={taskInfos[0].isLoading}
            progress={taskInfos[0].progress}
            onClose={() => {
              setShowLeadsCollection(false);
              onClose();
            }}
            businessTargets={strategy.method1Analysis.businessTargets}
            strategy={{
              primaryRecommendation: strategy.primaryRecommendation,
              overallReasoning: strategy.method1Analysis.overallReasoning
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