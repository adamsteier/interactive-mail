import { create } from 'zustand';
import { BusinessAnalysis } from '@/types/businessAnalysis';
import { MarketingStrategy } from '@/types/marketing';
import { GooglePlace } from '@/types/places';
import { GeocodeResult } from '@/types/geocoding';
import {
  initializeSession,
  updateSessionBusinessData,
  updateSessionMarketingStrategy,
  updateSessionBusinessTypes,
  updateSessionStatus,
  BusinessData,
  getSessionId
} from '@/lib/sessionService';
import {
  createBusiness,
  updateBusiness,
  getUserBusinesses,
  Business,
  createMarketingStrategy,
  getBusinessById
} from '@/lib/businessService';
import {
  useOnlineStatus,
  storeBusinessData,
  getBusinessDataOffline,
  storeMarketingStrategy,
  getMarketingStrategyOffline,
  storePendingOperation,
  useSyncOnReconnect
} from '@/lib/offlineService';
import { serverTimestamp } from 'firebase/firestore';

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
    webSearched?: boolean;
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

  // Database state
  userBusinesses: Business[];
  activeBusiness: Business | null;
  isSaving: boolean;
  isLoadingBusinesses: boolean;
  offlineMode: boolean;

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

  // Database actions
  saveBusinessToDatabase: (userId: string) => Promise<string>;
  loadUserBusinesses: (userId: string) => Promise<void>;
  setActiveBusiness: (business: Business | null) => void;
  loadBusinessById: (businessId: string) => Promise<void>;

  // Add these new properties to the interface
  geocodeResults: GeocodeResult[];
  selectedLocation: GeocodeResult | null;
  
  // Add new actions
  setGeocodeResults: (results: GeocodeResult[]) => void;
  setSelectedLocation: (location: GeocodeResult | null) => void;
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

