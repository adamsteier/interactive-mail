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
}

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

const handleDuplicates = (place: GooglePlace, existingPlaces: GooglePlace[]): boolean => {
  return !existingPlaces.some(p => p.place_id === place.place_id);
};

const generateHexagonalGrid = (businessType: string, boundingBox: BusinessAnalysis['boundingBox'], estimatedReach = 100) => {
  // Calculate grid density based on estimated reach
  const gridDensity = Math.min(Math.ceil(estimatedReach / 25), 4); // Max 4x4 grid
  
  const totalRadius = calculateRadius(boundingBox);
  const areaWidth = totalRadius * 2;
  
  // Adjust base radius based on estimated reach and area size
  const baseRadius = Math.min(
    Math.max(500, areaWidth / (gridDensity * 2)), // Scale with grid density
    25000 // Cap at 25km
  );

  const hexSpacing = baseRadius * 1.732;
  
  const latCount = Math.min(
    Math.ceil((boundingBox.northeast.lat - boundingBox.southwest.lat) / (hexSpacing / 111111)),
    4
  );
  const lngCount = Math.min(
    Math.ceil((boundingBox.northeast.lng - boundingBox.southwest.lng) / (hexSpacing / (111111 * Math.cos(boundingBox.southwest.lat * Math.PI / 180)))),
    4
  );

  const searchPoints: Array<{
    lat: number;
    lng: number;
    radius: number;
  }> = [];

  for (let row = 0; row < latCount; row++) {
    for (let col = 0; col < lngCount; col++) {
      const latOffset = row * (hexSpacing / 111111);
      const lngOffset = col * (hexSpacing / (111111 * Math.cos(boundingBox.southwest.lat * Math.PI / 180)));
      
      const lat = boundingBox.southwest.lat + latOffset;
      const lng = boundingBox.southwest.lng + lngOffset + (row % 2 ? hexSpacing / (2 * 111111) : 0);

      if (lat <= boundingBox.northeast.lat && lng <= boundingBox.northeast.lng) {
        searchPoints.push({ lat, lng, radius: baseRadius });
      }
    }
  }

  return {
    businessType,
    searchPoints,
    totalPoints: searchPoints.length
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

  updateSearchResults: (update) => set((state) => ({
    searchResults: { ...state.searchResults, ...update }
  })),

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
        state.updateBusinessInfo({ targetArea: input });
        state.setStep(1);
      } else if (state.currentStep === 1) {
        state.updateBusinessInfo({ businessName: input });
        
        const response = await fetch('/api/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetArea: state.businessInfo.targetArea,
            businessName: input,
            userLocation: state.locationData?.city || 'Toronto',
          }),
        });

        if (!response.ok) throw new Error('Failed to get AI response');

        const data = await response.json();
        if (data.analysis) {
          state.setBusinessAnalysis(data.analysis);
        }
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

      console.log('Starting search with:', {
        boundingBox: state.businessInfo.businessAnalysis.boundingBox,
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
          state.businessInfo.businessAnalysis.boundingBox
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
                keyword: businessType
              }),
            });

            if (!response.ok) {
              throw new Error(`API Error: ${await response.text()}`);
            }

            const data = await response.json();
            console.log('API Response:', {
              status: response.status,
              places: data.places?.length || 0,
              error: data.error
            });
            if (data.places) {
              const newPlaces = data.places
                .map((place: GooglePlace) => ({
                  ...place,
                  businessType
                }))
                .filter((place: GooglePlace) => handleDuplicates(place, allPlacesAcrossTypes));

              allPlacesAcrossTypes.push(...newPlaces);
              
              state.updateSearchResults({
                places: allPlacesAcrossTypes
              });
            }
          } catch (error) {
            console.error('API Error:', error);
            // Continue with next point even if one fails
          }
        }
      }

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
  }
})); 