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
}
// --- End Type Definitions ---

// Initialize Firebase Admin SDK
// Check if FIREBASE_SERVICE_ACCOUNT_JSON is set
if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  console.error('Firebase Service Account JSON not found in environment variables.');
  // You might want to throw an error here or handle it appropriately
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

// Initialize only if no apps exist
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('Firebase Admin SDK Initialized');
  } catch (error) {
    console.error('Firebase Admin SDK Initialization Error:', error);
    // Handle initialization error appropriately
  }
}

const dbAdmin = getFirestore(); // Use a different name like dbAdmin to avoid conflicts if client 'db' is ever used server-side

// Initialize OpenAI
if (!process.env.OPENAI_API_KEY) {
  console.error('OpenAI API Key not found in environment variables.');
  // Handle missing key appropriately
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// TODO: Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.error('SendGrid API Key not found in environment variables.');
  // Handle missing key appropriately
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function POST(req: Request) {
  console.log("Received request for /api/generate-design-prompt");

  let documentId: string | undefined;
  let docRef: FirebaseFirestore.DocumentReference | undefined;
  let designRequestData: FirebaseFirestore.DocumentData | undefined;

  try {
    const body = await req.json();
    documentId = body.documentId;
    console.log("Request body:", body);

    if (!documentId) {
      console.error('Document ID is missing');
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
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

    if (!designRequestData) { // Basic check
      throw new Error("Failed to retrieve document data.");
    }

    const currentStatus = designRequestData.status;
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const adminRequestUrl = `${appBaseUrl}/admin/requests/${documentId}`;

    // --- Conditional Logic Based on Status --- 

    if (currentStatus === 'draft_multiple') {
      // --- Handle Early Notification Only --- 
      console.log(`Status is 'draft_multiple'. Sending initial notification for doc ${documentId}.`);
      
      const globalBrandDataForEmail = designRequestData.globalBrandData as BrandData | undefined;

      const draftMsg = {
        to: 'adam@posttimely.com', 
        from: 'team@magicmailing.com',
        subject: `[Draft Started] Multi-Design Request: ${globalBrandDataForEmail?.brandName || documentId}`,
        text: `A new multi-design request has been started by a user (Doc ID: ${documentId}).\n\n` +
              `Brand: ${globalBrandDataForEmail?.brandName || 'N/A'}\n\n` +
              `Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as RequestCampaign).businessType).join(', ') || 'N/A'}\n\n` +
              `You can monitor progress here: ${adminRequestUrl}`, 
        html: `<p>A new multi-design request has been started by a user (Doc ID: <strong>${documentId}</strong>).</p>` +
              `<p>Brand: ${globalBrandDataForEmail?.brandName || 'N/A'}</p>` +
              `<p>Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as RequestCampaign).businessType).join(', ') || 'N/A'}</p>` +
              `<p><strong><a href="${adminRequestUrl}">Click here to monitor the request</a></strong></p>`, 
      };

      try {
        await sgMail.send(draftMsg); // Use draftMsg
        console.log(`Initial SendGrid email sent successfully for doc ${documentId}.`);
        await docRef.update({ notifiedAdmin: true });
        console.log(`Firestore document ${documentId} marked as notified.`);
        // *** Explicitly return success after notification ***
        return NextResponse.json({ success: true, message: 'Initial admin notification sent.' }); 
      } catch (emailError) {
        console.error(`Error sending initial SendGrid email for doc ${documentId}:`, emailError);
        return NextResponse.json({
          success: false, 
          message: 'Failed to send initial admin notification email.',
          error: emailError instanceof Error ? emailError.message : 'Unknown email error' 
        }, { status: 500 });
      }
      // --- End Early Notification --- 

    } else if (currentStatus === 'pending_prompt') {
      // --- Handle Full AI Generation and Final Notification --- 
      console.log(`Status is 'pending_prompt'. Processing AI generation for doc ${documentId}.`);

      // Fetch data according to ACTUAL Firestore structure using defined types
      const brandDataForPrompt = designRequestData.globalBrandData as BrandData | undefined;
      const firstCampaign = designRequestData.campaigns?.[0] as RequestCampaign | undefined;
      const logoForPrompt = designRequestData.logoUrl;

      // Check if required data exists
      if (!brandDataForPrompt || !firstCampaign) { 
          console.error(`Incomplete global brand or campaign data found for document ${documentId}.`);
          return NextResponse.json({ error: 'Incomplete design request data for prompt generation' }, { status: 400 });
      }
      // Destructure data from the first campaign directly
      const { marketingData, audienceData, businessData, visualData } = firstCampaign;
      if (!marketingData || !audienceData || !businessData || !visualData) {
         console.error(`Incomplete nested data within first campaign for document ${documentId}.`);
         return NextResponse.json({ error: 'Incomplete campaign data fields for prompt generation' }, { status: 400 });
      }

      console.log("Calling OpenAI API...");
      // Construct the prompt using globalBrandData and direct campaign fields
      const aiPrompt = `
        You are an expert marketing assistant helping generate postcard image prompts and summaries for a human designer.
        This request might involve multiple final designs (${designRequestData.designScope === 'multiple' ? designRequestData.campaigns?.length : 1} total campaigns: ${designRequestData.campaigns?.map((c: unknown) => (c as RequestCampaign).businessType).join(', ')}).
        Generate a prompt and summary based on the following details (using global brand info and first campaign specifics) as a starting point. The human designer will adapt as needed for other campaigns.
        
        Brand Info (Global):
        - Brand Name: ${brandDataForPrompt.brandName}
        - Logo URL: ${logoForPrompt}
        - Brand Style Preferences: ${brandDataForPrompt.stylePreferences?.join(', ')}
        - Primary Color: ${brandDataForPrompt.primaryColor}
        - Accent Color: ${brandDataForPrompt.accentColor}

        First Campaign Specifics:
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

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o", // Use appropriate model
          messages: [{ role: "user", content: aiPrompt }],
          temperature: 0.7,
          response_format: { type: "json_object" }
        });
        // ... (Parsing logic as before) ...
        const responseContent = completion.choices[0].message.content;
        if (!responseContent) throw new Error('No response content from OpenAI');
        const parsedResponse = JSON.parse(responseContent);
        aiGeneratedPrompt = parsedResponse.imagePrompt;
        aiSummary = parsedResponse.adminSummary;
        if (!aiGeneratedPrompt || !aiSummary) throw new Error('AI response missing fields');
        console.log("Successfully parsed AI response for prompt generation.");

      } catch (aiError) {
        console.error("Error calling OpenAI or parsing response:", aiError);
        // Update Firestore status to indicate failure?
        // await docRef.update({ status: 'prompt_failed' });
        return NextResponse.json({ error: 'Failed to generate prompt via AI', details: aiError instanceof Error ? aiError.message : 'Unknown AI error' }, { status: 500 });
      }

      // Update Firestore with AI results and 'pending_review' status
      console.log(`Updating Firestore document ${documentId} with AI results.`);
      await docRef.update({ 
        aiGeneratedPrompt: aiGeneratedPrompt, 
        aiSummary: aiSummary,             
        status: 'pending_review',
        notifiedAdmin: false // Reset notification flag before sending final email
      });
      console.log("Firestore document updated successfully with AI results.");

      // Send detailed SendGrid Notification
      console.log("Attempting to send final notification email via SendGrid...");
      const finalMsg = { 
          to: 'adam@posttimely.com', 
          from: 'team@magicmailing.com',
          subject: `[Ready for Review] Design Request: ${brandDataForPrompt?.brandName || documentId}`,
          text: `Design request ready for review (Doc ID: ${documentId}).\n\n` +
                `Brand: ${brandDataForPrompt?.brandName || 'N/A'}\n\n` +
                `Scope: ${designRequestData.designScope} (${designRequestData.campaigns?.length} campaigns)\n`+
                `Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as RequestCampaign).businessType).join(', ') || 'N/A'}\n\n` +
                `AI Generated Prompt (based on first campaign):
${aiGeneratedPrompt}\n\n` +
                `AI Summary for Admin:
${aiSummary}\n\n` +
                `Logo URL: ${logoForPrompt}\n\n` +
                `Manage Request: ${adminRequestUrl}`, 
          html: `<p>Design request ready for review (Doc ID: <strong>${documentId}</strong>)</p>` +
                `<p>Brand: ${brandDataForPrompt?.brandName || 'N/A'}</p>` +
                `<p>Scope: ${designRequestData.designScope} (${designRequestData.campaigns?.length} campaigns)</p>` +
                `<p>Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as RequestCampaign).businessType).join(', ') || 'N/A'}</p>` +
                `<p><strong>AI Generated Prompt (based on first campaign):</strong><br/>${aiGeneratedPrompt.replace(/\n/g, '<br/>')}</p>` +
                `<p><strong>AI Summary for Admin:</strong><br/>${aiSummary.replace(/\n/g, '<br/>')}</p>` +
                `<p>Logo URL: <a href="${logoForPrompt}">${logoForPrompt}</a></p>` +
                `<p><strong><a href="${adminRequestUrl}">Click here to manage the request</a></strong></p>`, 
       }; 

      try {
        await sgMail.send(finalMsg);
        console.log(`Final SendGrid email sent successfully for doc ${documentId}.`);
        await docRef.update({ notifiedAdmin: true });
        console.log(`Firestore document ${documentId} marked as notified (final).`);
        // *** Return success for the full flow ***
        return NextResponse.json({ success: true, message: 'Prompt generated and admin notified.' }); 
      } catch (emailError) {
        // Log the error and include details in the response
        console.error(`Error sending final SendGrid email for doc ${documentId}:`, emailError);
        return NextResponse.json({
          success: true, // AI part still worked
          message: 'Prompt generated, but failed to send final admin notification email.',
          error: emailError instanceof Error ? emailError.message : 'Unknown email error' // Include error message
        });
      }
      // --- End Full AI Generation --- 

    } else {
      // --- Handle other statuses (e.g., already processed, draft_multiple) --- 
      // Note: The draft_multiple case is handled earlier now
      console.log(`Document ${documentId} has status '${currentStatus}'. No action taken by generate-design-prompt.`);
      return NextResponse.json({ success: false, message: `Request status is '${currentStatus}'. No action needed.` });
    }

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