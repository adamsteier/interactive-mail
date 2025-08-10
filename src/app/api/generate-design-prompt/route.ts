import { NextResponse } from 'next/server';
// TODO: Import necessary libraries: OpenAI, SendGrid Mail
import { OpenAI } from 'openai';
import sgMail from '@sendgrid/mail';

// Firebase Admin SDK
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// --- Define types needed by the API route ---
// (These should ideally match types used elsewhere, e.g., admin page)
interface BrandData { 
  brandName?: string; 
  logoUrl?: string; 
  primaryColor?: string; 
  accentColor?: string; 
  stylePreferences?: string[]; 
}

interface MarketingData { objectives?: string[]; callToAction?: string; }
interface AudienceData { industry?: string; targetDescription?: string; }
interface BusinessData { extraInfo?: string; /* Add other needed fields */ }
interface VisualData { imageStyle?: string[]; imagePrimarySubject?: string; layoutStyle?: string; }

interface RequestCampaign { 
  businessType: string; 
  marketingData?: MarketingData;
  audienceData?: AudienceData;
  businessData?: BusinessData;
  visualData?: VisualData;
  finalDesigns?: string[]; // Keep this for admin uploads
  // Add fields for per-campaign AI results
  aiPrompt?: string; 
  aiSummary?: string;
  campaignStatus: string;
}

interface ApiRequestBody {
    documentId: string;
    targetCampaignType?: string; // Make this optional for now, but expect it
}

// --- End Type Definitions ---

// Initialize Firebase Admin SDK - moved to function to avoid build-time execution
function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // Check if FIREBASE_SERVICE_ACCOUNT_JSON is set
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.error('Firebase Service Account JSON not found in environment variables.');
      throw new Error('Firebase Service Account JSON not found in environment variables.');
    }

    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    try {
      initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('Firebase Admin SDK Initialized');
    } catch (error) {
      console.error('Firebase Admin SDK Initialization Error:', error);
      throw error;
    }
  }
}

// Services are initialized in the POST handler to avoid build-time execution

