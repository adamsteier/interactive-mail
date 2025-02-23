import { create } from 'zustand';
import { BusinessAnalysis } from '@/types/businessAnalysis';
import { MarketingStrategy } from '@/types/marketing';
import { GooglePlace } from '@/types/places';

interface MarketingState {
  // Step tracking
  currentStep: number;
  stepsCompleted: number;

  // Step 1: Location Data
  locationData: {
    city: string;
    region: string;
    country: string;
  } | null;

  // Step 2: User Inputs
  businessInfo: {
    targetArea: string;
    businessName: string;
    businessAnalysis: BusinessAnalysis | null;
  };

  // Step 3: Marketing Strategy
  marketingStrategy: MarketingStrategy | null;

  // Step 4: Lead Collection
  selectedBusinessTypes: Set<string>;
  collectedLeads: GooglePlace[];
  searchResults: {
    places: GooglePlace[];
    isLoading: boolean;
    progress: number;
    totalGridPoints: number;
    currentGridPoint: number;
  };

  // UI State
  userInput: string;
  isProcessing: boolean;
  inputPosition: { top: number; height: number } | undefined;
  isEditModalOpen: boolean;
  isLoadingStrategy: boolean;
  showResults: boolean;
  displayInfos: Array<{
    label: string;
    value: string;
    type: 'answer' | 'analysis';
    position?: 'first' | 'inline' | 'below';
    subInfo?: {
      industry: string;
      description: string;
    };
  }>;

