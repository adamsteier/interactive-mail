interface BusinessTarget {
  type: string;
  estimatedCount: number;
  reasoning: string;
}

interface DatabaseTarget {
  name: string;
  type: string; // e.g., "Professional Network", "Local Directory"
  reasoning: string;
  estimatedReach: number;
}

interface MarketingStrategy {
  recommendedMethods: Array<'method1' | 'method2' | 'method3'>;
  primaryRecommendation: string;
  totalEstimatedReach: number;
  method1Analysis: {
    businessTargets: BusinessTarget[];
    overallReasoning: string;
  };
  method2Analysis: {
    databaseTargets: DatabaseTarget[];
    overallReasoning: string;
  };
  method3Analysis: {
    reasoning: string;
  };
} 