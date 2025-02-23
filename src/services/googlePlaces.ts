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

    console.log('API Key status:', {
      hasKey: !!this.apiKey,
      keyLength: this.apiKey.length,
      firstFive: this.apiKey.slice(0, 5)
    });
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
      let allResults: PlaceResult[] = [];
      let nextPageToken: string | undefined;

      do {
        const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
        if (nextPageToken) {
          url.searchParams.append('pagetoken', nextPageToken);
        } else {
          url.searchParams.append('query', keyword);
          url.searchParams.append('location', `${location.lat},${location.lng}`);
          url.searchParams.append('radius', radius.toString());
        }
        url.searchParams.append('key', this.apiKey);

        console.log('Making Places API request:', {
          location,
          radius,
          keyword,
          hasKey: !!this.apiKey,
          isPageRequest: !!nextPageToken
        });

        const response = await fetch(url.toString());
        const data = await response.json() as PlacesResponse;

        console.log('Google API response:', {
          status: data.status,
          resultsCount: data.results?.length || 0,
          hasNextPage: !!data.next_page_token
        });

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          throw new Error(`Places API Error: ${data.status}`);
        }

        allResults = [...allResults, ...data.results];
        nextPageToken = data.next_page_token;

        if (nextPageToken) {
          // Google requires a short delay between requests when using pagetoken
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (nextPageToken);

      return allResults.map((place: PlaceResult) => ({
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