  // Actions
  setLocationData: (data: MarketingState['locationData']) => void;
  setStep: (step: number) => void;
  updateBusinessInfo: (info: Partial<MarketingState['businessInfo']>) => void;
  setMarketingStrategy: (strategy: MarketingStrategy) => void;
  setSelectedBusinessTypes: (types: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setCollectedLeads: (leads: GooglePlace[]) => void;
  setBusinessAnalysis: (analysis: BusinessAnalysis | null) => void;
  updateSearchResults: (update: Partial<MarketingState['searchResults']>) => void;
  setUserInput: (input: string) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setInputPosition: (position: { top: number; height: number } | undefined) => void;
  setIsEditModalOpen: (isOpen: boolean) => void;
  setIsLoadingStrategy: (isLoading: boolean) => void;
  setShowResults: (show: boolean) => void;
  setDisplayInfos: (infos: MarketingState['displayInfos']) => void;
  handleSubmit: (input: string) => Promise<void>;
  handleSaveEdits: (editedInfo: {
    targetArea: string;
    businessName: string;
    industry: string;
    description: string;
  }) => void;
  fetchMarketingStrategy: () => Promise<void>;
  handleGoogleSearch: () => Promise<void>;

  // Add these new properties to the interface
  geocodeResults: GeocodeResult[];
  selectedLocation: GeocodeResult | null;
  
  // Add new actions
  setGeocodeResults: (results: GeocodeResult[]) => void;
  setSelectedLocation: (location: GeocodeResult | null) => void;
}

interface GeocodeResult {
  formatted_address: string;
  geometry: {
    bounds?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
}

const handleDuplicates = (place: GooglePlace, existingPlaces: GooglePlace[]): boolean => {
  return !existingPlaces.some(p => p.place_id === place.place_id);
};

const generateHexagonalGrid = (businessType: string, boundingBox: BusinessAnalysis['boundingBox']) => {
  // Calculate distances in meters
  const latDistance = (boundingBox.northeast.lat - boundingBox.southwest.lat) * 111111; // Convert to meters
  const lngDistance = (boundingBox.northeast.lng - boundingBox.southwest.lng) * 111111 * 
    Math.cos(boundingBox.southwest.lat * Math.PI / 180);
  
  // Calculate optimal grid size based on area
  const areaSize = latDistance * lngDistance;
  const gridDensity = Math.min(Math.ceil(Math.sqrt(areaSize) / 2000), 4); // Max 4x4 grid
  
  // Calculate search radius for each point
  const areaRadius = Math.min(latDistance, lngDistance) / 2;
  const baseRadius = Math.min(areaRadius / gridDensity, 5000); // Cap at 5km

  // Calculate hexagonal grid spacing
  const hexSpacing = baseRadius * 1.732; // √3 for hexagonal packing
  
  // Calculate grid dimensions
  const latCount = Math.min(
    Math.ceil((boundingBox.northeast.lat - boundingBox.southwest.lat) / (hexSpacing / 111111)),
    gridDensity
  );
  const lngCount = Math.min(
    Math.ceil((boundingBox.northeast.lng - boundingBox.southwest.lng) / (hexSpacing / (111111 * Math.cos(boundingBox.southwest.lat * Math.PI / 180)))),
    gridDensity
  );

  console.log('Grid calculations:', {
    areaSize,
    gridDensity,
    baseRadius,
    latCount,
    lngCount
  });

  const searchPoints: Array<{
    lat: number;
    lng: number;
    radius: number;
  }> = [];

  // Generate hexagonal grid points
  for (let row = 0; row < latCount; row++) {
    for (let col = 0; col < lngCount; col++) {
      const latOffset = row * (hexSpacing / 111111);
      const lngOffset = col * (hexSpacing / (111111 * Math.cos(boundingBox.southwest.lat * Math.PI / 180)));
      
      // Offset every other row for hexagonal packing
      const lat = boundingBox.southwest.lat + latOffset;
      const lng = boundingBox.southwest.lng + lngOffset + (row % 2 ? hexSpacing / (2 * 111111) : 0);

      // Only add points within the bounding box
      if (lat <= boundingBox.northeast.lat && lng <= boundingBox.northeast.lng) {
        searchPoints.push({ 
          lat, 
          lng, 
          radius: baseRadius 
        });
      }
    }
  }

  return {
    businessType,
    searchPoints,
    totalPoints: searchPoints.length,
    gridDetails: {
      density: gridDensity,
      radius: baseRadius,
      spacing: hexSpacing
    }
  };
};

export const useMarketingStore = create<MarketingState>((set, get) => ({
  // Initial State
  currentStep: 0,
  stepsCompleted: 0,
  locationData: null,
  businessInfo: {
    targetArea: '',
    businessName: '',
    businessAnalysis: null,
  },
  marketingStrategy: null,
  selectedBusinessTypes: new Set<string>(),
  collectedLeads: [],
  searchResults: {
    places: [],
    isLoading: false,
    progress: 0,
    totalGridPoints: 0,
    currentGridPoint: 0
  },

  // UI State
  userInput: '',
  isProcessing: false,
  inputPosition: undefined,
  isEditModalOpen: false,
  isLoadingStrategy: false,
  showResults: false,
  displayInfos: [],

  // Add new state
  geocodeResults: [],
  selectedLocation: null,

  // Actions
  setLocationData: (data) => set({ locationData: data }),
  
  setStep: (step) => set((state) => ({ 
    currentStep: step,
    stepsCompleted: Math.max(state.stepsCompleted, step)
  })),

  updateBusinessInfo: (info) => set((state) => ({
    businessInfo: { ...state.businessInfo, ...info }
  })),

  setMarketingStrategy: (strategy) => set({ marketingStrategy: strategy }),

  setSelectedBusinessTypes: (types) => set((state) => ({ 
    selectedBusinessTypes: typeof types === 'function' 
      ? types(state.selectedBusinessTypes)
      : types
  })),

  setCollectedLeads: (leads) => set({ collectedLeads: leads }),

  setBusinessAnalysis: (analysis) => set((state) => ({
    businessInfo: {
      ...state.businessInfo,
      businessAnalysis: analysis
    }
  })),

  updateSearchResults: (update) => set((state) => {
    // Create completely new objects to ensure state updates are detected
    const newSearchResults = {
      ...state.searchResults,
      ...update,
      // Ensure places array is a new array reference
      places: update.places ? [...update.places] : state.searchResults.places
    };

    console.log('Store update:', {
      currentPlaces: state.searchResults.places.length,
      newPlaces: update.places?.length || 0,
      stateAfterUpdate: newSearchResults.places.length
    });

    return {
      searchResults: newSearchResults
    };
  }),

  setUserInput: (input) => set({ userInput: input }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setInputPosition: (position) => set({ inputPosition: position }),
  setIsEditModalOpen: (isOpen) => set({ isEditModalOpen: isOpen }),
  setIsLoadingStrategy: (isLoading) => set({ isLoadingStrategy: isLoading }),
  setShowResults: (show) => set({ showResults: show }),
  setDisplayInfos: (infos) => set({ displayInfos: infos }),

  handleSubmit: async (input) => {
    const state = get();
    state.setIsProcessing(true);
    
    try {
      if (state.currentStep === 0) {
        const geocodeResponse = await fetch('/api/geocode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetArea: input }),
        });

        if (!geocodeResponse.ok) {
          throw new Error('Failed to geocode location');
        }

        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.results.length === 0) {
          throw new Error('No locations found');
        }
        
        if (geocodeData.results.length === 1) {
          state.setSelectedLocation(geocodeData.results[0]);
          state.updateBusinessInfo({ targetArea: input });
          
          const openAIResponse = await fetch('/api/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetArea: input,
              businessName: state.businessInfo.businessName,
              userLocation: state.locationData?.city || 'Toronto',
              geocodeResult: geocodeData.results[0]
            }),
          });

          if (!openAIResponse.ok) {
            throw new Error('Failed to get AI response');
          }

          const data = await openAIResponse.json();
          if (data.analysis) {
            state.setBusinessAnalysis(data.analysis);
          }
          state.setStep(1);
        } else {
          state.setGeocodeResults(geocodeData.results);
        }
      } else if (state.currentStep === 1) {
        // Handle business name submission as before
        state.updateBusinessInfo({ businessName: input });
        state.setStep(2);
      }
      
      state.setUserInput('');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      state.setIsProcessing(false);
    }
  },

