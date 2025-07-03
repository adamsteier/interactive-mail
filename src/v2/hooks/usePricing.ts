import { useMemo } from 'react';
import { 
  getPricingBreakdown, 
  formatCurrency, 
  calculateSavings, 
  getNextTierBenefit, 
  PRICING_TIERS,
  type PricingBreakdown 
} from '../services/pricing';

export interface UsePricingReturn {
  breakdown: PricingBreakdown;
  formatted: {
    pricePerCard: string;
    totalCost: string;
    savings?: string;
  };
  savings: { amount: number; percentage: number } | null;
  nextTierBenefit: { leadsNeeded: number; savings: number } | null;
  tierInfo: {
    current: typeof PRICING_TIERS[0];
    next?: typeof PRICING_TIERS[0];
  };
}

/**
 * Hook for pricing calculations and formatting
 */
export function usePricing(leadCount: number): UsePricingReturn {
  return useMemo(() => {
    const breakdown = getPricingBreakdown(leadCount);
    const savings = calculateSavings(leadCount);
    const nextTierBenefit = getNextTierBenefit(leadCount);
    
    // Find current and next tier info
    const currentTier = PRICING_TIERS.find(tier => tier.name === breakdown.tier)!;
    const nextTier = breakdown.tier === 'starter' 
      ? PRICING_TIERS.find(tier => tier.name === 'growth')
      : breakdown.tier === 'growth'
      ? PRICING_TIERS.find(tier => tier.name === 'enterprise')
      : undefined;

    return {
      breakdown,
      formatted: {
        pricePerCard: formatCurrency(breakdown.pricePerCard),
        totalCost: formatCurrency(breakdown.totalCost),
        savings: savings ? formatCurrency(savings.amount) : undefined
      },
      savings,
      nextTierBenefit,
      tierInfo: {
        current: currentTier,
        next: nextTier
      }
    };
  }, [leadCount]);
}

/**
 * Hook for comparing pricing between different lead counts
 */
export function usePricingComparison(currentLeads: number, targetLeads: number) {
  return useMemo(() => {
    const current = getPricingBreakdown(currentLeads);
    const target = getPricingBreakdown(targetLeads);
    const difference = target.totalCost - current.totalCost;
    const perCardDifference = target.pricePerCard - current.pricePerCard;
    
    return {
      current,
      target,
      difference: {
        total: difference,
        perCard: perCardDifference,
        formatted: {
          total: formatCurrency(Math.abs(difference)),
          perCard: formatCurrency(Math.abs(perCardDifference))
        },
        isMore: difference > 0,
        isLess: difference < 0
      }
    };
  }, [currentLeads, targetLeads]);
} 