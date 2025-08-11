// Ensure Node.js runtime for firebase-admin
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { V2Brand } from '@/v2/types/brand';
import { 
  BriefGenerationRequest, 
  BriefGenerationContext, 
  CreativeBrief, 
  BriefGenerationJob,
  BRIEF_GENERATION_CONFIG,
  POSTCARD_SPECS
} from '@/v2/types/design';
import { calculateLogoSpace } from '@/v2/services/aiDesignService';

// Initialize Firebase Admin if needed - moved to function to avoid build-time execution
function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // 1) Try SERVICE_ACCOUNT_BASE64 (entire JSON base64-encoded)
    const saJsonB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (saJsonB64) {
      try {
        const json = Buffer.from(saJsonB64, 'base64').toString('utf8');
        const sa = JSON.parse(json);
        initializeApp({ credential: cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key
        })});
        return;
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_BASE64', e);
      }
    }

    // 2) Try SERVICE_ACCOUNT_JSON (raw JSON string env)
    const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (saJson) {
      try {
        const sa = JSON.parse(saJson);
        initializeApp({ credential: cert({
          projectId: sa.project_id,
          clientEmail: sa.client_email,
          privateKey: sa.private_key
        })});
        return;
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', e);
      }
    }

    // 3) Try individual env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const privateKeyB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;

    let privateKey: string | undefined = privateKeyRaw?.replace(/\\n/g, '\n');
    if (!privateKey && privateKeyB64) {
      try {
        privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
      } catch (e) {
        console.error('Failed to decode FIREBASE_PRIVATE_KEY_BASE64', e);
      }
    }

    if (!projectId || !clientEmail || !privateKey) {
      console.error('[Firebase Admin] Missing envs', { hasProjectId: !!projectId, hasClientEmail: !!clientEmail, hasPrivateKey: !!privateKey });
      throw new Error('Firebase configuration is incomplete');
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    });
  }
}

// OpenAI API key validation is done in the POST handler

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function verifyAuth(request: NextRequest) {
  // Initialize Firebase Admin before using it
  initializeFirebaseAdmin();
  
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await getAuth().verifyIdToken(token);
  return decodedToken.uid;
}

function formatContactAndSocialForBrief(brand: V2Brand) {
  const contactInfo: BriefGenerationContext['contactInfo'] = {};
  const socialMedia: BriefGenerationContext['socialMedia'] = {};
  
  // Format contact info with clean labels - only include if value exists and is truthy
  if (brand.businessInfo?.phone?.trim()) {
    contactInfo.phone = {
      label: "Phone",
      value: brand.businessInfo.phone.trim()
    };
  }
  
  if (brand.businessInfo?.email?.trim()) {
    contactInfo.email = {
      label: "Email", 
      value: brand.businessInfo.email.trim()
    };
  }
  
  if (brand.businessInfo?.website?.trim()) {
    contactInfo.website = {
      label: "Website",
      value: brand.businessInfo.website.trim()
    };
  }
  
  if (brand.businessInfo?.address?.trim()) {
    contactInfo.address = {
      label: "Address",
      value: brand.businessInfo.address.trim()
    };
  }
  
  // Format social media with platform labels - only include if value exists and is truthy
  if (brand.socialMedia?.instagram?.trim()) {
    socialMedia.instagram = {
      label: "Instagram",
      value: brand.socialMedia.instagram.trim()
    };
  }
  
  if (brand.socialMedia?.facebook?.trim()) {
    socialMedia.facebook = {
      label: "Facebook",
      value: brand.socialMedia.facebook.trim()
    };
  }
  
  if (brand.socialMedia?.linkedin?.trim()) {
    socialMedia.linkedin = {
      label: "LinkedIn",
      value: brand.socialMedia.linkedin.trim()
    };
  }
  
  if (brand.socialMedia?.twitter?.trim()) {
    socialMedia.twitter = {
      label: "Twitter",
      value: brand.socialMedia.twitter.trim()
    };
  }
  
  if (brand.socialMedia?.tiktok?.trim()) {
    socialMedia.tiktok = {
      label: "TikTok",
      value: brand.socialMedia.tiktok.trim()
    };
  }
  
  if (brand.socialMedia?.youtube?.trim()) {
    socialMedia.youtube = {
      label: "YouTube",
      value: brand.socialMedia.youtube.trim()
    };
  }
  
  return { contactInfo, socialMedia };
}

