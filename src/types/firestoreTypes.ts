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
  id?: string; // Optional because it's added after creation
  associatedBrandId: string;
  designName: string;
  primaryGoal: string;
  callToAction: string;
  targetAudience: string;
  targetMarketDescription?: string; // Optional
  tagline?: string; // Optional
  offer?: string; // Optional
  keySellingPoints: string[];
  tone: string;
  visualStyle: string;
  imageryDescription?: string; // NEW Optional field for imagery
  additionalInfo?: string; // Optional
  generatedPrompt?: string; // NEW: Store the AI prompt result
  status?: 'draft' | 'processing' | 'ready' | 'failed' | 'completed'; // NEW: Track backend status
  createdAt?: Timestamp; // Optional on creation, will be set by server
  updatedAt?: Timestamp; // Optional on creation, will be set by server
  finalDesignUrl?: string; // NEW: To store the URL of the uploaded final design
  // Potential future fields: feedback?: string
} 