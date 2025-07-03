import { 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc,
  collection,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { V2Brand } from '../types/brand';

/**
 * AI Design Service
 * Handles OpenAI integration for postcard generation with brand compliance
 */

// Types for AI design generation
export interface SimpleDesignRequest {
  brandId: string;
  voice: 'professional' | 'friendly' | 'casual' | 'authoritative' | 'creative';
  goal: string;
  industry: string;
  audience: string;
}

export interface AdvancedDesignRequest extends SimpleDesignRequest {
  customHeadline?: string;
  customCTA?: string;
  imageDescription?: string;
  stylePreference?: 'photorealistic' | 'illustrated' | 'abstract' | 'minimalist';
  colorMood?: string;
  elementsToExclude?: string[];
  customPromptAdditions?: string;
}

export interface DesignGenerationJob {
  id: string;
  campaignId: string;
  designId: string;
  status: 'queued' | 'generating' | 'complete' | 'failed';
  progress: number; // 0-100
  estimatedTime: number; // seconds
  startedAt: Timestamp;
  completedAt?: Timestamp;
  result?: {
    frontImageUrl: string;
    backImageUrl?: string;
    prompt: string;
    logoPosition: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  error?: string;
  retryCount: number;
}

export interface LogoSpaceCalculation {
  width: number; // inches
  height: number; // inches
  position: { x: number; y: number }; // top-left corner
  backgroundRequirement: 'light' | 'dark';
  promptInstructions: string;
}

/**
 * Detect industry from business types
 */
export function detectIndustryFromTypes(businessTypes: string[]): string {
  const industryMap: Record<string, string[]> = {
    'Food & Beverage': ['restaurant', 'cafe', 'bakery', 'bar', 'food_delivery', 'catering'],
    'Automotive': ['auto_repair', 'car_dealer', 'gas_station', 'car_wash', 'auto_parts'],
    'Health & Beauty': ['hair_salon', 'spa', 'dentist', 'doctor', 'pharmacy', 'beauty_salon'],
    'Retail': ['clothing_store', 'electronics_store', 'furniture_store', 'grocery_store'],
    'Professional Services': ['lawyer', 'accountant', 'real_estate_agent', 'insurance_agency'],
    'Home Services': ['plumber', 'electrician', 'contractor', 'cleaning_service', 'locksmith'],
    'Entertainment': ['movie_theater', 'gym', 'amusement_park', 'night_club'],
    'Financial': ['bank', 'atm', 'financial_advisor', 'credit_union']
  };

  // Find the industry with the most matching business types
  let bestMatch = 'General Business';
  let maxMatches = 0;

  for (const [industry, types] of Object.entries(industryMap)) {
    const matches = businessTypes.filter(bt => 
      types.some(type => bt.toLowerCase().includes(type) || type.includes(bt.toLowerCase()))
    ).length;

    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = industry;
    }
  }

  return bestMatch;
}

/**
 * Suggest target audience based on business types
 */
export function suggestAudienceFromTypes(businessTypes: string[]): string[] {
  const audienceMap: Record<string, string[]> = {
    'restaurant': ['Local diners', 'Food enthusiasts', 'Families', 'Young professionals'],
    'auto_repair': ['Vehicle owners', 'Local drivers', 'Car enthusiasts', 'Fleet managers'],
    'hair_salon': ['Style-conscious individuals', 'Local residents', 'Professionals', 'Special occasion clients'],
    'dentist': ['Families with children', 'Health-conscious adults', 'Senior citizens', 'Local residents'],
    'gym': ['Fitness enthusiasts', 'New year resolution makers', 'Athletes', 'Health-conscious individuals'],
    'lawyer': ['Individuals needing legal help', 'Small businesses', 'Accident victims', 'Property buyers'],
    'plumber': ['Homeowners', 'Property managers', 'Emergency repair needs', 'Renovation projects']
  };

  const suggestions = new Set<string>();
  
  businessTypes.forEach(type => {
    const audiences = audienceMap[type.toLowerCase()] || ['Local customers', 'Community members'];
    audiences.forEach(audience => suggestions.add(audience));
  });

  return Array.from(suggestions).slice(0, 4); // Return top 4 suggestions
}

/**
 * Calculate logo space requirements based on brand logo
 */
export function calculateLogoSpace(
  brand: V2Brand,
  postcardWidth: number = 6, // inches
  postcardHeight: number = 4 // inches
): LogoSpaceCalculation {
  const logoVariant = brand.logo.variants?.[0];
  if (!logoVariant) {
    throw new Error('Brand has no logo variants');
  }

  // Calculate aspect ratio and determine space
  const logoAspectRatio = logoVariant.size.width / logoVariant.size.height;
  const maxDimension = 1.5; // Max 1.5 inches on either side
  const padding = 0.25; // 0.25 inch padding from edges

  let logoWidth: number;
  let logoHeight: number;

  if (logoAspectRatio >= 1) {
    // Wider logo
    logoWidth = Math.min(maxDimension, postcardWidth * 0.25);
    logoHeight = logoWidth / logoAspectRatio;
  } else {
    // Taller logo
    logoHeight = Math.min(maxDimension, postcardHeight * 0.3);
    logoWidth = logoHeight * logoAspectRatio;
  }

  // Determine background requirement from logo colors
  const logoColors = brand.logo.colors;
  let backgroundRequirement: 'light' | 'dark' = 'light';
  
  if (logoColors && logoColors.contrast && logoColors.contrast.primaryVsWhite < logoColors.contrast.primaryVsBlack) {
    backgroundRequirement = 'dark';
  }

  // Generate prompt instructions
  const promptInstructions = `Leave a ${logoWidth.toFixed(1)} x ${logoHeight.toFixed(1)} inch ${backgroundRequirement === 'light' ? 'light colored or white' : 'dark colored'} space in the top-left corner for logo placement. Ensure this area has minimal visual elements and good contrast for logo visibility.`;

  if (logoColors?.extracted?.palette) {
    const colorsToAvoid = logoColors.extracted.palette.slice(0, 3).join(', ');
    return {
      width: logoWidth,
      height: logoHeight,
      position: { x: padding, y: padding },
      backgroundRequirement,
      promptInstructions: `${promptInstructions} Avoid using these colors in the logo area: ${colorsToAvoid}.`
    };
  }

  return {
    width: logoWidth,
    height: logoHeight,
    position: { x: padding, y: padding },
    backgroundRequirement,
    promptInstructions
  };
}

/**
 * Generate AI prompt for simple design mode
 */
export function generateSimpleDesignPrompt(
  request: SimpleDesignRequest,
  brand: V2Brand,
  logoSpace: LogoSpaceCalculation
): string {
  const brandColors = brand.logo.colors?.extracted?.palette?.slice(0, 3) || [];
  const colorInstructions = brandColors.length > 0 
    ? `Use these brand colors: ${brandColors.join(', ')}.`
    : '';

  return `Create a 6x4 inch landscape postcard design for a ${request.industry} business.

LOGO SPACE: ${logoSpace.promptInstructions}

BRAND GUIDELINES:
${colorInstructions}
Tone: ${request.voice}
Target audience: ${request.audience}

DESIGN GOAL: ${request.goal}

REQUIREMENTS:
- Professional postcard design
- Eye-catching visuals relevant to ${request.industry}
- Include compelling headline and call-to-action text
- Ensure excellent readability
- Leave clear space for logo as specified
- Use high-quality, professional imagery
- Optimize for print at 300 DPI
- Landscape orientation (6x4 inches)

Style: Modern, professional, and appealing to ${request.audience}`;
}

/**
 * Generate AI prompt for advanced design mode
 */
export function generateAdvancedDesignPrompt(
  request: AdvancedDesignRequest,
  brand: V2Brand,
  logoSpace: LogoSpaceCalculation
): string {
  const basePrompt = generateSimpleDesignPrompt(request, brand, logoSpace);
  
  let advancedInstructions = '';
  
  if (request.customHeadline) {
    advancedInstructions += `\nHEADLINE: "${request.customHeadline}"`;
  }
  
  if (request.customCTA) {
    advancedInstructions += `\nCALL-TO-ACTION: "${request.customCTA}"`;
  }
  
  if (request.imageDescription) {
    advancedInstructions += `\nIMAGERY: ${request.imageDescription}`;
  }
  
  if (request.stylePreference) {
    advancedInstructions += `\nSTYLE: ${request.stylePreference}`;
  }
  
  if (request.colorMood) {
    advancedInstructions += `\nCOLOR MOOD: ${request.colorMood}`;
  }
  
  if (request.elementsToExclude && request.elementsToExclude.length > 0) {
    advancedInstructions += `\nAVOID: ${request.elementsToExclude.join(', ')}`;
  }
  
  if (request.customPromptAdditions) {
    advancedInstructions += `\nADDITIONAL REQUIREMENTS: ${request.customPromptAdditions}`;
  }

  return basePrompt + advancedInstructions;
}

/**
 * Queue design generation job
 */
export async function queueDesignGeneration(
  campaignId: string,
  designId: string,
  request: SimpleDesignRequest | AdvancedDesignRequest,
  brand: V2Brand
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // Calculate logo space
    const logoSpace = calculateLogoSpace(brand);
    
    // Generate prompt
    const prompt = 'customHeadline' in request 
      ? generateAdvancedDesignPrompt(request, brand, logoSpace)
      : generateSimpleDesignPrompt(request, brand, logoSpace);

    // Create job document
    const job: Omit<DesignGenerationJob, 'id'> = {
      campaignId,
      designId,
      status: 'queued',
      progress: 0,
      estimatedTime: 45, // 45 seconds average
      startedAt: serverTimestamp() as Timestamp,
      retryCount: 0
    };

    const jobRef = await addDoc(collection(db, 'aiJobs'), {
      ...job,
      prompt,
      logoSpace,
      brandId: brand.id
    });

    // Update design status
    await updateDoc(doc(db, 'campaigns', campaignId), {
      [`designs.${designId}.status`]: 'generating',
      [`designs.${designId}.jobId`]: jobRef.id,
      updatedAt: serverTimestamp()
    });

    return { success: true, jobId: jobRef.id };

  } catch (error) {
    console.error('Error queuing design generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get generation status for a job
 */
export async function getGenerationStatus(jobId: string): Promise<DesignGenerationJob | null> {
  try {
    const jobRef = doc(db, 'aiJobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return null;
    }

    return { id: jobSnap.id, ...jobSnap.data() } as DesignGenerationJob;

  } catch (error) {
    console.error('Error getting generation status:', error);
    return null;
  }
}

/**
 * Retry failed generation with modifications
 */
export async function retryGenerationWithModifications(
  jobId: string,
  modifications: Partial<AdvancedDesignRequest>
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await getGenerationStatus(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    if (job.retryCount >= 3) {
      throw new Error('Maximum retry attempts reached');
    }

    // Update job with modifications and reset status
    await updateDoc(doc(db, 'aiJobs', jobId), {
      status: 'queued',
      progress: 0,
      retryCount: job.retryCount + 1,
      modifications,
      startedAt: serverTimestamp(),
      error: null
    });

    return { success: true };

  } catch (error) {
    console.error('Error retrying generation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get industry-specific design suggestions
 */
export function getIndustryDesignSuggestions(industry: string): {
  voiceSuggestions: string[];
  goalSuggestions: string[];
  audienceSuggestions: string[];
} {
  const suggestions: Record<string, {
    voiceSuggestions: string[];
    goalSuggestions: string[];
    audienceSuggestions: string[];
  }> = {
    'Food & Beverage': {
      voiceSuggestions: ['friendly', 'casual', 'professional'],
      goalSuggestions: [
        'Promote new menu items',
        'Attract lunch crowd',
        'Increase dinner reservations',
        'Advertise special events'
      ],
      audienceSuggestions: ['Local diners', 'Food enthusiasts', 'Families', 'Young professionals']
    },
    'Automotive': {
      voiceSuggestions: ['professional', 'authoritative', 'friendly'],
      goalSuggestions: [
        'Promote maintenance services',
        'Attract new customers',
        'Offer seasonal promotions',
        'Build trust and reliability'
      ],
      audienceSuggestions: ['Vehicle owners', 'Local drivers', 'Car enthusiasts']
    },
    'Health & Beauty': {
      voiceSuggestions: ['friendly', 'professional', 'creative'],
      goalSuggestions: [
        'Promote new services',
        'Attract new clients',
        'Showcase expertise',
        'Offer special packages'
      ],
      audienceSuggestions: ['Style-conscious individuals', 'Local residents', 'Professionals']
    }
  };

  return suggestions[industry] || {
    voiceSuggestions: ['professional', 'friendly', 'authoritative'],
    goalSuggestions: ['Attract new customers', 'Promote services', 'Build brand awareness'],
    audienceSuggestions: ['Local customers', 'Community members', 'Target demographic']
  };
}

/**
 * Estimate generation time based on request complexity
 */
export function estimateGenerationTime(
  request: SimpleDesignRequest | AdvancedDesignRequest,
  queuePosition: number = 0
): number {
  let baseTime = 30; // Base 30 seconds

  // Add time for advanced features
  if ('customHeadline' in request) {
    if (request.imageDescription) baseTime += 10;
    if (request.stylePreference) baseTime += 5;
    if (request.customPromptAdditions) baseTime += 10;
  }

  // Add queue wait time (assuming 8 concurrent slots)
  const queueWaitTime = Math.max(0, Math.ceil(queuePosition / 8) * 45);

  return baseTime + queueWaitTime;
}

/**
 * Validate design request
 */
export function validateDesignRequest(
  request: SimpleDesignRequest | AdvancedDesignRequest
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!request.goal || request.goal.trim().length < 5) {
    errors.push('Goal must be at least 5 characters');
  }

  if (!request.industry || request.industry.trim().length < 2) {
    errors.push('Industry is required');
  }

  if (!request.audience || request.audience.trim().length < 3) {
    errors.push('Target audience is required');
  }

  if (request.goal && request.goal.length > 200) {
    errors.push('Goal must be less than 200 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 