export interface BrowseAiTaskResult {
  status: 'completed' | 'failed' | 'in-progress';
  capturedLists: {
    [key: string]: {
      name: string;
      address: string;
      phone?: string;
      website?: string;
      rating?: string;
      reviews?: number;
    }[];
  };
} 