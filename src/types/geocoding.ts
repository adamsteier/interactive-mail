export interface GeocodeResult {
  formatted_address: string;
  geometry: {
    bounds?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    viewport: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    location_type: string;
  };
} 