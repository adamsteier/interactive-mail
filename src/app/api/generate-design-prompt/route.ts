import { NextResponse } from 'next/server';
// TODO: Import necessary libraries: OpenAI, SendGrid Mail
import { OpenAI } from 'openai';
import sgMail from '@sendgrid/mail';

// Firebase Admin SDK
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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

// --- Define type for Firestore Campaign data --- 
interface FirestoreCampaign { 
  businessType: string; 
  // Add other fields if needed for stricter typing later
  userInputData?: { // Define nested structure for accessing prompt data
      brandData?: { brandName?: string; stylePreferences?: string[]; primaryColor?: string; accentColor?: string };
      marketingData?: { objectives?: string[]; callToAction?: string };
      audienceData?: { industry?: string; targetDescription?: string };
      visualData?: { imageStyle?: string[]; imagePrimarySubject?: string; layoutStyle?: string };
      businessData?: { extraInfo?: string };
  }
}
// --- End Type Definition ---

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
      
      const draftMsg = {
        to: 'adam@posttimely.com', 
        from: 'team@magicmailing.com',
        subject: `[Draft Started] Multi-Design Request: ${designRequestData.campaigns?.[0]?.userInputData?.brandData?.brandName || documentId}`, 
        text: `A new multi-design request has been started by a user (Doc ID: ${documentId}).\n\n` +
              `Brand: ${designRequestData.campaigns?.[0]?.userInputData?.brandData?.brandName || 'N/A'}\n\n` +
              `Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as FirestoreCampaign).businessType).join(', ') || 'N/A'}\n\n` + // Use type assertion
              `You can monitor progress here: ${adminRequestUrl}`, 
        html: `<p>A new multi-design request has been started by a user (Doc ID: <strong>${documentId}</strong>).</p>` +
              `<p>Brand: ${designRequestData.campaigns?.[0]?.userInputData?.brandData?.brandName || 'N/A'}</p>` +
              `<p>Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as FirestoreCampaign).businessType).join(', ') || 'N/A'}</p>` + // Use type assertion
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

      // *** ALL AI generation and final notification logic stays within this block ***
      
      // Check data validity specific for prompt generation
      const firstCampaign = designRequestData.campaigns?.[0] as FirestoreCampaign | undefined; 
      const logoForPrompt = designRequestData.logoUrl;
      if (!firstCampaign?.userInputData) { 
          // ... handle incomplete data error ...
          return NextResponse.json({ error: 'Incomplete design request data for prompt generation' }, { status: 400 });
      }
      const firstCampaignData = firstCampaign.userInputData;

      console.log("Calling OpenAI API...");
      const aiPrompt = `
        You are an expert marketing assistant helping generate postcard image prompts and summaries for a human designer.
        This request might involve multiple final designs (${designRequestData.designScope === 'multiple' ? designRequestData.campaigns?.length : 1} total campaigns: ${designRequestData.campaigns?.map((c: unknown) => (c as FirestoreCampaign).businessType).join(', ')}).
        Generate a prompt and summary based on the *first* campaign's details provided below as a starting point. The human designer will adapt as needed for other campaigns.
        
        Requirements (from first campaign):
        - Brand Name: ${firstCampaignData.brandData?.brandName}
        - Logo URL: ${logoForPrompt}
        - Brand Style Preferences: ${firstCampaignData.brandData?.stylePreferences?.join(', ')}
        - Primary Color: ${firstCampaignData.brandData?.primaryColor}
        - Accent Color: ${firstCampaignData.brandData?.accentColor}
        - Marketing Objectives: ${firstCampaignData.marketingData?.objectives?.join(', ')}
        - Call To Action: ${firstCampaignData.marketingData?.callToAction}
        - Target Audience Industry: ${firstCampaignData.audienceData?.industry}
        - Target Audience Description: ${firstCampaignData.audienceData?.targetDescription}
        - Desired Image Styles: ${firstCampaignData.visualData?.imageStyle?.join(', ')}
        - Primary Image Subject: ${firstCampaignData.visualData?.imagePrimarySubject}
        - Desired Layout Style: ${firstCampaignData.visualData?.layoutStyle}
        - Extra Info/Notes: ${firstCampaignData.businessData?.extraInfo}
        
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
          subject: `[Ready for Review] Design Request: ${firstCampaignData.brandData?.brandName || documentId}`,
          text: `Design request ready for review (Doc ID: ${documentId}).\n\n` +
                `Brand: ${firstCampaignData.brandData?.brandName || 'N/A'}\n\n` +
                `Scope: ${designRequestData.designScope} (${designRequestData.campaigns?.length} campaigns)\n`+
                `Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as FirestoreCampaign).businessType).join(', ') || 'N/A'}\n\n` + // Use type assertion
                `AI Generated Prompt (based on first campaign):
${aiGeneratedPrompt}\n\n` +
                `AI Summary for Admin:
${aiSummary}\n\n` +
                `Logo URL: ${logoForPrompt}\n\n` +
                `Manage Request: ${adminRequestUrl}`, 
          html: `<p>Design request ready for review (Doc ID: <strong>${documentId}</strong>)</p>` +
                `<p>Brand: ${firstCampaignData.brandData?.brandName || 'N/A'}</p>` +
                `<p>Scope: ${designRequestData.designScope} (${designRequestData.campaigns?.length} campaigns)</p>` +
                `<p>Business Types: ${designRequestData.campaigns?.map((c: unknown) => (c as FirestoreCampaign).businessType).join(', ') || 'N/A'}</p>` + // Use type assertion
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
      // --- Handle other statuses (e.g., already processed) --- 
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