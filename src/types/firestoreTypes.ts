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
  createdAt: Date;
  updatedAt: Date;
}

// Interface for documents in the 'campaignDesignData' subcollection (users/{userId}/campaignDesignData/{designId})
export interface CampaignDesignData {
  id?: string; // Optional because it's added after creation
  associatedBrandId: string; // Which brand profile this design belongs to
  designName: string; // User-given name for this specific design (e.g., "Restaurant Promo Q3")

  // --- Input Data Mirrors (or relevant subset) ---
  primaryGoal: string;
  callToAction: string;
  targetAudience: string; // e.g., "Restaurants", "Cafes", "__all__" or a descriptor
  targetMarketDescription?: string; // Optional refined description
  tagline?: string; // Optional
  offer?: string; // Optional
  keySellingPoints: string; // Ensure this is a string, not string[]
  tone: string; // User-provided keywords
  visualStyle: string; // User-provided keywords
  imageryDescription?: string; // User's description if they chose 'describe'
  imageryType?: 'upload' | 'describe'; // User's choice for image source
  uploadedImageUrls?: string[]; // URLs if user uploaded images
  additionalInfo?: string; // Optional extra notes from user

  // --- Generated / Status Fields ---
  generatedPrompt?: string; // AI-generated image prompt for admin/backend
  aiSummary?: string; // AI-generated summary for admin
  status?: 'draft' | 'processing' | 'ready' | 'failed' | 'completed' | 'processing_ai' | 'ai_failed'; // Updated to include more statuses
  finalDesignUrl?: string; // URL of the final design uploaded by admin (if single image)
  finalDesigns?: string[]; // Alternative: Array if multiple final images are possible per design

  // --- NEW FIELD ---
  leadCount?: number; // Number of selected leads this design is intended for

  // --- Timestamps ---
  createdAt?: Date;
  updatedAt?: Date;
} 