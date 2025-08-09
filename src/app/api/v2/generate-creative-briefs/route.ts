import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

// Initialize Firebase Admin if needed
if (!getApps().length) {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('Missing required Firebase environment variables');
    throw new Error('Firebase configuration is incomplete');
  }
  
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// FIXED: Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OpenAI API key');
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

async function verifyAuth(request: NextRequest) {
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
  
  // Format contact info with clean labels
  if (brand.businessInfo.phone) {
    contactInfo.phone = {
      label: "Phone",
      value: brand.businessInfo.phone
    };
  }
  
  if (brand.businessInfo.email) {
    contactInfo.email = {
      label: "Email", 
      value: brand.businessInfo.email
    };
  }
  
  if (brand.businessInfo.website) {
    contactInfo.website = {
      label: "Website",
      value: brand.businessInfo.website
    };
  }
  
  if (brand.businessInfo.address) {
    contactInfo.address = {
      label: "Address",
      value: brand.businessInfo.address
    };
  }
  
  // Format social media with platform labels
  if (brand.socialMedia.instagram) {
    socialMedia.instagram = {
      label: "Instagram",
      value: brand.socialMedia.instagram
    };
  }
  
  if (brand.socialMedia.facebook) {
    socialMedia.facebook = {
      label: "Facebook",
      value: brand.socialMedia.facebook
    };
  }
  
  if (brand.socialMedia.linkedin) {
    socialMedia.linkedin = {
      label: "LinkedIn",
      value: brand.socialMedia.linkedin
    };
  }
  
  if (brand.socialMedia.twitter) {
    socialMedia.twitter = {
      label: "Twitter",
      value: brand.socialMedia.twitter
    };
  }
  
  if (brand.socialMedia.tiktok) {
    socialMedia.tiktok = {
      label: "TikTok",
      value: brand.socialMedia.tiktok
    };
  }
  
  if (brand.socialMedia.youtube) {
    socialMedia.youtube = {
      label: "YouTube",
      value: brand.socialMedia.youtube
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

    // Fetch brand data
    const brandDoc = await getDoc(doc(db, `v2/${userId}/brands`, brandId));
    if (!brandDoc.exists()) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const brand = brandDoc.data() as V2Brand;
    
    // Calculate logo space
    const logoAnalysis = calculateLogoSpace(brand);
    
    // Extract brand colors
    const brandColors = brand.logo.colors?.extracted?.palette?.slice(0, 3) || 
                       [brand.identity?.keywords?.find(k => k.startsWith('primary-color:'))?.split(':')[1] || '#000000'];

    // Format contact and social data
    const { contactInfo, socialMedia } = formatContactAndSocialForBrief(brand);
    
    // Create generation context
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
      businessDescription: formData.businessDescription,
      imageryInstructions: formData.imageryInstructions
    };

    // Create generation job
    const jobRef = await addDoc(collection(db, `v2/${userId}/briefJobs`), {
      campaignId,
      brandId,
      userId,
      status: 'generating',
      startedAt: serverTimestamp(),
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

        // Create brief document
        const brief: Omit<CreativeBrief, 'id'> = {
          campaignId,
          brandId,
          userId,
          model: config.model,
          temperature: config.temperature,
          generatedAt: serverTimestamp(),
          briefText,
          context,
          selected: false,
          designGenerated: false,
          edited: false
        };

        // Save brief
        const briefRef = await addDoc(collection(db, `v2/${userId}/creativeBriefs`), brief);
        
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

    // Update job with results
    await updateDoc(doc(db, `v2/${userId}/briefJobs`, jobRef.id), {
      status: 'complete',
      completedAt: serverTimestamp(),
      briefs: successfulBriefs,
      completedBriefs: successfulBriefs.length,
      errors: errors.length > 0 ? errors : undefined
    });

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