  handleSaveEdits: (editedInfo) => {
    const state = get();
    state.updateBusinessInfo({
      targetArea: editedInfo.targetArea,
      businessName: editedInfo.businessName,
    });
    state.setBusinessAnalysis({
      ...state.businessInfo.businessAnalysis!,
      industry: editedInfo.industry,
      description: editedInfo.description,
    });
  },

  fetchMarketingStrategy: async () => {
    const state = get();
    state.setIsLoadingStrategy(true);
    try {
      const response = await fetch('/api/marketing-strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetArea: state.businessInfo.targetArea,
          businessName: state.businessInfo.businessName,
          industry: state.businessInfo.businessAnalysis?.industry,
          description: state.businessInfo.businessAnalysis?.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get marketing strategy');
      }

      const data = await response.json();
      state.setMarketingStrategy(data.analysis);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      state.setIsLoadingStrategy(false);
    }
  },

  handleGoogleSearch: async () => {
    const state = get();
    try {
      if (!state.businessInfo.businessAnalysis?.boundingBox) {
        throw new Error('No bounding box available');
      }

      const boundingBox = state.businessInfo.businessAnalysis.boundingBox;

      console.log('Starting search with:', {
        boundingBox,
        selectedTypes: Array.from(state.selectedBusinessTypes)
      });

      state.updateSearchResults({
        places: [],
        isLoading: true,
        progress: 0,
        totalGridPoints: 0,
        currentGridPoint: 0
      });
      state.setShowResults(true);

      const allPlacesAcrossTypes: GooglePlace[] = [];

      for (const businessType of state.selectedBusinessTypes) {
        const gridConfig = generateHexagonalGrid(
          businessType,
          boundingBox
        );

        console.log('Grid search config:', {
          businessType,
          pointCount: gridConfig.searchPoints.length,
          points: gridConfig.searchPoints
        });

        state.updateSearchResults({
          totalGridPoints: gridConfig.searchPoints.length
        });

        for (let i = 0; i < gridConfig.searchPoints.length; i++) {
          const point = gridConfig.searchPoints[i];

          console.log('Searching point:', {
            businessType,
            lat: point.lat,
            lng: point.lng,
            radius: point.radius
          });

          state.updateSearchResults({
            currentGridPoint: i + 1,
            progress: 5 + ((i + 1) / gridConfig.searchPoints.length * 95)
          });

          try {
            const response = await fetch('/api/google-places', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: point.lat,
                lng: point.lng,
                radius: point.radius,
                keyword: businessType,
                boundingBox
              }),
            });

            const data = await response.json();
            console.log('API Response data:', {
              hasPlaces: !!data.places,
              placesLength: data.places?.length,
              firstPlace: data.places?.[0]
            });

            if (data.places?.length) {
              const newPlaces = data.places
                .map((place: GooglePlace) => ({
                  ...place,
                  businessType
                }))
                .filter((place: GooglePlace) => handleDuplicates(place, allPlacesAcrossTypes));

              console.log('After processing:', {
                newPlacesLength: newPlaces.length,
                totalPlacesBeforePush: allPlacesAcrossTypes.length
              });

              allPlacesAcrossTypes.push(...newPlaces);
              
              // Update the store with new places
              state.updateSearchResults({
                places: allPlacesAcrossTypes,
                currentGridPoint: i + 1,
                progress: 5 + ((i + 1) / gridConfig.searchPoints.length * 95)
              });

              console.log('Store updated:', {
                totalPlaces: allPlacesAcrossTypes.length,
                storeLength: state.searchResults.places.length
              });
            }
          } catch (error) {
            console.error('Search point error:', error);
          }
        }
      }

      // Final update
      state.updateSearchResults({
        places: allPlacesAcrossTypes,
        isLoading: false,
        progress: 100
      });

    } catch (error) {
      console.error('Search failed:', error);
      state.updateSearchResults({
        isLoading: false
      });
    }
  },

  setGeocodeResults: (results) => set({ geocodeResults: results }),
  setSelectedLocation: (location) => set({ selectedLocation: location }),
})); 