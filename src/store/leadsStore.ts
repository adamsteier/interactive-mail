import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { GooglePlace } from '@/types/places'; // Assuming this type exists

// Define the structure of the state
interface LeadsState {
  selectedLeadsByBusinessType: Map<string, GooglePlace[]>;
  selectedBusinessTypes: Set<string>;
  totalSelectedLeadsCount: number;
}

// Define the actions available on the store
interface LeadsActions {
  processSelectedLeads: (selectedPlacesArray: GooglePlace[]) => void;
  clearSelectedLeads: () => void;
}

// Combined type
type LeadsStore = LeadsState & LeadsActions;

// Serialized state structure for storage
interface SerializedState {
  selectedLeadsByBusinessType: [string, GooglePlace[]][];
  selectedBusinessTypes: string[];
  totalSelectedLeadsCount: number;
}

// Initial state
const initialState: LeadsState = {
  selectedLeadsByBusinessType: new Map(),
  selectedBusinessTypes: new Set(),
  totalSelectedLeadsCount: 0,
};

// Create the store
export const useLeadsStore = create<LeadsStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Action implementations
        processSelectedLeads: (selectedPlacesArray) => {
          if (!selectedPlacesArray || selectedPlacesArray.length === 0) {
            console.error('LeadsStore: No places to process');
            return;
          }
          
          set(() => {
            const newMap = new Map<string, GooglePlace[]>();
            const newTypes = new Set<string>();
            let totalCount = 0;

            for (const place of selectedPlacesArray) {
              const type = place.businessType; // Assuming businessType is a required field
              if (!newMap.has(type)) {
                newMap.set(type, []);
              }
              newMap.get(type)?.push(place);
              newTypes.add(type);
              totalCount++;
            }

            console.log('LeadsStore: Processed selected leads', {
                count: totalCount,
                types: Array.from(newTypes),
                mapKeys: Array.from(newMap.keys()),
            });

            return {
              selectedLeadsByBusinessType: newMap,
              selectedBusinessTypes: newTypes,
              totalSelectedLeadsCount: totalCount,
            };
          });
          
          // Manual storage to ensure state is saved before navigation
          if (typeof window !== 'undefined') {
            try {
              const currentState = useLeadsStore.getState();
              const serialized: SerializedState = {
                selectedLeadsByBusinessType: Array.from(currentState.selectedLeadsByBusinessType.entries()),
                selectedBusinessTypes: Array.from(currentState.selectedBusinessTypes),
                totalSelectedLeadsCount: currentState.totalSelectedLeadsCount
              };
              localStorage.setItem('leads-manual-storage', JSON.stringify(serialized));
            } catch (e) {
              console.error('Failed to manually save state:', e);
            }
          }
        },

        clearSelectedLeads: () => set(() => {
          console.log('LeadsStore: Clearing selected leads');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('leads-manual-storage');
          }
          return { ...initialState };
        }),
      }),
      {
        name: 'leads-storage',
      }
    ),
    { name: 'leads-storage-debug' }
  )
);

// Initialize from localStorage if available
if (typeof window !== 'undefined') {
  try {
    const savedState = localStorage.getItem('leads-manual-storage');
    if (savedState) {
      const parsed = JSON.parse(savedState) as SerializedState;
      useLeadsStore.setState({
        selectedLeadsByBusinessType: new Map(parsed.selectedLeadsByBusinessType || []),
        selectedBusinessTypes: new Set(parsed.selectedBusinessTypes || []),
        totalSelectedLeadsCount: parsed.totalSelectedLeadsCount || 0
      });
      console.log('Restored state from manual storage');
    }
  } catch (e) {
    console.error('Failed to load from manual storage:', e);
  }
} 