import db from './db';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  increment,
  writeBatch,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { GooglePlace } from '@/types/places';

// Campaign interfaces
export interface Campaign {
  id?: string;
  name: string;
  businessId: string;
  userId: string;
  businessTypes: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  status: 'draft' | 'active' | 'completed';
  leadCount: number;
  selectedLeadCount: number;
  postcardDesigns?: string[]; // Array of design IDs
}

export interface CampaignLead {
  id?: string;
  campaignId: string;
  placeId: string;
  businessName: string;
  address: string;
  phoneNumber?: string;
  website?: string;
  businessType: string;
  selected: boolean;
  location: {
    lat: number;
    lng: number;
  };
  contacted: boolean;
  notes?: string;
  createdAt: Timestamp | null;
}

// Create a new campaign
export const createCampaign = async (
  userId: string,
  businessId: string,
  name: string,
  businessTypes: string[]
): Promise<Campaign> => {
  const campaignRef = doc(collection(db, 'campaigns'));
  const campaign: Campaign = {
    userId,
    businessId,
    name,
    businessTypes,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    status: 'draft',
    leadCount: 0,
    selectedLeadCount: 0,
    postcardDesigns: []
  };

  await setDoc(campaignRef, campaign);
  
  return {
    ...campaign,
    id: campaignRef.id
  };
};

// Get a campaign by ID
export const getCampaignById = async (campaignId: string): Promise<Campaign | null> => {
  try {
    const campaignDoc = await getDoc(doc(db, 'campaigns', campaignId));
    
    if (!campaignDoc.exists()) {
      return null;
    }
    
    return {
      id: campaignDoc.id,
      ...campaignDoc.data()
    } as Campaign;
  } catch (error) {
    console.error('Error getting campaign:', error);
    throw error;
  }
};

// Get all campaigns for a USER
export const getUserCampaigns = async (userId: string): Promise<Campaign[]> => {
  try {
    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('userId', '==', userId)
    );
    
    const campaignDocs = await getDocs(campaignsQuery);
    return campaignDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Campaign));
  } catch (error) {
    console.error('Error getting user campaigns:', error);
    throw error;
  }
};

// Get all campaigns for a business
export const getBusinessCampaigns = async (businessId: string): Promise<Campaign[]> => {
  try {
    const campaignsQuery = query(
      collection(db, 'campaigns'),
      where('businessId', '==', businessId)
    );
    
    const campaignDocs = await getDocs(campaignsQuery);
    return campaignDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Campaign));
  } catch (error) {
    console.error('Error getting business campaigns:', error);
    throw error;
  }
};

// Update campaign
export const updateCampaign = async (
  campaignId: string,
  data: Partial<Omit<Campaign, 'id' | 'createdAt'>>
): Promise<void> => {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    await updateDoc(campaignRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    throw error;
  }
};

// Convert Google Place to CampaignLead
export const convertPlaceToLead = (
  place: GooglePlace,
  campaignId: string
): CampaignLead => {
  // Ensure we have valid location data
  if (!place.geometry?.location) {
    console.error('Place missing geometry/location:', place);
    throw new Error(`Place ${place.name} is missing location data`);
  }
  
  const lead: CampaignLead = {
    campaignId,
    placeId: place.place_id,
    businessName: place.name,
    address: place.vicinity || place.formatted_address || '',
    businessType: place.businessType || '',
    selected: false,
    location: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    },
    contacted: false,
    createdAt: serverTimestamp() as Timestamp
  };
  
  // Only add optional fields if they have values (not undefined)
  if (place.formatted_phone_number) {
    lead.phoneNumber = place.formatted_phone_number;
  }
  
  if (place.website) {
    lead.website = place.website;
  }
  
  if (place.rating !== undefined && place.rating !== null) {
    // Add rating to the lead if we want to store it
    // Note: rating is not currently in the CampaignLead interface
  }
  
  return lead;
};

