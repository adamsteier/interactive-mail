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
 * Handles OpenAI and Ideogram integration for postcard generation with brand compliance
 */

// Types for AI design generation
export interface SimpleDesignRequest {
  brandId: string;
  voice: 'professional' | 'friendly' | 'casual' | 'authoritative' | 'creative';
  goal: string;
  industry: string;
  audience: string;
  businessDescription?: string;
  briefId?: string; // If provided, indicates this request uses a creative brief
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
  userId: string; // Required for Firestore rules and brand access
  status: 'queued' | 'generating' | 'complete' | 'failed';
  progress: number; // 0-100
  estimatedTime: number; // seconds
  startedAt: Timestamp;
  completedAt?: Timestamp;
  result?: {
    openai?: {
      frontImageUrl: string;
      backImageUrl?: string;
      prompt: string;
      model: string;
      executionTime: number;
    };
    ideogram?: {
      frontImageUrl: string;
      backImageUrl?: string;
      prompt: string;
      styleType: string;
      renderingSpeed: string;
      executionTime: number;
    };
    logoPosition: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    comparison?: {
      preferredProvider?: 'openai' | 'ideogram';
      qualityScore?: {
        openai: number;
        ideogram: number;
      };
      notes?: string;
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

export interface IdeogramGenerationParams {
  prompt: string;
  resolution: string;
  styleType: 'GENERAL' | 'REALISTIC' | 'DESIGN' | 'AUTO';
  renderingSpeed: 'TURBO' | 'DEFAULT' | 'QUALITY';
  magicPrompt?: 'AUTO' | 'ON' | 'OFF';
  negativePrompt?: string;
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
  const promptInstructions = `Leave a ${logoWidth.toFixed(1)} x ${logoHeight.toFixed(1)} inch ${backgroundRequirement === 'light' ? 'light colored or white' : 'dark colored'} space in the top-left corner for logo placement. Ensure this area has minimal visual elements and good contrast for logo visibility. CRITICAL: Keep this space completely EMPTY - no text, no words, no placeholder text like "logo" or "company name".`;

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

  const businessContext = request.businessDescription 
    ? `\n\nBUSINESS CONTEXT: ${request.businessDescription}`
    : '';

  return `Create a 6x4 inch landscape postcard design for a ${request.industry} business.

LOGO SPACE: ${logoSpace.promptInstructions}

BRAND GUIDELINES:
${colorInstructions}
Tone: ${request.voice}
Target audience: ${request.audience}${businessContext}

DESIGN GOAL: ${request.goal}

REQUIREMENTS:
- Professional postcard design
- Eye-catching visuals relevant to ${request.industry}
- Include compelling headline and call-to-action text
- Ensure excellent readability
- Leave clear space for logo as specified - NO TEXT OR WORDS in the logo area
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
 * Experimental: One-shot generation with embedded logo using OpenAI Responses API
 * Returns data URL of the generated image if successful
 */
async function generateOneShotWithLogo({
  brand,
  prompt,
  logoSpace
}: {
  brand: V2Brand;
  prompt: string;
  logoSpace: LogoSpaceCalculation;
}): Promise<{ imageDataUrl: string; executionTime: number } | null> {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) return null;

    const logoUrl = brand.logo?.variants?.[0]?.url;
    if (!logoUrl) return null;

    const startTime = Date.now();

    const body = {
      model: 'gpt-4.1',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Canvas 1536x1024 px. Place the provided logo at the top-left inside a reserved box of ${Math.round(
                logoSpace.width * 300
              )}x${Math.round(logoSpace.height * 300)} px starting at (${Math.round(
                logoSpace.position.x * 300
              )}, ${Math.round(logoSpace.position.y * 300)}). Preserve the logo's exact colors, aspect ratio, and do not stylize or warp it. Keep the rest of the design full-bleed and aligned with the brief.`
            },
            { type: 'input_image', image_url: logoUrl }
          ]
        }
      ],
      tools: [{ type: 'image_generation', input_fidelity: 'high', size: '1536x1024', quality: 'high', format: 'jpeg' }]
    } as Record<string, unknown>;

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const imageBase64 = Array.isArray(data.output)
      ? (data.output.find((o: any) => o?.type === 'image_generation_call')?.result as string | undefined)
      : (data.output_text as string | undefined);

    if (!imageBase64) return null;
    const imageDataUrl = `data:image/jpeg;base64,${imageBase64}`;
    return { imageDataUrl, executionTime: Date.now() - startTime };
  } catch {
    return null;
  }
}

