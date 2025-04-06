import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import sgMail from '@sendgrid/mail';

// Firebase Admin SDK
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Import shared types (adjust path if necessary)
import type { BrandingData, CampaignDesignData } from '@/types/firestoreTypes'; 

// --- Define API Request Body Type ---
interface ApiRequestBody {
    userId: string;
    campaignDesignId: string;
}
// --- End Type Definitions ---

// Initialize Firebase Admin SDK
// Ensure FIREBASE_SERVICE_ACCOUNT_JSON is set in environment variables
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error('CRITICAL: Firebase Service Account JSON not found in environment variables.');
  // Optionally throw an error or return a specific server error response immediately
}
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
if (!getApps().length) {
  try {
    initializeApp({ credential: cert(serviceAccount) });
    console.log('Firebase Admin SDK Initialized (generate-design-prompt-campaign)');
  } catch (error) {
    console.error('Firebase Admin SDK Initialization Error:', error);
  }
}
const dbAdmin = getFirestore();

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('CRITICAL: OpenAI API Key not found in environment variables.');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error('CRITICAL: SendGrid API Key not found in environment variables.');
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function POST(req: Request) {
  let userId: string | undefined;
  let campaignDesignId: string | undefined;
  let campaignDocRef: FirebaseFirestore.DocumentReference | undefined;

  try {
    const body: ApiRequestBody = await req.json();
    userId = body.userId;
    campaignDesignId = body.campaignDesignId;
    console.log(`Received request for userId: ${userId}, campaignDesignId: ${campaignDesignId}`);

    if (!userId || !campaignDesignId) {
      console.error('User ID or Campaign Design ID is missing');
      return NextResponse.json({ error: 'Missing userId or campaignDesignId' }, { status: 400 });
    }

    // --- Fetch Campaign Design Data ---
    console.log(`Fetching campaign data: users/${userId}/campaignDesignData/${campaignDesignId}`);
    campaignDocRef = dbAdmin.collection('users').doc(userId).collection('campaignDesignData').doc(campaignDesignId);
    const campaignDocSnap = await campaignDocRef.get();
    if (!campaignDocSnap.exists) {
      console.error(`Campaign Design document ${campaignDesignId} not found for user ${userId}.`);
      return NextResponse.json({ error: 'Campaign design request not found' }, { status: 404 });
    }
    const campaignData = campaignDocSnap.data() as CampaignDesignData; // Cast to shared type
    console.log("Fetched Campaign Data:", campaignData);

    if (!campaignData) { throw new Error("Failed to retrieve campaign document data."); }
    if (!campaignData.associatedBrandId) { throw new Error("Campaign data is missing associatedBrandId."); }

    // --- Fetch Associated Branding Data ---
    console.log(`Fetching branding data: users/${userId}/branding/${campaignData.associatedBrandId}`);
    const brandDocRef = dbAdmin.collection('users').doc(userId).collection('branding').doc(campaignData.associatedBrandId);
    const brandDocSnap = await brandDocRef.get();
    if (!brandDocSnap.exists) {
        // Log error but proceed - maybe brand was deleted? Prompt can still be generated partially.
        console.warn(`Associated Brand document ${campaignData.associatedBrandId} not found for user ${userId}. Proceeding without brand details.`);
    }
    const brandData = brandDocSnap.exists ? brandDocSnap.data() as BrandingData : null; // Cast to shared type
    console.log("Fetched Branding Data:", brandData);

    // Immediately update status to 'processing'
    console.log(`Updating campaign ${campaignDesignId} status to 'processing'`);
    await campaignDocRef.update({ 
        status: 'processing', 
        updatedAt: FieldValue.serverTimestamp() 
    });

    // --- Generate AI Prompt ---
    console.log(`Generating AI prompt for campaign: ${campaignData.designName}`);

    // Combine data for the prompt (handle potential missing brand data gracefully)
    const promptContext = `
      You are an expert marketing assistant generating content for a specific postcard campaign.
      Campaign Name: ${campaignData.designName}
      Campaign Type/Audience: ${campaignData.targetAudience} 
      
      Brand Info:
      - Brand Name: ${brandData?.businessName || 'N/A'}
      - Logo URL: ${brandData?.logoUrl || 'N/A'} 
      - Primary Color: ${brandData?.styleComponents?.primaryColor || 'N/A'}
      - Secondary Color: ${brandData?.styleComponents?.secondaryColor || 'N/A'}
      - Brand Identity Notes: ${brandData?.brandIdentity || 'N/A'}

      Campaign Specifics:
      - Primary Goal: ${campaignData.primaryGoal}
      - Call To Action: ${campaignData.callToAction}
      - Target Market Notes: ${campaignData.targetMarketDescription || 'N/A'}
      - Offer: ${campaignData.offer || 'N/A'}
      - Key Selling Points: ${campaignData.keySellingPoints?.join(', ') || 'N/A'}
      - Tone: ${campaignData.tone || 'Default / Not Specified'}
      - Visual Style: ${campaignData.visualStyle || 'Default / Not Specified'}
      
      Imagery Preference:
      - Type: ${campaignData.imageryType || 'Not Specified'}
      ${campaignData.imageryType === 'upload' 
          ? `- User Uploaded Image URLs: [${(campaignData.uploadedImageUrls || []).join(', ')}] (Consider these images for reference or inclusion in the design.)` 
          : `- User Description for AI Imagery: ${campaignData.imageryDescription || 'Not Specified (Generate appropriate imagery based on other details)'}`}

      - Additional Info/Notes: ${campaignData.additionalInfo || 'N/A'}
      
      Generate a detailed, creative image generation prompt (suitable for DALL-E/Midjourney) AND a concise summary (2-3 sentences) for a human designer based ONLY on the provided details.
      
      Provide the output STRICTLY in JSON format:
      { "imagePrompt": "[Detailed prompt]", "adminSummary": "[Concise summary]" }
    `;

    let aiGeneratedPrompt = '';
    let aiSummary = '';
    let campaignUpdateStatus: CampaignDesignData['status'] = 'ready'; // Default to success

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Use a capable model
        messages: [{ role: "user", content: promptContext }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) throw new Error('No response content from OpenAI');
      
      const parsedResponse = JSON.parse(responseContent);
      aiGeneratedPrompt = parsedResponse.imagePrompt;
      aiSummary = parsedResponse.adminSummary;

      if (!aiGeneratedPrompt || !aiSummary) throw new Error('AI response missing required fields (imagePrompt, adminSummary)');
      
      console.log(`Successfully generated AI content for campaign: ${campaignDesignId}`);

    } catch (aiError) {
      console.error(`Error generating AI content for campaign '${campaignDesignId}':`, aiError);
      aiGeneratedPrompt = `Error: ${aiError instanceof Error ? aiError.message : 'AI generation failed.'}`; // Store error in prompt field
      aiSummary = 'AI prompt generation failed. Please review manually.'; // Provide context in summary
      campaignUpdateStatus = 'failed'; // Mark as failed
    }

    // --- Update Firestore Campaign Document ---
    console.log(`Updating Firestore campaign doc ${campaignDesignId} with results. Status: ${campaignUpdateStatus}`);
    await campaignDocRef.update({ 
      generatedPrompt: aiGeneratedPrompt,
      aiSummary: aiSummary, // Save the summary
      status: campaignUpdateStatus,
      updatedAt: FieldValue.serverTimestamp() // Update timestamp again
    });
    console.log("Firestore campaign document updated successfully.");

    // --- Send SendGrid Notification ---
    console.log(`Attempting to send notification email for campaign '${campaignDesignId}'...`);
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    // Use the correct link format for the admin page
    const adminRequestUrl = `${appBaseUrl}/admin/user-designs/${userId}?campaignId=${campaignDesignId}`; 
    
    const subjectStatus = campaignUpdateStatus === 'ready' ? 'Ready for Review' : 'Failed';
    const emailSubject = `[${subjectStatus}] Campaign: ${campaignData.designName} (User: ${userId})`;

    const notifyMsg = { 
        to: 'adam@posttimely.com', // Keep target email
        from: 'team@magicmailing.com', // Keep sender
        subject: emailSubject,
        text: `Campaign '${campaignData.designName}' (ID: ${campaignDesignId}) for user ${userId} is ${subjectStatus}.

` +
            `Brand: ${brandData?.businessName || 'N/A'}
` +
            `<p>Imagery Preference: ${campaignData.imageryType === 'upload' ? 'User Uploaded Images' : campaignData.imageryType === 'describe' ? 'AI Description Provided' : 'Not Specified'}</p>` +
            (campaignData.imageryType === 'upload' && (campaignData.uploadedImageUrls || []).length > 0 ? 
                `<p>Uploaded Images:<br/>${(campaignData.uploadedImageUrls || []).map(url => `<a href="${url}" target="_blank">${url}</a>`).join('<br/>')}</p>` : '') +
            (campaignData.imageryType === 'describe' && campaignData.imageryDescription ? 
                `<p>Imagery Description: ${campaignData.imageryDescription}</p>` : '') +
            (campaignUpdateStatus === 'ready' ? 
                `AI Summary: ${aiSummary}

AI Prompt (or Error): ${aiGeneratedPrompt}

` : 
                `Error Summary: ${aiSummary}
Error Detail: ${aiGeneratedPrompt}

` // Show error detail from prompt field
            ) +
            `Manage Campaign: ${adminRequestUrl}`,
        html: `<p>Campaign '${campaignData.designName}' (ID: <strong>${campaignDesignId}</strong>) for user ${userId} is <strong>${subjectStatus}</strong>.</p>` +
            `<p>Brand: ${brandData?.businessName || 'N/A'}</p>` +
            `<p>Imagery Preference: ${campaignData.imageryType === 'upload' ? 'User Uploaded Images' : campaignData.imageryType === 'describe' ? 'AI Description Provided' : 'Not Specified'}</p>` +
            (campaignData.imageryType === 'upload' && (campaignData.uploadedImageUrls || []).length > 0 ? 
                `<p>Uploaded Images:<br/>${(campaignData.uploadedImageUrls || []).map(url => `<a href="${url}" target="_blank">${url}</a>`).join('<br/>')}</p>` : '') +
            (campaignData.imageryType === 'describe' && campaignData.imageryDescription ? 
                `<p>Imagery Description: ${campaignData.imageryDescription}</p>` : '') +
            (campaignUpdateStatus === 'ready' ? 
                `<p><strong>AI Summary:</strong><br/>${aiSummary.replace(/\n/g, '<br/>')}</p>` +
                `<p><strong>AI Prompt:</strong><br/>${aiGeneratedPrompt.replace(/\n/g, '<br/>')}</p>` :
                `<p><strong>Error Summary:</strong><br/>${aiSummary.replace(/\n/g, '<br/>')}</p><p><strong>Error Detail:</strong><br/>${aiGeneratedPrompt.replace(/\n/g, '<br/>')}</p>`
            ) +
            `<p><strong><a href="${adminRequestUrl}">Click here to manage the campaign</a></strong></p>`, 
     }; 

    try {
      await sgMail.send(notifyMsg);
      console.log(`SendGrid email sent successfully for campaign '${campaignDesignId}'.`);
    } catch (emailError) {
      console.error(`Error sending SendGrid email for campaign '${campaignDesignId}':`, emailError);
      // Log email error, but return success based on AI/DB update status
      return NextResponse.json({
        success: campaignUpdateStatus !== 'failed', 
        message: `Campaign ${campaignDesignId} processed (${campaignUpdateStatus}). Failed to send notification email.`,
        error: emailError instanceof Error ? emailError.message : 'Unknown email error' 
      }, { status: 200 }); // Return 200 even if email failed, as main task might be done
    }

    // --- Return Final Success ---
    return NextResponse.json({ success: true, message: `Campaign ${campaignDesignId} processed. Status: ${campaignUpdateStatus}` });

  } catch (error) {
    console.error(`Error processing campaign design request (User: ${userId}, Campaign: ${campaignDesignId}):`, error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    // Update Firestore status to failed if possible
    if (campaignDocRef) {
      try {
        // Check if status needs updating (avoid overwriting 'ready' if failure happened later)
        const currentSnap = await campaignDocRef.get();
        if (currentSnap.exists && currentSnap.data()?.status !== 'ready') {
            await campaignDocRef.update({ status: 'failed', generatedPrompt: `Processing Error: ${message}`, updatedAt: FieldValue.serverTimestamp() }); // Corrected usage
        }
      } catch (updateError) {
        console.error(`Failed to update status to failed for campaign ${campaignDesignId}:`, updateError);
      }
    }
    return NextResponse.json({ error: 'Failed to process campaign design request', details: message }, { status: 500 });
  }
} 