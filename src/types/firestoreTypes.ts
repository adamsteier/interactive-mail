import { Timestamp } from 'firebase/firestore';

// Interface for the main user document in the 'users' collection
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  firstName?: string | null; // Optional, added during signup
  lastName?: string | null;  // Optional, added during signup
  lastLogin: Timestamp;
  createdAt: Timestamp;
  // Add any other user-specific fields here
}

// Interface for documents in the 'brandingData' subcollection (users/{userId}/brandingData/{brandId})
export interface BrandingData {
  id?: string; // Optional: Firestore document ID, often added client-side after fetch
  businessName: string;
  address?: string | { // Allow simple string or structured object
    street: string;
    city: string;
    state: string;
    zip: string;
    country?: string; // Optional country
  };
  email?: string; // Business contact email
  website?: string;
  logoUrl?: string; // URL to uploaded logo in Storage
  socialMediaHandles?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    // Add other platforms as needed
  };
  brandIdentity?: string; // Description
  styleComponents?: { // Or could be more structured
    primaryColor?: string;
    secondaryColor?: string;
    font?: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Interface for documents in the 'campaignDesignData' subcollection (users/{userId}/campaignDesignData/{designId})
export interface CampaignDesignData {
  id?: string; // Optional: Firestore document ID
  associatedBrandId: string; // ID of the BrandingData document used for this design
  designName: string; // e.g., "Variant A - Summer Promo"
  primaryGoal: string;
  callToAction: string;
  targetAudience: string;
  targetMarketDescription?: string;
  tagline?: string;
  offer?: string; // Added field for specific offer/promotion
  keySellingPoints?: string[]; // Added field for key features/benefits
  tone?: string[]; // Added: Optional array of tone descriptors
  visualStyle?: string[]; // Added: Optional array of style/aesthetic descriptors
  additionalInfo?: string;
  // associatedCampaignId?: string; // Link to a parent campaign if needed later
  // Add fields for design specifics like image URLs, copy text blocks, etc.
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 