/**
 * Convert style preference to Ideogram style type
 */
export function getIdeogramStyleType(stylePreference?: string): IdeogramGenerationParams['styleType'] {
  switch (stylePreference) {
    case 'photorealistic':
      return 'REALISTIC';
    case 'illustrated':
    case 'abstract':
      return 'DESIGN';
    case 'minimalist':
      return 'GENERAL';
    default:
      return 'AUTO';
  }
}

/**
 * Generate Ideogram-specific parameters
 */
export function generateIdeogramParams(
  request: SimpleDesignRequest | AdvancedDesignRequest,
  prompt: string
): IdeogramGenerationParams {
  const isAdvanced = 'customHeadline' in request;
  
  return {
    prompt,
    resolution: '1536x1024', // 6:4 aspect ratio (closest to 6x4 inches)
    styleType: isAdvanced ? getIdeogramStyleType(request.stylePreference) : 'AUTO',
    renderingSpeed: 'DEFAULT', // Balance between speed and quality
    magicPrompt: 'AUTO', // Let Ideogram enhance the prompt
    negativePrompt: isAdvanced && request.elementsToExclude 
      ? `Avoid: ${request.elementsToExclude.join(', ')}, low quality, blurry, text cutoff, poor typography`
      : 'low quality, blurry, text cutoff, poor typography'
  };
}

/**
 * Call Ideogram API for image generation
 */
