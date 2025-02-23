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
}

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
})); 