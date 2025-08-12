import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { V2Brand } from '../types/brand';
import { compositeLogoOnImage, uploadCompositedImage } from '../utils/canvasCompositing';

export interface DesignTemplate {
  id?: string;
  
  // Template Identity
  name: string;
  description?: string;
  category: string; // e.g., 'restaurant', 'retail', 'service', 'healthcare'
  tags: string[];
  
  // Template Content
  originalImageUrl: string; // Raw AI-generated image without logo
  compositedImageUrl: string; // Final image with logo composited
  creativeBrief: string; // The creative brief used to generate this
  prompt: string; // The AI prompt used
  
  // Logo Information
  logoPosition: {
    x: number; // pixels
    y: number; // pixels
    width: number; // pixels
    height: number; // pixels
  };
  logoUrl: string; // The logo that was used
  
  // Brand Context
  brandId: string;
  brandName: string;
  industry?: string;
  
  // Source Information
  sourceCampaignId: string;
  sourceDesignId: string;
  selectedOption: 'A' | 'B'; // Which option was selected
  aiProvider: 'openai' | 'ideogram'; // Which AI generated the base image
  
  // Template Settings
  isPublic: boolean; // Can other users see/use this template
  isActive: boolean; // Is this template available for use
  
  // Usage Statistics
  usage: {
    timesUsed: number;
    totalLeadsSent: number;
    avgResponseRate?: number;
    lastUsed?: Timestamp;
  };
  