export async function POST(req: Request) {
  let documentId: string | undefined;
  let docRef: FirebaseFirestore.DocumentReference | undefined;
  let designRequestData: FirebaseFirestore.DocumentData | undefined;
  let targetCampaignType: string | undefined;

  try {
    // Initialize all services
    initializeFirebaseAdmin();
    const dbAdmin = getFirestore(); // Use a different name like dbAdmin to avoid conflicts if client 'db' is ever used server-side

    // Initialize OpenAI
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API Key not found in environment variables.');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize SendGrid
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API Key not found in environment variables.');
      return NextResponse.json({ error: 'SendGrid API key not configured' }, { status: 500 });
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');
    const body: ApiRequestBody = await req.json();
    documentId = body.documentId;
    targetCampaignType = body.targetCampaignType; // Get the target campaign type
    console.log("Request body:", body);

    if (!documentId) {
      console.error('Document ID is missing');
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }
    if (!targetCampaignType) {
        console.error('targetCampaignType is missing from the request body');
        return NextResponse.json({ error: 'Missing targetCampaignType' }, { status: 400 });
    }

    // Fetch data from Firestore
    console.log(`Fetching data for document: ${documentId}`);
    docRef = dbAdmin.collection('design_requests').doc(documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      console.error(`Document ${documentId} not found.`);
      return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
    }
    designRequestData = docSnap.data();
    console.log(`Fetched data for doc ${documentId}:`, designRequestData);

    if (!designRequestData) { throw new Error("Failed to retrieve document data."); }

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const adminRequestUrl = `${appBaseUrl}/admin/requests/${documentId}`;

    // --- Find the Target Campaign --- 
    const campaigns = designRequestData.campaigns as RequestCampaign[] | undefined;
    const campaignIndex = campaigns?.findIndex(c => c.businessType === targetCampaignType);
    const targetCampaign = campaignIndex !== undefined && campaignIndex !== -1 ? campaigns?.[campaignIndex] : undefined;

    if (!targetCampaign) {
        console.error(`Campaign type '${targetCampaignType}' not found within doc ${documentId}`);
        return NextResponse.json({ error: `Target campaign '${targetCampaignType}' not found in request.` }, { status: 404 });
    }

    // Check if this specific campaign needs processing
    if (targetCampaign.campaignStatus !== 'processing_ai') {
        console.log(`Campaign '${targetCampaignType}' status is '${targetCampaign.campaignStatus || 'unknown'}'. No AI generation needed.`);
        // Potentially resend notification if needed?
        return NextResponse.json({ success: true, message: `Campaign already processed or not ready.` });
    }
    
    // --- Generate AI for the Specific Campaign --- 
    console.log(`Processing AI generation for campaign '${targetCampaignType}' in doc ${documentId}.`);

    const brandDataForPrompt = designRequestData.globalBrandData as BrandData | undefined;
    const logoForPrompt = designRequestData.logoUrl;

    if (!brandDataForPrompt) {
        console.error(`Incomplete global brand data for doc ${documentId}.`);
        return NextResponse.json({ error: 'Incomplete brand data for prompt generation' }, { status: 400 });
    }
    // Destructure data from the *target* campaign
    const { marketingData, audienceData, businessData, visualData } = targetCampaign;
    if (!marketingData || !audienceData || !businessData || !visualData) {
        console.error(`Incomplete nested data within target campaign '${targetCampaignType}'.`);
         // Update campaign status to failed?
         if (docRef && campaignIndex !== undefined && campaignIndex !== -1) {
            await docRef.update({ [`campaigns.${campaignIndex}.campaignStatus`]: 'ai_failed' });
         }
        return NextResponse.json({ error: 'Incomplete campaign data fields' }, { status: 400 });
    }

    console.log("Calling OpenAI API for campaign:", targetCampaignType);
    const specificAiPrompt = `
      You are an expert marketing assistant generating content for a specific postcard campaign.
      Campaign Type: ${targetCampaignType}
      
      Generate a detailed, creative image generation prompt (suitable for DALL-E/Midjourney) AND a concise summary (2-3 sentences) for a human designer based ONLY on the following requirements.
      
      Brand Info (Apply Globally):
      - Brand Name: ${brandDataForPrompt.brandName}
      - Logo URL: ${logoForPrompt}
      - Brand Style Preferences: ${brandDataForPrompt.stylePreferences?.join(', ')}
      - Primary Color: ${brandDataForPrompt.primaryColor}
      - Accent Color: ${brandDataForPrompt.accentColor}

      Campaign Specifics (${targetCampaignType}):
      - Marketing Objectives: ${marketingData.objectives?.join(', ')}
      - Call To Action: ${marketingData.callToAction}
      - Target Audience Industry: ${audienceData.industry}
      - Target Audience Description: ${audienceData.targetDescription}
      - Desired Image Styles: ${visualData.imageStyle?.join(', ')}
      - Primary Image Subject: ${visualData.imagePrimarySubject}
      - Desired Layout Style: ${visualData.layoutStyle}
      - Extra Info/Notes: ${businessData.extraInfo}
      
      Provide the output STRICTLY in JSON format:
      { "imagePrompt": "[Detailed prompt]", "adminSummary": "[Concise summary]" }
    `;

    let aiGeneratedPrompt = '';
    let aiSummary = '';
    let campaignUpdateStatus: RequestCampaign['campaignStatus'] = 'review_ready'; // Default to success

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: specificAiPrompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) throw new Error('No response content from OpenAI');
      
      const parsedResponse = JSON.parse(responseContent);
      aiGeneratedPrompt = parsedResponse.imagePrompt;
      aiSummary = parsedResponse.adminSummary;

      if (!aiGeneratedPrompt || !aiSummary) throw new Error('AI response missing fields');
      
      console.log(`Successfully generated AI content for campaign: ${targetCampaignType}`);
    } catch (aiError) {
      console.error(`Error generating AI content for campaign '${targetCampaignType}':`, aiError);
      aiGeneratedPrompt = `Error: ${aiError instanceof Error ? aiError.message : 'AI generation failed.'}`;
      aiSummary = 'Generation failed.';
      campaignUpdateStatus = 'ai_failed'; // Mark as failed
    }

    // Update Firestore for THIS campaign + top-level notification flag
    console.log(`Updating Firestore doc ${documentId} / campaign '${targetCampaignType}' with results.`);
    if (campaignIndex === undefined || campaignIndex === -1) {
        throw new Error("Campaign index became invalid during processing."); // Should not happen
    }
    await docRef.update({ 
      [`campaigns.${campaignIndex}.aiPrompt`]: aiGeneratedPrompt,
      [`campaigns.${campaignIndex}.aiSummary`]: aiSummary,
      [`campaigns.${campaignIndex}.campaignStatus`]: campaignUpdateStatus,
      notifiedAdmin: true // Mark that admin has been notified about *something* 
      // We could make notifiedAdmin per-campaign too, but let's keep it simple for now
    });
    console.log("Firestore document updated for campaign results.");

    // --- Send Specific SendGrid Notification --- 
    console.log(`Attempting to send notification email for campaign '${targetCampaignType}'...`);
    const notifyMsg = { 
        to: 'adam@posttimely.com', 
        from: 'team@magicmailing.com',
        subject: `[${campaignUpdateStatus === 'review_ready' ? 'Ready' : 'Failed'}] Campaign: ${targetCampaignType} (${brandDataForPrompt?.brandName || documentId})`,
        text: `Campaign '${targetCampaignType}' is ${campaignUpdateStatus === 'review_ready' ? 'ready for review' : 'failed during AI processing'} (Doc ID: ${documentId}).\n\n` +
            `Brand: ${brandDataForPrompt?.brandName || 'N/A'}\n\n` +
            (campaignUpdateStatus === 'review_ready' ? 
                `AI Summary: ${aiSummary}\n\nAI Prompt: ${aiGeneratedPrompt}\n\n` : 
                `Error Summary: ${aiSummary}\n\n`
            ) +
            `Logo URL: ${logoForPrompt}\n\n` +
            `Manage Request: ${adminRequestUrl}`,
        html: `<p>Campaign '${targetCampaignType}' is ${campaignUpdateStatus === 'review_ready' ? 'ready for review' : 'failed during AI processing'} (Doc ID: <strong>${documentId}</strong>)</p>` +
            `<p>Brand: ${brandDataForPrompt?.brandName || 'N/A'}</p>` +
            `<p>${campaignUpdateStatus === 'review_ready' ? 
                `<strong>AI Summary:</strong><br/>${aiSummary.replace(/\n/g, '<br/>')}</p>` +
                `<p><strong>AI Prompt:</strong><br/>${aiGeneratedPrompt.replace(/\n/g, '<br/>')}</p>` : 
                `<strong>Error Summary:</strong><br/>${aiSummary.replace(/\n/g, '<br/>')}</p>`
            }` +
            `<p>Logo URL: <a href="${logoForPrompt}">${logoForPrompt}</a></p>` +
            `<p><strong><a href="${adminRequestUrl}">Click here to manage the request</a></strong></p>`, 
     }; 

    try {
      await sgMail.send(notifyMsg);
      console.log(`SendGrid email sent successfully for campaign '${targetCampaignType}'.`);
    } catch (emailError) {
      console.error(`Error sending SendGrid email for campaign '${targetCampaignType}':`, emailError);
      // Log error, but don't necessarily fail the whole process if AI part succeeded
      return NextResponse.json({
        success: campaignUpdateStatus !== 'ai_failed', // Indicate overall success based on AI
        message: `AI processing for ${targetCampaignType} ${campaignUpdateStatus}. Failed to send notification email.`,
        error: emailError instanceof Error ? emailError.message : 'Unknown email error' 
      });
    }

    // Return final success
    return NextResponse.json({ success: true, message: `Campaign ${targetCampaignType} processed. Status: ${campaignUpdateStatus}` });

  } catch (error) {
    console.error(`Error processing document ${documentId || '(unknown ID)'} in /api/generate-design-prompt:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Update Firestore status to failed if possible?
    if (docRef) {
      try {
        await docRef.update({ status: 'processing_failed', failureReason: message });
      } catch (updateError) {
        console.error(`Failed to update status to failed for doc ${documentId}:`, updateError);
      }
    }
    return NextResponse.json({ error: 'Failed to process design request', details: message }, { status: 500 });
  }
}