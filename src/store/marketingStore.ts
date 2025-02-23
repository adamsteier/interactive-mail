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

  // Actions
  setLocationData: (data: MarketingState['locationData']) => void;
  setStep: (step: number) => void;
  updateBusinessInfo: (info: Partial<MarketingState['businessInfo']>) => void;
  setMarketingStrategy: (strategy: MarketingStrategy) => void;
  setSelectedBusinessTypes: (types: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setCollectedLeads: (leads: GooglePlace[]) => void;
  setBusinessAnalysis: (analysis: BusinessAnalysis | null) => void;
  updateSearchResults: (update: Partial<MarketingState['searchResults']>) => void;
}

export const useMarketingStore = create<MarketingState>((set) => ({
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
  }))
})); 