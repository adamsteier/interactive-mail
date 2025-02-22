export interface BusinessAnalysis {
  industry: string;
  description: string;
  customerTypes: string[];
  boundingBox: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
} 