// We use a function to initialize the store with session data
const createMarketingStore = () => {
  return create<MarketingState>((set, get) => ({
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

    // Database state
    userBusinesses: [],
    activeBusiness: null,
    isSaving: false,
    isLoadingBusinesses: false,
    offlineMode: false,

    // Add new state
    geocodeResults: [],
    selectedLocation: null,

    // Actions
    setLocationData: (data) => set({ locationData: data }),
    
    setStep: (step) => set((state) => ({ 
      currentStep: step,
      stepsCompleted: Math.max(state.stepsCompleted, step)
    })),

    // Update business info and save to session
    updateBusinessInfo: async (info) => {
      // First, update the local state
      set((state) => ({
        businessInfo: { ...state.businessInfo, ...info }
      }));

      // Then, save to session
      try {
        // Convert to the format expected by the session service
        const sessionBusinessData: BusinessData = {
          targetArea: get().businessInfo.targetArea,
          businessName: get().businessInfo.businessName,
          industry: get().businessInfo.businessAnalysis?.industry,
          description: get().businessInfo.businessAnalysis?.description,
          boundingBox: get().businessInfo.businessAnalysis?.boundingBox,
          businessAnalysis: get().businessInfo.businessAnalysis as unknown as Record<string, unknown>
        };
        await updateSessionBusinessData(sessionBusinessData);

        // If we have an active business and are authenticated, update it too
        const activeBusiness = get().activeBusiness;
        if (activeBusiness?.id) {
          // Determine if we're online or offline
          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

          if (isOnline) {
            // Online - update Firestore directly
            await updateBusiness(activeBusiness.id, {
              targetArea: get().businessInfo.targetArea,
              businessName: get().businessInfo.businessName,
              industry: get().businessInfo.businessAnalysis?.industry,
              description: get().businessInfo.businessAnalysis?.description,
              boundingBox: get().businessInfo.businessAnalysis?.boundingBox,
              businessAnalysis: get().businessInfo.businessAnalysis || undefined
            });
          } else {
            // Offline - store in IndexedDB and queue the update
            await storeBusinessData(activeBusiness.id, {
              ...activeBusiness,
              targetArea: get().businessInfo.targetArea,
              businessName: get().businessInfo.businessName,
              industry: get().businessInfo.businessAnalysis?.industry || '',
              description: get().businessInfo.businessAnalysis?.description,
            });
            
            // Queue for sync when online
            await storePendingOperation({
              type: 'update',
              collection: 'businesses',
              id: activeBusiness.id,
              data: {
                targetArea: get().businessInfo.targetArea,
                businessName: get().businessInfo.businessName,
                industry: get().businessInfo.businessAnalysis?.industry,
                description: get().businessInfo.businessAnalysis?.description,
                boundingBox: get().businessInfo.businessAnalysis?.boundingBox,
                businessAnalysis: get().businessInfo.businessAnalysis
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to update business data:', error);
        // Still proceed - don't block the UI
      }
    },

    // Set marketing strategy and save to session
    setMarketingStrategy: async (strategy) => {
      // Update local state
      set({ marketingStrategy: strategy });

      // Save to session
      try {
        // Convert to the format expected by the session service
        await updateSessionMarketingStrategy(strategy as unknown as Record<string, unknown>);

        // If we have an active business, save the strategy to it
        const activeBusiness = get().activeBusiness;
        if (activeBusiness?.id) {
          // Determine if we're online or offline
          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

          if (isOnline) {
            // Online - create strategy in Firestore
            await createMarketingStrategy(activeBusiness.id, strategy);
          } else {
            // Offline - store in IndexedDB and queue the create
            const strategyId = `pending_${Date.now()}`;
            await storeMarketingStrategy(strategyId, {
              id: strategyId,
              businessId: activeBusiness.id,
              createdAt: serverTimestamp(),
              recommendedMethods: strategy.recommendedMethods,
              primaryRecommendation: strategy.primaryRecommendation,
              totalEstimatedReach: strategy.totalEstimatedReach,
              method1Analysis: strategy.method1Analysis,
              method2Analysis: strategy.method2Analysis,
              method3Analysis: strategy.method3Analysis,
              campaigns: []
            });
            
            // Queue for sync when online
            await storePendingOperation({
              type: 'create',
              collection: 'marketingStrategies',
              data: {
                businessId: activeBusiness.id,
                ...strategy
              }
            });
          }
        }
      } catch (error) {
        console.error('Failed to update session marketing strategy:', error);
      }
    },

    // Set selected business types and save to session
    setSelectedBusinessTypes: async (types) => {
      // Update local state
      set((state) => {
        const newTypes = typeof types === 'function' 
          ? types(state.selectedBusinessTypes)
          : types;
        
        // Save to session (async but we don't wait for it)
        updateSessionBusinessTypes(Array.from(newTypes))
          .catch(error => console.error('Failed to update session business types:', error));
        
        return { selectedBusinessTypes: newTypes };
      });
    },

    setCollectedLeads: (leads) => set({ collectedLeads: leads }),

    setBusinessAnalysis: async (analysis) => {
      // Update local state
      set((state) => ({
        businessInfo: {
          ...state.businessInfo,
          businessAnalysis: analysis
        }
      }));

      // Save to session
      try {
        // Convert to the format expected by the session service
        const sessionBusinessData: BusinessData = {
          targetArea: get().businessInfo.targetArea,
          businessName: get().businessInfo.businessName,
          industry: analysis?.industry,
          description: analysis?.description,
          boundingBox: analysis?.boundingBox,
          businessAnalysis: analysis as unknown as Record<string, unknown>
        };
        await updateSessionBusinessData(sessionBusinessData);
      } catch (error) {
        console.error('Failed to update session with business analysis:', error);
      }
    },

    updateSearchResults: (update) => set((state) => {
      const newSearchResults = {
        ...state.searchResults,
        ...update,
        places: update.places ? [...update.places] : state.searchResults.places
      };

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

    // Database actions
    saveBusinessToDatabase: async (userId) => {
      const state = get();
      set({ isSaving: true });
      
      try {
        // Create a new business in the database
        const business = await createBusiness(userId, {
          targetArea: state.businessInfo.targetArea,
          businessName: state.businessInfo.businessName,
          industry: state.businessInfo.businessAnalysis?.industry,
          description: state.businessInfo.businessAnalysis?.description,
          boundingBox: state.businessInfo.businessAnalysis?.boundingBox,
          businessAnalysis: state.businessInfo.businessAnalysis || undefined
        });
        
        // If we have a marketing strategy, create it as well
        if (state.marketingStrategy) {
          await createMarketingStrategy(business.id!, state.marketingStrategy);
        }
        
        // Update the session status to converted
        await updateSessionStatus('converted', userId);
        
        // Set as active business
        set({
          activeBusiness: business,
          isSaving: false
        });
        
        return business.id!;
      } catch (error) {
        console.error('Failed to save business to database:', error);
        set({ isSaving: false });
        throw error;
      }
    },
    
    loadUserBusinesses: async (userId) => {
      set({ isLoadingBusinesses: true });
      
      try {
        // Determine if we're online or offline
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        let businesses: Business[] = [];
        
        if (isOnline) {
          // Online - get from Firestore
          businesses = await getUserBusinesses(userId);
        } else {
          // Offline - set a flag indicating we're in offline mode
          set({ offlineMode: true });
          // We would need more complex logic here to get offline businesses
          console.log('Offline mode - unable to load businesses from server');
        }
        
        set({
          userBusinesses: businesses,
          isLoadingBusinesses: false
        });
      } catch (error) {
        console.error('Failed to load user businesses:', error);
        set({ isLoadingBusinesses: false });
      }
    },
    
    setActiveBusiness: (business) => set({ activeBusiness: business }),
    
    loadBusinessById: async (businessId) => {
      set({ isLoadingBusinesses: true });
      
      try {
        // Determine if we're online or offline
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        let business: Business | null = null;
        
        if (isOnline) {
          // Online - get from Firestore
          business = await getBusinessById(businessId);
        } else {
          // Offline - try to get from IndexedDB
          business = await getBusinessDataOffline(businessId);
          
          if (!business) {
            throw new Error('Business not available offline');
          }
          
          set({ offlineMode: true });
        }
        
        if (business) {
          // Update the current business info
          set({
            activeBusiness: business,
            businessInfo: {
              targetArea: business.targetArea,
              businessName: business.businessName,
              businessAnalysis: business.businessAnalysis || null
            },
            isLoadingBusinesses: false
          });
        } else {
          throw new Error('Business not found');
        }
      } catch (error) {
        console.error('Failed to load business:', error);
        set({ isLoadingBusinesses: false });
      }
    },

    handleSubmit: async (input) => {
      const state = get();
      state.setIsProcessing(true);
      
      try {
        if (state.currentStep === 0) {
          // First step - handle geocoding and target area
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
            state.updateBusinessInfo({ targetArea: geocodeData.results[0].formatted_address });
            state.setStep(1);
          } else {
            state.setGeocodeResults(geocodeData.results);
            // Don't advance step or update business info here - let LocationSelector handle it
          }
        } else if (state.currentStep === 1) {
          // Second step - now we have both target area and business name
          state.updateBusinessInfo({ businessName: input });
          
          // Now make the OpenAI call with both pieces of info
          const openAIResponse = await fetch('/api/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetArea: state.businessInfo.targetArea,
              businessName: input,
              userLocation: state.locationData?.city || 'Toronto',
              geocodeResult: state.selectedLocation
            }),
          });

          if (!openAIResponse.ok) {
            throw new Error('Failed to get AI response');
          }

          const data = await openAIResponse.json();
          if (data.analysis) {
            state.setBusinessAnalysis(data.analysis);
            state.updateBusinessInfo({ webSearched: data.webSearched });
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

    handleSaveEdits: async (editedInfo) => {
      const state = get();
      
      // Update business info with edited values
      state.updateBusinessInfo({
        targetArea: editedInfo.targetArea,
        businessName: editedInfo.businessName,
      });
      
      // If business analysis exists, update it with edited values
      if (state.businessInfo.businessAnalysis) {
        state.setBusinessAnalysis({
          ...state.businessInfo.businessAnalysis,
          industry: editedInfo.industry,
          description: editedInfo.description
        });
      }
      
      // Close the edit modal
      state.setIsEditModalOpen(false);
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
};

// Initialize the store
export const useMarketingStore = createMarketingStore();

// Initialize the session when the app loads
if (typeof window !== 'undefined') {
  // We do this immediately to ensure we have a session ASAP
  initializeSession().then(sessionData => {
    console.log('Session initialized:', sessionData);
    
    // Sync data when we come back online
    useSyncOnReconnect();
    
    // If session has business data, load it into the store
    if (sessionData.businessData) {
      // Convert to the format expected by the marketing store
      const businessInfo: Partial<MarketingState['businessInfo']> = {
        targetArea: sessionData.businessData.targetArea,
        businessName: sessionData.businessData.businessName
      };

      // Add business analysis if available
      if (sessionData.businessData.businessAnalysis) {
        // We need to convert the record to the correct type
        businessInfo.businessAnalysis = sessionData.businessData.businessAnalysis as unknown as BusinessAnalysis;
      }

      useMarketingStore.getState().updateBusinessInfo(businessInfo);
    }
    
    // If session has marketing strategy, load it into the store
    if (sessionData.marketingStrategy) {
      useMarketingStore.getState().setMarketingStrategy(
        sessionData.marketingStrategy as unknown as MarketingStrategy
      );
    }
    
    // If session has selected business types, load them into the store
    if (sessionData.selectedBusinessTypes && sessionData.selectedBusinessTypes.length > 0) {
      useMarketingStore.getState().setSelectedBusinessTypes(
        new Set(sessionData.selectedBusinessTypes)
      );
    }
  }).catch(error => {
    console.error('Failed to initialize session:', error);
  });
} 