// Add leads to a campaign
export const addLeadsToCampaign = async (
  campaignId: string,
  leads: GooglePlace[]
): Promise<string[]> => {
  try {
    // Convert Google Places to CampaignLeads
    const campaignLeads = leads.map(place => convertPlaceToLead(place, campaignId));
    
    // Use a batch write for efficiency
    const batch = writeBatch(db);
    const leadRefs: DocumentReference[] = [];
    
    // Store leads in the campaign's subcollection
    const campaignRef = doc(db, 'campaigns', campaignId);
    const leadsCollectionRef = collection(campaignRef, 'leads');
    
    campaignLeads.forEach(lead => {
      const leadRef = doc(leadsCollectionRef);
      leadRefs.push(leadRef);
      batch.set(leadRef, lead);
    });
    
    // Update the campaign with the new lead count using increment
    batch.update(campaignRef, {
      // Use Firestore increment
      leadCount: increment(campaignLeads.length),
      updatedAt: serverTimestamp()
    });
    
    await batch.commit();
    
    // Return the IDs of the new leads
    return leadRefs.map(ref => ref.id);
  } catch (error) {
    console.error('Error adding leads to campaign:', error);
    throw error;
  }
};

// Get leads for a campaign
export const getCampaignLeads = async (campaignId: string): Promise<CampaignLead[]> => {
  try {
    // Query leads from the campaign's subcollection
    const campaignRef = doc(db, 'campaigns', campaignId);
    const leadsRef = collection(campaignRef, 'leads');
    
    const leadDocs = await getDocs(leadsRef);
    return leadDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CampaignLead));
  } catch (error) {
    console.error('Error getting campaign leads:', error);
    throw error;
  }
};

// Update a single lead
export const updateLead = async (
  campaignId: string,
  leadId: string,
  data: Partial<Omit<CampaignLead, 'id' | 'campaignId' | 'createdAt'>>
): Promise<void> => {
  try {
    // Reference lead in the campaign's subcollection
    const campaignRef = doc(db, 'campaigns', campaignId);
    const leadRef = doc(campaignRef, 'leads', leadId);
    
    // Get current lead data to check if selected status is changing
    let previousSelected = false;
    if (data.selected !== undefined) {
      const leadDoc = await getDoc(leadRef);
      if (leadDoc.exists()) {
        previousSelected = leadDoc.data().selected || false;
      }
    }
    
    await updateDoc(leadRef, data);
    
    // If selected status changed, update the campaign's selectedLeadCount
    if (data.selected !== undefined && data.selected !== previousSelected) {
      await updateDoc(campaignRef, {
        // Use Firestore increment with 1 or -1
        selectedLeadCount: increment(data.selected ? 1 : -1),
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
};

// Batch update leads (for efficiency when selecting/deselecting multiple leads)
export const batchUpdateLeads = async (
  campaignId: string,
  leads: Array<{ id: string; updates: Partial<Omit<CampaignLead, 'id' | 'campaignId' | 'createdAt'>> }>
): Promise<void> => {
  try {
    if (leads.length === 0) return;
    
    const batch = writeBatch(db);
    const campaignRef = doc(db, 'campaigns', campaignId);
    let selectCountChange = 0;
    
    // Process each lead update
    for (const { id, updates } of leads) {
      const leadRef = doc(campaignRef, 'leads', id);
      
      // If selected status is changing, we need to track it
      if (updates.selected !== undefined) {
        const leadDoc = await getDoc(leadRef);
        
        if (leadDoc.exists()) {
          const currentSelected = leadDoc.data().selected || false;
          
          // If the lead was not previously selected and is now selected, increment
          if (!currentSelected && updates.selected) {
            selectCountChange++;
          }
          // If the lead was previously selected and is now deselected, decrement
          else if (currentSelected && !updates.selected) {
            selectCountChange--;
          }
        }
      }
      
      // Add lead update to batch
      batch.update(leadRef, updates);
    }
    
    // Update the campaign with the new selected lead count if it changed
    if (selectCountChange !== 0) {
      batch.update(campaignRef, {
        // Use Firestore increment
        selectedLeadCount: increment(selectCountChange),
        updatedAt: serverTimestamp()
      });
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error batch updating leads:', error);
    throw error;
  }
}; 