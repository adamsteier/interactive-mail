import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
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

// Initial state
const initialState: LeadsState = {
  selectedLeadsByBusinessType: new Map(),
  selectedBusinessTypes: new Set(),
  totalSelectedLeadsCount: 0,
};

// Create the store
export const useLeadsStore = create<LeadsState & LeadsActions>()(
  devtools(
    (set) => ({
      ...initialState,

      // Action implementations
      processSelectedLeads: (selectedPlacesArray) => set(() => {
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
      }),

      clearSelectedLeads: () => set(() => {
        console.log('LeadsStore: Clearing selected leads');
        return { ...initialState };
      }),
    }),
    { name: 'leads-storage' } // Name for Redux DevTools
  )
); 