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
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('Google Places API key is missing!');
      throw new Error('Google Places API key is not configured');
    }
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
      console.log('Making Places API request:', {
        location,
        radius,
        keyword,
        hasKey: !!this.apiKey
      });
      
      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.append('query', keyword);
      url.searchParams.append('location', `${location.lat},${location.lng}`);
      url.searchParams.append('radius', radius.toString());
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json() as PlacesResponse;

      console.log('Google API response:', {
        status: data.status,
        resultsCount: data.results?.length || 0
      });

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