function generatePrompt(context: BriefGenerationContext): string {
  const { contactInfo, socialMedia } = context;
  
  // Build contact information section
  let contactSection = '';
  const contacts = Object.entries(contactInfo).filter(([, info]) => info?.value);
  if (contacts.length > 0) {
    contactSection = '\nCONTACT INFORMATION (design appropriate icons):\n';
    contacts.forEach(([, info]) => {
      contactSection += `- ${info!.label}: ${info!.value}\n`;
    });
  }
  
  // Build social media section  
  let socialSection = '';
  const socials = Object.entries(socialMedia).filter(([, info]) => info?.value);
  if (socials.length > 0) {
    socialSection = '\nSOCIAL MEDIA (design appropriate platform icons):\n';
    socials.forEach(([, info]) => {
      socialSection += `- ${info!.label}: ${info!.value}\n`;
    });
  }
  
  // Build lead counts display
  const leadCountsDisplay = Object.entries(context.leadCounts)
    .map(([type, count]) => `${type.replace(/_/g, ' ')} (${count} leads)`)
    .join(', ');
  
  // Additional context sections
  const businessContext = context.businessDescription 
    ? `\nBUSINESS DESCRIPTION:\n${context.businessDescription}`
    : '';
    
  const imageryContext = context.imageryInstructions
    ? `\nIMAGERY INSTRUCTIONS:\n${context.imageryInstructions}`
    : '';

  return `You are creating a detailed creative brief for an AI image generator to design ONE SIDE of a postcard.

CONTEXT:
- Industry: ${context.industry} 
- Targeting: ${context.businessTypes.join(', ')} businesses (${leadCountsDisplay})
- Brand: ${context.brandName}
- Goal: ${context.campaignGoal}
- Voice: ${context.voice}
- Audience: ${context.targetAudience}

BRAND ASSETS:
- Colors: ${context.brandColors.join(', ')}
- Logo: ${context.logoAnalysis.promptInstructions}${contactSection}${socialSection}${businessContext}${imageryContext}

REQUIREMENTS:
- Format: ${POSTCARD_SPECS.width}×${POSTCARD_SPECS.height}" landscape postcard, ${POSTCARD_SPECS.bleed}" bleed
- Logo space: ${context.logoAnalysis.promptInstructions}
- Include relevant contact information with appropriate, well-designed icons
- Include relevant social media handles with recognizable platform icons
- Design icons that complement the overall aesthetic and color scheme

Create a detailed creative brief that an AI can follow to generate this postcard design. Include:

1. LAYOUT & GRID APPROACH:
   [Specify: no columns/2-column/3-column/asymmetrical - choose what works best for this industry and content]

2. COLOR STRATEGY:
   [How to use brand colors: ${context.brandColors.join(', ')} - be specific about application]

3. IMAGERY STYLE & COMPOSITION:
   [AI-generated imagery direction, style, subjects that resonate with ${context.industry} businesses]

4. CONTENT HIERARCHY & PLACEMENT:
   - Headline placement and style
   - Contact information layout (with designed icons)
   - Social media integration (with platform-appropriate icons)
   - Call-to-action positioning
   - Logo placement: ${context.logoAnalysis.backgroundRequirement} background area

5. VISUAL ELEMENTS:
   - Icon style that matches overall design (modern, minimal, bold, etc.)
   - Typography hierarchy
   - Visual balance and white space

6. OVERALL DESIGN AESTHETIC:
   [Specific style for ${context.industry} targeting ${context.businessTypes.join(', ')} businesses with ${context.voice} voice]

Design appropriate icons for each contact method and social platform that complement the overall design aesthetic and color scheme.`;
}

async function generateBriefWithChatGPT(
  context: BriefGenerationContext, 
  model: 'gpt-4.1' | 'gpt-4o', 
  temperature: number
): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = generatePrompt(context);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model === 'gpt-4.1' ? 'gpt-4-turbo' : 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert creative director specializing in postcard marketing design. Create detailed, actionable creative briefs that AI image generators can follow precisely.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: 1500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
  }

  const result: OpenAIResponse = await response.json();
  
  if (!result.choices || result.choices.length === 0) {
    throw new Error('No response from OpenAI');
  }

  return result.choices[0].message.content;
}