export async function generateIdeogramImage(params: IdeogramGenerationParams): Promise<{
  success: boolean;
  imageUrl?: string;
  executionTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const ideogramApiKey = process.env.IDEOGRAM_API_KEY;
    if (!ideogramApiKey) {
      throw new Error('IDEOGRAM_API_KEY environment variable not set');
    }

    const formData = new FormData();
    formData.append('prompt', params.prompt);
    formData.append('resolution', params.resolution);
    formData.append('style_type', params.styleType);
    formData.append('rendering_speed', params.renderingSpeed);
    formData.append('magic_prompt', params.magicPrompt || 'AUTO');
    if (params.negativePrompt) {
      formData.append('negative_prompt', params.negativePrompt);
    }

    const response = await fetch('https://api.ideogram.ai/v1/ideogram-v3/generate', {
      method: 'POST',
      headers: {
        'Api-Key': ideogramApiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ideogram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const executionTime = Date.now() - startTime;

    if (result.data && result.data.length > 0) {
      return {
        success: true,
        imageUrl: result.data[0].url,
        executionTime
      };
    } else {
      throw new Error('No images returned from Ideogram API');
    }

  } catch (error) {
    console.error('Ideogram generation error:', error);
    return {
      success: false,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Call OpenAI API for image generation using DALL-E 3
 */
export async function generateOpenAIImage(prompt: string): Promise<{
  success: boolean;
  imageUrl?: string;
  executionTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable not set');
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1536x1024', // Standardized canvas size (3:2)
        quality: 'hd',
        style: 'natural', // Can be 'natural' or 'vivid'
        response_format: 'url'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    const executionTime = Date.now() - startTime;

    if (result.data && result.data.length > 0) {
      return {
        success: true,
        imageUrl: result.data[0].url,
        executionTime
      };
    } else {
      throw new Error('No images returned from OpenAI API');
    }

  } catch (error) {
    console.error('OpenAI generation error:', error);
    return {
      success: false,
      executionTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate images using both OpenAI and Ideogram APIs simultaneously
 */
export async function generateDualProviderImages(
  request: SimpleDesignRequest | AdvancedDesignRequest,
  brand: V2Brand
): Promise<{
  openai: Awaited<ReturnType<typeof generateOpenAIImage>>;
  ideogram: Awaited<ReturnType<typeof generateIdeogramImage>>;
  prompt: string;
  logoSpace: LogoSpaceCalculation;
  oneShot?: { imageDataUrl: string; executionTime: number };
}> {
  // Calculate logo space
  const logoSpace = calculateLogoSpace(brand);
  
  // Generate prompt
  const prompt = 'customHeadline' in request 
    ? generateAdvancedDesignPrompt(request, brand, logoSpace)
    : generateSimpleDesignPrompt(request, brand, logoSpace);

  // Generate Ideogram parameters
  const ideogramParams = generateIdeogramParams(request, prompt);

  // Call both APIs simultaneously
  const [openaiResult, ideogramResult] = await Promise.all([
    generateOpenAIImage(prompt),
    generateIdeogramImage(ideogramParams)
  ]);

  return {
    openai: openaiResult,
    ideogram: ideogramResult,
    prompt,
    logoSpace
  };
}

/**
 * Queue design generation job with dual provider support
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

    // Get the current user ID from the campaign
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);
    if (!campaignSnap.exists()) {
      throw new Error('Campaign not found');
    }
    const userId = campaignSnap.data().ownerUid;

    // Create job document
    const job: Omit<DesignGenerationJob, 'id'> = {
      campaignId,
      designId,
      userId,
      status: 'queued',
      progress: 0,
      estimatedTime: 60, // 60 seconds for dual generation
      startedAt: serverTimestamp() as Timestamp,
      retryCount: 0
    };

    const jobRef = await addDoc(collection(db, 'aiJobs'), {
      ...job,
      prompt,
      logoSpace,
      brandId: brand.id,
      generationType: 'dual_provider', // Flag for dual generation
      requestData: request, // Store original request for retry
      userId, // Required by Firestore rules
      createdAt: serverTimestamp()
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
 * Process dual provider generation (called by Cloud Function)
 */
export async function processDualProviderGeneration(jobId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const jobRef = doc(db, 'aiJobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      throw new Error('Job not found');
    }

    const jobData = jobSnap.data() as DesignGenerationJob & {
      requestData: SimpleDesignRequest | AdvancedDesignRequest;
      brandId: string;
      logoSpace: LogoSpaceCalculation;
    };

    // Update status to generating
    await updateDoc(jobRef, {
      status: 'generating',
      progress: 10
    });

    // Get brand data
    const brandRef = doc(db, 'users', jobData.userId, 'brands', jobData.brandId);
    const brandSnap = await getDoc(brandRef);
    
    if (!brandSnap.exists()) {
      throw new Error('Brand not found');
    }

    const brand = { id: brandSnap.id, ...brandSnap.data() } as V2Brand;

    // Update progress
    await updateDoc(jobRef, { progress: 30 });

    // Generate with both providers
    const results = await generateDualProviderImages(jobData.requestData, brand);

    // One-shot with embedded logo (Brief 3)
    const oneShot = await generateOneShotWithLogo({ brand, prompt: results.prompt, logoSpace: results.logoSpace });

    // Update progress
    await updateDoc(jobRef, { progress: 80 });

    // Save results
    await updateDoc(jobRef, {
      status: 'complete',
      progress: 100,
      completedAt: serverTimestamp(),
      result: {
        // Legacy keys
        openai: {
          frontImageUrl: results.openai.imageUrl || '',
          prompt: results.prompt,
          model: 'dall-e-3',
          executionTime: results.openai.executionTime
        },
        ideogram: {
          frontImageUrl: results.ideogram.imageUrl || '',
          prompt: results.prompt,
          styleType: generateIdeogramParams(jobData.requestData, results.prompt).styleType,
          renderingSpeed: 'DEFAULT',
          executionTime: results.ideogram.executionTime
        },
        // UI-friendly aliases
        brief1: {
          frontImageUrl: results.openai.imageUrl || '',
          executionTime: results.openai.executionTime
        },
        brief2: {
          frontImageUrl: results.ideogram.imageUrl || '',
          executionTime: results.ideogram.executionTime
        },
        brief3: oneShot?.imageDataUrl ? {
          frontImageUrl: oneShot.imageDataUrl,
          executionTime: oneShot.executionTime
        } : undefined,
        logoPosition: {
          x: results.logoSpace.position.x,
          y: results.logoSpace.position.y,
          width: results.logoSpace.width,
          height: results.logoSpace.height
        }
      }
    });

    return { success: true };

  } catch (error) {
    console.error('Error processing dual provider generation:', error);
    
    // Update job with error
    await updateDoc(doc(db, 'aiJobs', jobId), {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
  let baseTime = 45; // Base 45 seconds for dual generation

  // Add time for advanced features
  if ('customHeadline' in request) {
    if (request.imageDescription) baseTime += 10;
    if (request.stylePreference) baseTime += 5;
    if (request.customPromptAdditions) baseTime += 10;
  }

  // Add queue wait time (assuming 4 concurrent slots for dual generation)
  const queueWaitTime = Math.max(0, Math.ceil(queuePosition / 4) * 60);

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