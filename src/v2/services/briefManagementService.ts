import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CreativeBrief } from '../types/design';

export interface BriefLibraryFilter {
  campaignId?: string;
  isTemplate?: boolean;
  industry?: string;
  voice?: string;
  search?: string;
}

export interface BriefUsageUpdate {
  briefId: string;
  campaignId: string;
}

/**
 * Get creative briefs for the brief management library
 */
export async function getBriefsLibrary(
  userId: string, 
  filter: BriefLibraryFilter = {}
): Promise<CreativeBrief[]> {
  try {
    const briefsRef = collection(db, 'users', userId, 'creativeBriefs');
    
    // Build query based on filter
    let briefQuery = query(briefsRef);
    
    // Filter by campaign if specified
    if (filter.campaignId) {
      briefQuery = query(briefQuery, where('campaignId', '==', filter.campaignId));
    }
    
    // Filter by template status
    if (filter.isTemplate !== undefined) {
      briefQuery = query(briefQuery, where('isTemplate', '==', filter.isTemplate));
    }
    
    // Filter by industry
    if (filter.industry) {
      briefQuery = query(briefQuery, where('context.industry', '==', filter.industry));
    }
    
    // Filter by voice
    if (filter.voice) {
      briefQuery = query(briefQuery, where('context.voice', '==', filter.voice));
    }
    
    // Order by template status first, then usage, then recency
    briefQuery = query(briefQuery, orderBy('isTemplate', 'desc'), orderBy('usageCount', 'desc'), orderBy('generatedAt', 'desc'));
    
    const snapshot = await getDocs(briefQuery);
    let briefs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CreativeBrief[];
    
    // Client-side search filter if provided
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      briefs = briefs.filter(brief => 
        brief.briefText.toLowerCase().includes(searchLower) ||
        brief.context.industry.toLowerCase().includes(searchLower) ||
        brief.context.targetAudience.toLowerCase().includes(searchLower) ||
        brief.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    return briefs;
    
  } catch (error) {
    console.error('Error fetching briefs library:', error);
    throw error;
  }
}

/**
 * Get recently used briefs across all campaigns
 */
export async function getRecentBriefs(
  userId: string, 
  limitCount: number = 10
): Promise<CreativeBrief[]> {
  try {
    const briefsRef = collection(db, 'users', userId, 'creativeBriefs');
    const briefQuery = query(
      briefsRef, 
      where('usageCount', '>', 0),
      orderBy('lastUsedAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(briefQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CreativeBrief[];
    
  } catch (error) {
    console.error('Error fetching recent briefs:', error);
    return [];
  }
}

/**
 * Update brief usage when selected for a campaign
 */
export async function updateBriefUsage(
  userId: string, 
  update: BriefUsageUpdate
): Promise<void> {
  try {
    const briefRef = doc(db, 'users', userId, 'creativeBriefs', update.briefId);
    
    // Get current usage count
    const briefSnap = await getDoc(briefRef);
    const currentUsageCount = briefSnap.exists() ? (briefSnap.data()?.usageCount || 0) : 0;
    
    await updateDoc(briefRef, {
      usageCount: currentUsageCount + 1,
      lastUsedAt: serverTimestamp(),
      lastUsedCampaignId: update.campaignId
    });
    
  } catch (error) {
    console.error('Error updating brief usage:', error);
    throw error;
  }
}

/**
 * Mark/unmark brief as template
 */
export async function toggleBriefTemplate(
  userId: string, 
  briefId: string, 
  isTemplate: boolean
): Promise<void> {
  try {
    const briefRef = doc(db, 'users', userId, 'creativeBriefs', briefId);
    
    await updateDoc(briefRef, {
      isTemplate
    });
    
  } catch (error) {
    console.error('Error toggling brief template status:', error);
    throw error;
  }
}

/**
 * Update brief text (creates edited copy)
 */
export async function updateBriefText(
  userId: string, 
  briefId: string, 
  newText: string
): Promise<void> {
  try {
    const briefRef = doc(db, 'users', userId, 'creativeBriefs', briefId);
    const briefDoc = await getDoc(briefRef);
    
    if (!briefDoc.exists()) {
      throw new Error('Brief not found');
    }
    
    const briefData = briefDoc.data() as CreativeBrief;
    
    // Build update object
    const baseUpdates = {
      briefText: newText,
      edited: true,
      updatedAt: serverTimestamp()
    };
    
    // Store original if this is the first edit
    if (!briefData.edited && briefData.briefText) {
      await updateDoc(briefRef, {
        ...baseUpdates,
        originalBriefText: briefData.briefText
      });
    } else {
      await updateDoc(briefRef, baseUpdates);
    }
    
  } catch (error) {
    console.error('Error updating brief text:', error);
    throw error;
  }
}

/**
 * Get suggested briefs for current campaign context
 */
export async function getSuggestedBriefs(
  userId: string, 
  currentCampaignId: string, 
  industry: string, 
  voice: string
): Promise<CreativeBrief[]> {
  try {
    // Get briefs from other campaigns with similar context
    const briefsRef = collection(db, 'users', userId, 'creativeBriefs');
    const briefQuery = query(
      briefsRef,
      where('campaignId', '!=', currentCampaignId),
      where('context.industry', '==', industry),
      where('context.voice', '==', voice),
      orderBy('usageCount', 'desc'),
      limit(5)
    );
    
    const snapshot = await getDocs(briefQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as CreativeBrief[];
    
  } catch (error) {
    console.error('Error fetching suggested briefs:', error);
    return [];
  }
}
