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
      // --- Handle Per-Campaign AI Generation and Final Notification --- 
      console.log(`Status is 'pending_prompt'. Processing AI generation PER CAMPAIGN for doc ${documentId}.`);

      const brandDataForPrompt = designRequestData.globalBrandData as BrandData | undefined;
      const campaignsToProcess = designRequestData.campaigns as RequestCampaign[] | undefined;
      const logoForPrompt = designRequestData.logoUrl;

      if (!brandDataForPrompt || !campaignsToProcess || campaignsToProcess.length === 0) { 
          console.error(`Incomplete global brand or campaign array found for document ${documentId}.`);
          return NextResponse.json({ error: 'Incomplete request data for prompt generation' }, { status: 400 });
      }

      // Use Promise.all to process campaigns concurrently
      const updatedCampaignsPromises = campaignsToProcess.map(async (campaign) => {
        // Destructure data for clarity
        const { marketingData, audienceData, businessData, visualData, businessType } = campaign;
        
        // Basic check for necessary nested data within this specific campaign
        if (!marketingData || !audienceData || !businessData || !visualData) {
           console.warn(`Skipping AI generation for campaign '${businessType}' due to incomplete data.`);
           return { ...campaign, aiPrompt: 'Error: Incomplete input data.', aiSummary: '-' }; // Return original with error placeholder
        }

        console.log(`Generating AI prompt for campaign: ${businessType}`);
        const specificAiPrompt = `
          You are an expert marketing assistant generating content for a specific postcard campaign.
          Campaign Type: ${businessType}
          
          Generate a detailed, creative image generation prompt (suitable for DALL-E/Midjourney) AND a concise summary (2-3 sentences) for a human designer based ONLY on the following requirements.
          
          Brand Info (Apply Globally):
          - Brand Name: ${brandDataForPrompt.brandName}
          - Logo URL: ${logoForPrompt}
          - Brand Style Preferences: ${brandDataForPrompt.stylePreferences?.join(', ')}
          - Primary Color: ${brandDataForPrompt.primaryColor}
          - Accent Color: ${brandDataForPrompt.accentColor}

          Campaign Specifics (${businessType}):
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
          const aiGeneratedPrompt = parsedResponse.imagePrompt;
          const aiSummary = parsedResponse.adminSummary;

          if (!aiGeneratedPrompt || !aiSummary) throw new Error('AI response missing fields');
          
          console.log(`Successfully generated AI content for campaign: ${businessType}`);
          // Return the campaign object augmented with AI results
          return { ...campaign, aiPrompt: aiGeneratedPrompt, aiSummary: aiSummary }; 

        } catch (aiError) {
          console.error(`Error generating AI content for campaign '${businessType}':`, aiError);
          // Return original campaign data with error indicators
          return { 
              ...campaign, 
              aiPrompt: `Error: ${aiError instanceof Error ? aiError.message : 'AI generation failed.'}`, 
              aiSummary: 'Generation failed.' 
          };
        }
      }); // End of map function

      // Wait for all campaign processing promises to resolve
      const updatedCampaigns = await Promise.all(updatedCampaignsPromises);

      // Update Firestore with the results array and change status
      console.log(`Updating Firestore document ${documentId} with results for all campaigns.`);
      await docRef.update({ 
        campaigns: updatedCampaigns, // Save the array with AI results included
        status: 'pending_review',
        notifiedAdmin: false // Reset notification flag before sending final email
      });
      console.log("Firestore document updated successfully with all campaign AI results.");

      // --- Send Modified Final SendGrid Notification --- 
      console.log("Attempting to send final multi-campaign notification email...");
      
      // Create a summary of results for the email
      const emailSummaries = updatedCampaigns.map(c => 
         `Campaign: ${c.businessType}\nSummary: ${c.aiSummary || 'Not generated'}\n---\n`
      ).join('\n');
      const htmlSummaries = updatedCampaigns.map(c => 
         `<p><strong>Campaign: ${c.businessType}</strong><br/>Summary: ${c.aiSummary?.replace(/\n/g, '<br/>') || 'Not generated'}</p>`
      ).join('');

      const finalMsg = { 
          to: 'adam@posttimely.com', 
          from: 'team@magicmailing.com',
          subject: `[Multi-Design Ready] Request: ${brandDataForPrompt?.brandName || documentId}`,
          text: `Multi-design request ready for review (Doc ID: ${documentId}).\n\n` +
              `Brand: ${brandDataForPrompt?.brandName || 'N/A'}\n\n` +
              `Scope: ${designRequestData.designScope} (${updatedCampaigns.length} campaigns)\n\n` +
              `Summaries:\n${emailSummaries}\n` +
              `Logo URL: ${logoForPrompt}\n\n` +
              `Manage Request: ${adminRequestUrl}`,
          html: `<p>Multi-design request ready for review (Doc ID: <strong>${documentId}</strong>)</p>` +
              `<p>Brand: ${brandDataForPrompt?.brandName || 'N/A'}</p>` +
              `<p>Scope: ${designRequestData.designScope} (${updatedCampaigns.length} campaigns)</p>` +
              `<hr/><h4>Summaries:</h4>${htmlSummaries}<hr/>` +
              `<p>Logo URL: <a href="${logoForPrompt}">${logoForPrompt}</a></p>` +
              `<p><strong><a href="${adminRequestUrl}">Click here to manage the request</a></strong></p>`, 
       }; 

      try {
        await sgMail.send(finalMsg);
        console.log(`Final SendGrid email sent successfully for doc ${documentId}.`);
        await docRef.update({ notifiedAdmin: true });
        console.log(`Firestore document ${documentId} marked as notified (final).`);
        return NextResponse.json({ success: true, message: 'Prompts generated for all campaigns and admin notified.' }); 
      } catch (emailError) {
        // Log the error and include details in the response
        console.error(`Error sending final SendGrid email for doc ${documentId}:`, emailError);
        return NextResponse.json({
          success: true, // AI part still worked
          message: 'Prompts generated, but failed to send final admin notification email.',
          error: emailError instanceof Error ? emailError.message : 'Unknown email error' // Include error message
        });
      }
      // --- End Per-Campaign AI Generation --- 

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