export async function POST(request: NextRequest) {
  try {
    // FIXED: Check OpenAI API key early
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Verify authentication
    const userId = await verifyAuth(request);
    
    // Parse request body
    const requestData: BriefGenerationRequest = await request.json();
    const { campaignId, brandId, formData, businessTypes } = requestData;

    // Use Admin Firestore
    const adminDb = getFirestore();

    // Fetch brand data (stored under users/{uid}/brands)
    const brandSnap = await adminDb.collection('users').doc(userId).collection('brands').doc(brandId).get();
    if (!brandSnap.exists) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const brand = brandSnap.data() as V2Brand;
    
    // Calculate logo space
    const logoAnalysis = calculateLogoSpace(brand);
    
    // Extract brand colors
    const brandColors = brand.logo.colors?.extracted?.palette?.slice(0, 3) || 
                       [brand.identity?.keywords?.find(k => k.startsWith('primary-color:'))?.split(':')[1] || '#000000'];

    // Format contact and social data
    const { contactInfo, socialMedia } = formatContactAndSocialForBrief(brand);
    
    // Create generation context - explicitly handle all optional fields
    const context: BriefGenerationContext = {
      brandName: brand.name,
      brandColors,
      logoAnalysis,
      contactInfo,
      socialMedia,
      industry: formData.industry,
      businessTypes: businessTypes.map(bt => bt.type),
      leadCounts: businessTypes.reduce((acc, bt) => {
        acc[bt.type] = bt.count;
        return acc;
      }, {} as Record<string, number>),
      voice: formData.voice,
      campaignGoal: formData.goal,
      targetAudience: formData.audience,
      // Only include optional fields if they have defined values
      ...(formData.businessDescription ? { businessDescription: formData.businessDescription } : {}),
      ...(formData.imageryInstructions ? { imageryInstructions: formData.imageryInstructions } : {})
    };

    // Create generation job
    const jobRef = await adminDb.collection('users').doc(userId).collection('briefJobs').add({
      campaignId,
      brandId,
      userId,
      status: 'generating',
      startedAt: FieldValue.serverTimestamp(),
      briefs: [],
      totalBriefs: BRIEF_GENERATION_CONFIG.totalBriefs,
      completedBriefs: 0,
      errors: []
    } as Omit<BriefGenerationJob, 'id'>);

    // Generate briefs asynchronously
    const briefPromises = BRIEF_GENERATION_CONFIG.models.map(async (config, index) => {
      try {
        const briefText = await generateBriefWithChatGPT(
          context,
          config.model,
          config.temperature
        );

        // Create brief document - ensure no undefined values
        const brief: Omit<CreativeBrief, 'id'> = {
          campaignId,
          brandId,
          userId,
          model: config.model,
          temperature: config.temperature,
          generatedAt: FieldValue.serverTimestamp(),
          briefText,
          context,
          selected: false,
          designGenerated: false,
          edited: false
        };

        // Save brief
        const briefRef = await adminDb.collection('users').doc(userId).collection('creativeBriefs').add(brief);
        
        return {
          id: briefRef.id,
          ...brief,
          order: config.order
        };
      } catch (error) {
        console.error(`Error generating brief ${index + 1}:`, error);
        return {
          error: error instanceof Error ? error.message : 'Unknown error',
          order: config.order
        };
      }
    });

    // Wait for all briefs to complete
    const results = await Promise.all(briefPromises);
    
    // Separate successful briefs from errors
    // FIXED: Create proper types for filtering
    type SuccessfulBrief = CreativeBrief & { order: number };
    type ErrorResult = { error: string; order: number };
    
    const successfulBriefs = results.filter((result): result is SuccessfulBrief => 
      !('error' in result)
    ).sort((a, b) => a.order - b.order);
    
    const errors = results.filter((result): result is ErrorResult => 
      'error' in result
    ).map(result => result.error);

    // Update job with results - store brief references, not full objects with FieldValue
    const briefReferences = successfulBriefs.map(brief => ({
      id: brief.id,
      model: brief.model,
      temperature: brief.temperature,
      order: brief.order,
      selected: brief.selected || false,
      briefText: brief.briefText.substring(0, 200) + '...' // Store preview only
    }));

    const jobUpdate: Partial<BriefGenerationJob> = {
      status: 'complete',
      completedAt: FieldValue.serverTimestamp(),
      briefs: briefReferences as any, // Store references instead of full objects
      completedBriefs: successfulBriefs.length
    };
    
    // Only add errors field if there are actual errors
    if (errors.length > 0) {
      jobUpdate.errors = errors;
    }
    
    await adminDb.collection('users').doc(userId).collection('briefJobs').doc(jobRef.id).update(jobUpdate);

    return NextResponse.json({
      success: true,
      jobId: jobRef.id,
      briefs: successfulBriefs,
      totalGenerated: successfulBriefs.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error generating creative briefs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate creative briefs' },
      { status: 500 }
    );
  }
} 