interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  types: string[];
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface PlacesResponse {
  results: PlaceResult[];
  status: string;
  next_page_token?: string;
}

export class GooglePlacesService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  }

  async searchPlaces({
    location,
    radius,
    keyword
  }: {
    location: { lat: number; lng: number };
    radius: number;
    keyword: string;
  }) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?` + 
        `query=${encodeURIComponent(keyword)}` +
        `&location=${location.lat},${location.lng}` +
        `&radius=${radius}` +
        `&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json() as PlacesResponse;

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API Error: ${data.status}`);
      }

      return data.results.map((place: PlaceResult) => ({
        place_id: place.place_id,
        name: place.name,
        vicinity: place.formatted_address,
        types: place.types,
        business_status: place.business_status,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        relevanceScore: this.calculateRelevanceScore(place)
      }));
    } catch (error) {
      console.error('Places API Error:', error);
      throw error;
    }
  }

  private calculateRelevanceScore(place: PlaceResult): number {
    let score = 10;
    if (place.rating) score += place.rating;
    if (place.user_ratings_total && place.user_ratings_total > 100) score += 5;
    return Math.round(score);
  }
} 