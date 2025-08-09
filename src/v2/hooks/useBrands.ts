import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createBrand,
  getUserBrands,
  getBrand,
  updateBrand,
  setDefaultBrand,
  cloneBrand,
  deleteBrand
} from '../services/brandService';
import { 
  V2Brand, 
  CreateBrandRequest, 
  BrandSummary, 
  BrandUpdateData 
} from '../types/brand';

/**
 * Hook for managing user's brand collection
 */
export function useBrands() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBrands = useCallback(async () => {
    if (!user?.uid) {
      setBrands([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userBrands = await getUserBrands(user.uid);
      setBrands(userBrands);
    } catch (err) {
      console.error('Error loading brands:', err);
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load brands on mount and when user changes
  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  const createNewBrand = useCallback(async (brandData: CreateBrandRequest) => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const result = await createBrand(user.uid, brandData);
    
    if (result.success) {
      // Reload brands to get updated list
      await loadBrands();
      return result.brandId!;
    } else {
      throw new Error(result.error || 'Failed to create brand');
    }
  }, [user?.uid, loadBrands]);

  const makeDefault = useCallback(async (brandId: string) => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const result = await setDefaultBrand(user.uid, brandId);
    
    if (result.success) {
      // Update local state immediately for better UX
      setBrands(prev => prev.map(brand => ({
        ...brand,
        isDefault: brand.id === brandId
      })));
    } else {
      throw new Error(result.error || 'Failed to set default brand');
    }
  }, [user?.uid]);

  const duplicateBrand = useCallback(async (brandId: string, newName?: string) => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const result = await cloneBrand(user.uid, brandId, newName);
    
    if (result.success) {
      await loadBrands();
      return result.brandId!;
    } else {
      throw new Error(result.error || 'Failed to clone brand');
    }
  }, [user?.uid, loadBrands]);

  const removeBrand = useCallback(async (brandId: string) => {
    if (!user?.uid) {
      throw new Error('User must be authenticated');
    }

    const result = await deleteBrand(user.uid, brandId);
    
    if (result.success) {
      // Remove from local state immediately
      setBrands(prev => prev.filter(brand => brand.id !== brandId));
    } else {
      throw new Error(result.error || 'Failed to delete brand');
    }
  }, [user?.uid]);

  const defaultBrand = brands.find(brand => brand.isDefault);
  const hasNoBrands = brands.length === 0;
  const recentlyUsedBrands = brands.filter(brand => brand.lastUsed).slice(0, 3);

  return {
    brands,
    defaultBrand,
    hasNoBrands,
    recentlyUsedBrands,
    loading,
    error,
    actions: {
      create: createNewBrand,
      makeDefault,
      clone: duplicateBrand,
      delete: removeBrand,
      refresh: loadBrands
    }
  };
}

/**
 * Hook for managing a specific brand
 */
export function useBrand(brandId: string | null) {
  const { user } = useAuth();
  const [brand, setBrand] = useState<V2Brand | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBrand = useCallback(async () => {
    if (!user?.uid || !brandId) {
      setBrand(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const brandData = await getBrand(user.uid, brandId);
      setBrand(brandData);
    } catch (err) {
      console.error('Error loading brand:', err);
      setError(err instanceof Error ? err.message : 'Failed to load brand');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, brandId]);

  useEffect(() => {
    loadBrand();
  }, [loadBrand]);

  const updateBrandData = useCallback(async (updates: BrandUpdateData) => {
    if (!user?.uid || !brandId) {
      throw new Error('User and brand ID required');
    }

    const result = await updateBrand(user.uid, brandId, updates);
    
    if (result.success) {
      // Update local state
      setBrand(prev => prev ? { ...prev, ...updates } : null);
    } else {
      throw new Error(result.error || 'Failed to update brand');
    }
  }, [user?.uid, brandId]);

  return {
    brand,
    loading,
    error,
    update: updateBrandData,
    refresh: loadBrand
  };
}

/**
 * Hook for brand selection during campaign creation
 */
export function useBrandSelection() {
  const { brands, defaultBrand, hasNoBrands, loading } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // Auto-select default brand when available
  useEffect(() => {
    if (defaultBrand && !selectedBrandId) {
      setSelectedBrandId(defaultBrand.id);
    }
  }, [defaultBrand, selectedBrandId]);

  const selectedBrand = brands.find(brand => brand.id === selectedBrandId);
  
  const selectBrand = useCallback((brandId: string) => {
    setSelectedBrandId(brandId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedBrandId(null);
  }, []);

  // Auto-proceed logic for single brand
  const shouldAutoProceed = !loading && brands.length === 1 && selectedBrand;

  return {
    brands,
    selectedBrand,
    selectedBrandId,
    hasNoBrands,
    shouldAutoProceed,
    loading,
    actions: {
      select: selectBrand,
      clear: clearSelection
    }
  };
}

/**
 * Hook for brand switching during campaign flow
 */
export function useBrandSwitcher(currentBrandId: string | null) {
  const { brands } = useBrands();
  const [isOpen, setIsOpen] = useState(false);

  const currentBrand = brands.find(brand => brand.id === currentBrandId);
  const otherBrands = brands.filter(brand => brand.id !== currentBrandId);

  const openSwitcher = useCallback(() => setIsOpen(true), []);
  const closeSwitcher = useCallback(() => setIsOpen(false), []);

  const canSwitchWithoutLoss = true; // Would check if work would be lost
  const warningMessage = canSwitchWithoutLoss 
    ? undefined 
    : 'Switching brands will reset your design progress';

  return {
    currentBrand,
    otherBrands,
    isOpen,
    canSwitchWithoutLoss,
    warningMessage,
    actions: {
      open: openSwitcher,
      close: closeSwitcher
    }
  };
}

/**
 * Hook for brand analytics and insights
 */
export function useBrandAnalytics(brandId: string | null) {
  const { brand } = useBrand(brandId);

  const analytics = brand ? {
    completeness: brand.validation.score,
    totalCampaigns: brand.usage.totalCampaigns,
    totalSpent: brand.usage.totalSpent,
    ...(brand.usage.avgResponseRate !== undefined && { avgResponseRate: brand.usage.avgResponseRate }),
    ...(brand.usage.performanceScore !== undefined && { performanceScore: brand.usage.performanceScore }),
    ...(brand.usage.lastUsed && { lastUsed: brand.usage.lastUsed }),
    
    insights: {
      needsLogo: !brand.logo.variants.length,
      needsColors: !brand.logo.colors,
      needsContact: !brand.businessInfo.email,
      needsSocial: Object.values(brand.socialMedia).filter(Boolean).length === 0,
      isHighPerforming: (brand.usage.performanceScore || 0) > 75,
      isComplete: brand.validation.isComplete
    },
    
    recommendations: brand.validation.warnings
  } : null;

  return analytics;
} 