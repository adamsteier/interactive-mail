/**
 * V2 Pricing Service
 * Handles all pricing calculations for campaigns
 */

export interface PricingBreakdown {
  leadCount: number;
  pricePerCard: number;
  totalCost: number;
  estimatedResponses: number;
  responseRate: number;
  tier: 'starter' | 'growth' | 'enterprise';
}

export interface PricingTier {
  name: string;
  pricePerCard: number;
  minLeads: number;
  maxLeads?: number;
  description: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'starter',
    pricePerCard: 2.25,
    minLeads: 1,
    maxLeads: 99,
    description: 'Perfect for testing and small campaigns'
  },
  {
    name: 'growth',
    pricePerCard: 1.75,
    minLeads: 100,
    maxLeads: 999,
    description: 'Ideal for growing businesses'
  },
  {
    name: 'enterprise',
    pricePerCard: 1.50,
    minLeads: 1000,
    description: 'Best value for large campaigns'
  }
];

export const DEFAULT_RESPONSE_RATE = 0.03; // 3%

/**
 * Calculate the price per card based on lead count
 */
export function calculatePricePerCard(leadCount: number): number {
  if (leadCount < 100) return 2.25;
  if (leadCount < 1000) return 1.75;
  return 1.50;
}

/**
 * Calculate total campaign cost
 */
export function calculateTotalCost(leadCount: number): number {
  return leadCount * calculatePricePerCard(leadCount);
}

/**
 * Get pricing tier based on lead count
 */
export function getPricingTier(leadCount: number): 'starter' | 'growth' | 'enterprise' {
  if (leadCount < 100) return 'starter';
  if (leadCount < 1000) return 'growth';
  return 'enterprise';
}

/**
 * Calculate estimated responses based on lead count
 */
export function calculateEstimatedResponses(leadCount: number, responseRate: number = DEFAULT_RESPONSE_RATE): number {
  return Math.ceil(leadCount * responseRate);
}

/**
 * Get complete pricing breakdown for a campaign
 */
export function getPricingBreakdown(leadCount: number): PricingBreakdown {
  const pricePerCard = calculatePricePerCard(leadCount);
  const totalCost = calculateTotalCost(leadCount);
  const estimatedResponses = calculateEstimatedResponses(leadCount);
  const tier = getPricingTier(leadCount);

  return {
    leadCount,
    pricePerCard,
    totalCost,
    estimatedResponses,
    responseRate: DEFAULT_RESPONSE_RATE,
    tier
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Calculate savings compared to starter tier
 */
export function calculateSavings(leadCount: number): { amount: number; percentage: number } | null {
  if (leadCount < 100) return null;
  
  const currentCost = calculateTotalCost(leadCount);
  const starterCost = leadCount * 2.25;
  const amount = starterCost - currentCost;
  const percentage = (amount / starterCost) * 100;
  
  return { amount, percentage };
}

/**
 * Get next tier benefits
 */
export function getNextTierBenefit(leadCount: number): { leadsNeeded: number; savings: number } | null {
  if (leadCount >= 1000) return null;
  
  const nextTierLeads = leadCount < 100 ? 100 : 1000;
  const currentCost = calculateTotalCost(leadCount);
  const nextTierCost = nextTierLeads * calculatePricePerCard(nextTierLeads);
  const currentRate = currentCost / leadCount;
  const nextTierRate = nextTierCost / nextTierLeads;
  
  return {
    leadsNeeded: nextTierLeads - leadCount,
    savings: currentRate - nextTierRate
  };
} 