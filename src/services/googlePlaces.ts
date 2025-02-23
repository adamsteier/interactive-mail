import { Client } from '@googlemaps/google-maps-services-js';

export class GooglePlacesService {
  private client: Client;
  private apiKey: string;

  constructor() {
    this.client = new Client({});
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
      const response = await this.client.textSearch({
        params: {
          query: keyword,
          location,
          radius,
          key: this.apiKey
        }
      });

      return response.data.results.map(place => ({
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

  private calculateRelevanceScore(place: any) {
    let score = 10;
    if (place.rating) score += place.rating;
    if (place.user_ratings_total > 100) score += 5;
    return Math.round(score);
  }
} 