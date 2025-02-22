export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  types: string[];
  businessType: string;
  relevanceScore: number;
  vicinity?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
} 