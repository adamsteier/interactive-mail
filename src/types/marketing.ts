export interface BusinessTarget {
  type: string;
  estimatedCount: number;
  reasoning: string;
}

export interface DatabaseTarget {
  name: string;
  type: string; // e.g., "Professional Network", "Local Directory"
  reasoning: string;
  estimatedReach: number;
}

export interface Method1Analysis {
  overallReasoning: string;
  businessTargets: BusinessTarget[];
}

export interface MarketingStrategy {
  primaryRecommendation: string;
  totalEstimatedReach: number;
  recommendedMethods: string[];
  method1Analysis: Method1Analysis;
  method2Analysis: {
    databaseTargets: DatabaseTarget[];
    overallReasoning: string;
  };
  method3Analysis: {
    reasoning: string;
  };
} 