  // Performance Data (if available)
  performance?: {
    campaignsUsed: string[]; // Campaign IDs where this was used
    totalRevenue?: number;
    conversionRate?: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ownerUid: string;
  version: number;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  
  // Source data
  originalImageUrl: string;
  creativeBrief: string;
  prompt: string;
  logoPosition: { x: number; y: number; width: number; height: number };
  logoUrl: string;
  
  // Context
  brand: V2Brand;
  campaignId: string;
  designId: string;
  selectedOption: 'A' | 'B';
  aiProvider: 'openai' | 'ideogram';
  
  // Settings
  isPublic?: boolean;
}

/**
 * Save a design as a reusable template with composited logo
 */
export async function saveDesignAsTemplate(
  userId: string,
  request: CreateTemplateRequest
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    console.log('Creating template from design:', request.designId);
    
    // 1. Composite the logo onto the image
    const compositedDataUrl = await compositeLogoOnImage(
      request.originalImageUrl,
      request.logoUrl,
      {
        logoPosition: request.logoPosition,
        logoDimensions: {
          width: request.logoPosition.width,
          height: request.logoPosition.height
        },
        quality: 0.95,
        format: 'image/jpeg'
      }
    );
    
    // 2. Upload the composited image to storage
    const compositedImageUrl = await uploadCompositedImage(
      compositedDataUrl,
      userId,
      request.campaignId,
      request.designId,
      request.selectedOption
    );
    
    // 3. Auto-generate tags if not provided
    const autoTags = [
      request.brand.businessInfo?.type || 'business',
      request.brand.identity?.voice || 'professional',
      request.aiProvider,
      request.selectedOption.toLowerCase(),
      ...(request.tags || [])
    ].filter(Boolean);
    
    // 4. Create template document
    const templateData: Omit<DesignTemplate, 'id'> = {
      name: request.name,
      description: request.description,
      category: request.category,
      tags: autoTags,
      
      originalImageUrl: request.originalImageUrl,
      compositedImageUrl,
      creativeBrief: request.creativeBrief,
      prompt: request.prompt,
      
      logoPosition: request.logoPosition,
      logoUrl: request.logoUrl,
      
      brandId: request.brand.id!,
      brandName: request.brand.name,
      industry: request.brand.businessInfo?.type,
      
      sourceCampaignId: request.campaignId,
      sourceDesignId: request.designId,
      selectedOption: request.selectedOption,
      aiProvider: request.aiProvider,
      
      isPublic: request.isPublic || false,
      isActive: true,
      
      usage: {
        timesUsed: 0,
        totalLeadsSent: 0,
        lastUsed: undefined
      },
      
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      ownerUid: userId,
      version: 1
    };
    
    // 5. Save to Firestore
    const templateRef = await addDoc(
      collection(db, 'users', userId, 'templates'),
      templateData
    );
    
    console.log('Template saved with ID:', templateRef.id);
    
    // 6. Update brand usage statistics
    if (request.brand.id) {
      const brandRef = doc(db, 'users', userId, 'brands', request.brand.id);
      await updateDoc(brandRef, {
        'usage.totalTemplates': (request.brand.usage?.totalTemplates || 0) + 1,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true, templateId: templateRef.id };
    
  } catch (error) {
    console.error('Error saving template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get user's templates with filtering options
 */
export async function getUserTemplates(
  userId: string,
  options: {
    category?: string;
    brandId?: string;
    isPublic?: boolean;
    limit?: number;
    orderBy?: 'createdAt' | 'updatedAt' | 'usage.timesUsed';
    orderDirection?: 'asc' | 'desc';
  } = {}
): Promise<DesignTemplate[]> {
  try {
    const q = collection(db, 'users', userId, 'templates');
    
    const constraints = [];
    
    // Add filters
    if (options.category) {
      constraints.push(where('category', '==', options.category));
    }
    
    if (options.brandId) {
      constraints.push(where('brandId', '==', options.brandId));
    }
    
    if (options.isPublic !== undefined) {
      constraints.push(where('isPublic', '==', options.isPublic));
    }
    
    // Add active filter
    constraints.push(where('isActive', '==', true));
    
    // Add ordering
    const orderByField = options.orderBy || 'createdAt';
    const orderDirection = options.orderDirection || 'desc';
    constraints.push(orderBy(orderByField, orderDirection));
    
    // Add limit
    if (options.limit) {
      constraints.push(limit(options.limit));
    }
    
    const templatesQuery = query(q, ...constraints);
    const snapshot = await getDocs(templatesQuery);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DesignTemplate));
    
  } catch (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(
  userId: string,
  templateId: string
): Promise<DesignTemplate | null> {
  try {
    const templateRef = doc(db, 'users', userId, 'templates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (templateSnap.exists()) {
      return {
        id: templateSnap.id,
        ...templateSnap.data()
      } as DesignTemplate;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching template:', error);
    return null;
  }
}

/**
 * Update template usage statistics
 */
export async function updateTemplateUsage(
  userId: string,
  templateId: string,
  leadsSent: number,
  campaignId: string
): Promise<void> {
  try {
    const templateRef = doc(db, 'users', userId, 'templates', templateId);
    const templateSnap = await getDoc(templateRef);
    
    if (!templateSnap.exists()) {
      throw new Error('Template not found');
    }
    
    const template = templateSnap.data() as DesignTemplate;
    const currentCampaigns = template.performance?.campaignsUsed || [];
    
    await updateDoc(templateRef, {
      'usage.timesUsed': (template.usage.timesUsed || 0) + 1,
      'usage.totalLeadsSent': (template.usage.totalLeadsSent || 0) + leadsSent,
      'usage.lastUsed': serverTimestamp(),
      'performance.campaignsUsed': [...currentCampaigns, campaignId],
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error updating template usage:', error);
    throw error;
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(
  userId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const templateRef = doc(db, 'users', userId, 'templates', templateId);
    
    // Soft delete by marking as inactive
    await updateDoc(templateRef, {
      isActive: false,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('Error deleting template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get template categories for a user
 */
export async function getTemplateCategories(userId: string): Promise<string[]> {
  try {
    const templatesQuery = query(
      collection(db, 'users', userId, 'templates'),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(templatesQuery);
    const categories = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const template = doc.data() as DesignTemplate;
      if (template.category) {
        categories.add(template.category);
      }
    });
    
    return Array.from(categories).sort();
    
  } catch (error) {
    console.error('Error fetching template categories:', error);
    return [];
  }
}

/**
 * Search templates by name or tags
 */
export async function searchTemplates(
  userId: string,
  searchTerm: string,
  options: {
    category?: string;
    limit?: number;
  } = {}
): Promise<DesignTemplate[]> {
  try {
    // Note: This is a simple implementation. For production, consider using
    // Algolia or similar for full-text search capabilities
    
    const templates = await getUserTemplates(userId, {
      category: options.category,
      limit: options.limit || 50
    });
    
    const searchLower = searchTerm.toLowerCase();
    
    return templates.filter(template => 
      template.name.toLowerCase().includes(searchLower) ||
      template.description?.toLowerCase().includes(searchLower) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
      template.brandName.toLowerCase().includes(searchLower)
    );
    
  } catch (error) {
    console.error('Error searching templates:', error);
    return [];
  }
}
