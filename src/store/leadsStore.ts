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

// Initial state
const initialState: LeadsState = {
  selectedLeadsByBusinessType: new Map(),
  selectedBusinessTypes: new Set(),
  totalSelectedLeadsCount: 0,
};

// Helper function to convert Map and Set to JSON-serializable formats
const serializeState = (state: LeadsState) => {
  return {
    selectedLeadsByBusinessType: Array.from(state.selectedLeadsByBusinessType.entries()),
    selectedBusinessTypes: Array.from(state.selectedBusinessTypes),
    totalSelectedLeadsCount: state.totalSelectedLeadsCount
  };
};

// Helper function to convert serialized data back to Map and Set
const deserializeState = (serialized: any): LeadsState => {
  return {
    selectedLeadsByBusinessType: new Map(serialized.selectedLeadsByBusinessType || []),
    selectedBusinessTypes: new Set(serialized.selectedBusinessTypes || []),
    totalSelectedLeadsCount: serialized.totalSelectedLeadsCount || 0
  };
};

// Create the store with persistence
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
          
          // Force storage update immediately
          if (typeof window !== 'undefined') {
            const currentState = useLeadsStore.getState();
            localStorage.setItem(
              'leads-storage', 
              JSON.stringify({
                state: serializeState(currentState)
              })
            );
          }
        },

        clearSelectedLeads: () => set(() => {
          console.log('LeadsStore: Clearing selected leads');
          return { ...initialState };
        }),
      }),
      {
        name: 'leads-storage',
        // Override the default serialization/deserialization
        serialize: (state) => JSON.stringify({
          state: serializeState(state)
        }),
        deserialize: (str) => {
          try {
            const parsed = JSON.parse(str);
            return deserializeState(parsed.state);
          } catch (e) {
            console.error('Failed to deserialize leads store:', e);
            return initialState;
          }
        }
      }
    ),
    { name: 'leads-storage-debug' }
  )
); 