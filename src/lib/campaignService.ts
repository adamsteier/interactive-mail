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
  arrayUnion,
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
  businessId: string,
  name: string,
  businessTypes: string[]
): Promise<Campaign> => {
  const campaignRef = doc(collection(db, 'campaigns'));
  const campaign: Campaign = {
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
  return {
    campaignId,
    placeId: place.place_id,
    businessName: place.name,
    address: place.vicinity || place.formatted_address || '',
    phoneNumber: place.formatted_phone_number,
    website: place.website,
    businessType: place.businessType || '',
    selected: false,
    location: {
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng
    },
    contacted: false,
    createdAt: serverTimestamp() as Timestamp
  };
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
    
    campaignLeads.forEach(lead => {
      const leadRef = doc(collection(db, 'campaignLeads'));
      leadRefs.push(leadRef);
      batch.set(leadRef, lead);
    });
    
    // Update the campaign with the new lead count
    const campaignRef = doc(db, 'campaigns', campaignId);
    batch.update(campaignRef, {
      leadCount: arrayUnion(campaignLeads.length),
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
    const leadsQuery = query(
      collection(db, 'campaignLeads'),
      where('campaignId', '==', campaignId)
    );
    
    const leadDocs = await getDocs(leadsQuery);
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
  leadId: string,
  data: Partial<Omit<CampaignLead, 'id' | 'campaignId' | 'createdAt'>>
): Promise<void> => {
  try {
    const leadRef = doc(db, 'campaignLeads', leadId);
    await updateDoc(leadRef, data);
    
    // If selected status changed, update the campaign's selectedLeadCount
    if (data.selected !== undefined) {
      const leadDoc = await getDoc(leadRef);
      const lead = leadDoc.data() as CampaignLead;
      
      const campaignRef = doc(db, 'campaigns', lead.campaignId);
      await updateDoc(campaignRef, {
        selectedLeadCount: data.selected 
          ? arrayUnion(1) 
          : arrayUnion(-1),
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
  leads: Array<{ id: string; updates: Partial<Omit<CampaignLead, 'id' | 'campaignId' | 'createdAt'>> }>
): Promise<void> => {
  try {
    if (leads.length === 0) return;
    
    const batch = writeBatch(db);
    const selectCountChanges: Record<string, number> = {};
    
    // First, get the campaign IDs for each lead
    for (const { id, updates } of leads) {
      // Only process selected state changes
      if (updates.selected === undefined) continue;
      
      const leadRef = doc(db, 'campaignLeads', id);
      const leadDoc = await getDoc(leadRef);
      
      if (leadDoc.exists()) {
        const lead = leadDoc.data() as CampaignLead;
        const campaignId = lead.campaignId;
        
        // Calculate changes per campaign
        if (!selectCountChanges[campaignId]) {
          selectCountChanges[campaignId] = 0;
        }
        
        // If the lead was not previously selected and is now selected, increment
        if (!lead.selected && updates.selected) {
          selectCountChanges[campaignId]++;
        }
        // If the lead was previously selected and is now deselected, decrement
        else if (lead.selected && !updates.selected) {
          selectCountChanges[campaignId]--;
        }
        
        // Add lead update to batch
        batch.update(leadRef, updates);
      }
    }
    
    // Update the campaigns with the new selected lead counts
    for (const [campaignId, countChange] of Object.entries(selectCountChanges)) {
      if (countChange !== 0) {
        const campaignRef = doc(db, 'campaigns', campaignId);
        const campaignDoc = await getDoc(campaignRef);
        
        if (campaignDoc.exists()) {
          const campaign = campaignDoc.data() as Campaign;
          batch.update(campaignRef, {
            selectedLeadCount: Math.max(0, (campaign.selectedLeadCount || 0) + countChange),
            updatedAt: serverTimestamp()
          });
        }
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error batch updating leads:', error);
    throw error;
  }
}; 