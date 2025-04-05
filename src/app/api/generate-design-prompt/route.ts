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

export async function POST(req: Request) {
  console.log("Received request for /api/generate-design-prompt");

  try {
    // 1. Parse request body
    // Expecting something like { documentId: string } or the full data object
    const body = await req.json();
    const { documentId, /* potentially other data if not just passing ID */ } = body;
    console.log("Request body:", body);

    if (!documentId) {
      // Or handle case where full data is passed directly
      console.error('Document ID is missing from the request body');
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    // 2. Fetch data from Firestore (if only ID was passed)
    console.log(`Fetching data for document: ${documentId}`);
    const docRef = dbAdmin.collection('design_requests').doc(documentId); // Use dbAdmin
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      console.error(`Document ${documentId} not found in Firestore.`);
      return NextResponse.json({ error: 'Design request not found' }, { status: 404 });
    }
    const designRequestData = docSnap.data();
    console.log("Fetched data:", designRequestData);
    // Placeholder data (remove this block once fetch is working):
    // const designRequestData = { 
    //   userInputData: { brandName: 'Test Brand', ...body }, // Simulating fetched data
    //   logoUrl: 'http://example.com/logo.png',
    //   status: 'pending_prompt' 
    // };

    // Check if data is valid
    if (!designRequestData || !designRequestData.userInputData || !designRequestData.logoUrl) {
      console.error(`Incomplete data found for document ${documentId}.`);
      return NextResponse.json({ error: 'Incomplete design request data' }, { status: 400 });
    }

    // 3. Call OpenAI API (gpt-4o-latest)
    console.log("Calling OpenAI API...");
    const userInputs = designRequestData.userInputData;
    const logoForPrompt = designRequestData.logoUrl;

    // Construct the prompt for GPT-4o
    const aiPrompt = `
      You are an expert marketing assistant helping generate postcard image prompts and summaries for a human designer.
      Based on the following user requirements and logo URL, generate:
      1. A detailed, creative image generation prompt suitable for a model like DALL-E or Midjourney to create a compelling postcard background image.
      2. A concise summary (2-3 sentences) for a human graphic designer highlighting the key objectives, target audience, and brand style to guide their final review and potential edits.
      
      User Requirements:
      - Brand Name: ${userInputs.brandData?.brandName}
      - Logo URL: ${logoForPrompt}
      - Brand Style Preferences: ${userInputs.brandData?.stylePreferences?.join(', ')}
      - Primary Color: ${userInputs.brandData?.primaryColor}
      - Accent Color: ${userInputs.brandData?.accentColor}
      - Marketing Objectives: ${userInputs.marketingData?.objectives?.join(', ')}
      - Call To Action: ${userInputs.marketingData?.callToAction}
      - Target Audience Industry: ${userInputs.audienceData?.industry}
      - Target Audience Description: ${userInputs.audienceData?.targetDescription}
      - Desired Image Styles: ${userInputs.visualData?.imageStyle?.join(', ')}
      - Primary Image Subject: ${userInputs.visualData?.imagePrimarySubject}
      - Desired Layout Style: ${userInputs.visualData?.layoutStyle}
      - Extra Info/Notes: ${userInputs.businessData?.extraInfo}
      
      Please provide the output STRICTLY in the following JSON format:
      
      {
        "imagePrompt": "[Detailed image generation prompt here]",
        "adminSummary": "[Concise summary for human designer here]"
      }
      `;

    let aiGeneratedPrompt = '';
    let aiSummary = '';

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-latest", // Ensure this model is available/correct
        messages: [{ role: "user", content: aiPrompt }],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('No response content from OpenAI');
      }

      console.log("Raw OpenAI response:", responseContent);
      const parsedResponse = JSON.parse(responseContent);
      
      aiGeneratedPrompt = parsedResponse.imagePrompt;
      aiSummary = parsedResponse.adminSummary;

      if (!aiGeneratedPrompt || !aiSummary) {
        throw new Error('AI response missing required fields (imagePrompt or adminSummary).');
      }
      console.log("Successfully parsed AI response.");
      console.log("Generated Prompt:", aiGeneratedPrompt);
      console.log("Admin Summary:", aiSummary);

    } catch (aiError) {
      console.error("Error calling OpenAI or parsing response:", aiError);
      // Return an error response to the client
      return NextResponse.json({ error: 'Failed to generate prompt via AI', details: aiError instanceof Error ? aiError.message : 'Unknown AI error' }, { status: 500 });
    }

    // 4. Update Firestore document with actual AI results
    console.log(`Updating Firestore document ${documentId} with AI results.`);
    await docRef.update({ // Use docRef obtained earlier
      aiGeneratedPrompt: aiGeneratedPrompt, // Use extracted value
      aiSummary: aiSummary,             // Use extracted value
      status: 'pending_review',
    });
    console.log("Firestore document updated successfully with AI results.");

    // 5. Send SendGrid Notification
    console.log("Attempting to send notification email via SendGrid...");

    // --- Construct Admin Link ---
    // TODO: Replace with environment variable for production
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; 
    const adminRequestUrl = `${appBaseUrl}/admin/requests/${documentId}`;
    // --- End Admin Link ---

    const msg = {
      to: 'adam@posttimely.com', // Your admin email
      from: 'adam@posttimely.com', // Your verified SendGrid sender
      subject: `New Design Request Ready for Review: ${designRequestData.userInputData.brandData?.brandName || documentId}`,
      // Text version with the link
      text: `A new design request needs review for document ID: ${documentId}\n\n` +
            `Brand: ${designRequestData.userInputData.brandData?.brandName || 'N/A'}\n\n` +
            `AI Generated Prompt:\n${aiGeneratedPrompt}\n\n` +
            `AI Summary for Admin:\n${aiSummary}\n\n` +
            `Logo URL: ${designRequestData.logoUrl}\n\n` +
            `Manage Request: ${adminRequestUrl}`,
      // HTML version for a clickable link
      html: `<p>A new design request needs review for document ID: <strong>${documentId}</strong></p>` +
            `<p>Brand: ${designRequestData.userInputData.brandData?.brandName || 'N/A'}</p>` +
            `<p><strong>AI Generated Prompt:</strong><br/>${aiGeneratedPrompt.replace(/\n/g, '<br/>')}</p>` +
            `<p><strong>AI Summary for Admin:</strong><br/>${aiSummary.replace(/\n/g, '<br/>')}</p>` +
            `<p>Logo URL: <a href="${designRequestData.logoUrl}">${designRequestData.logoUrl}</a></p>` +
            `<p><strong><a href="${adminRequestUrl}">Click here to manage the request</a></strong></p>`,
    };

    try {
      await sgMail.send(msg);
      console.log('SendGrid email sent successfully.');
      
      // 6. Update Firestore document: mark as notified
      try {
          await docRef.update({ notifiedAdmin: true });
          console.log(`Firestore document ${documentId} marked as notified.`);
      } catch (updateError) {
          console.error(`Failed to mark document ${documentId} as notified after sending email:`, updateError);
          // Log this error, but don't necessarily fail the whole request just because the final flag update failed.
      }

    } catch (emailError: unknown) {
      console.error('Error sending SendGrid email:', emailError);
      // Type check for SendGrid specific error structure
      let sendGridBody = 'Unknown SendGrid error details';
      if (
        emailError && 
        typeof emailError === 'object' && 
        'response' in emailError && 
        emailError.response && 
        typeof emailError.response === 'object' && 
        'body' in emailError.response
      ) {
        // Now we know response and body exist, but body could be anything
        sendGridBody = JSON.stringify((emailError as { response: { body: unknown } }).response.body);
        console.error('SendGrid Response Error Body:', sendGridBody);
      }
      
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown email sending error';
      // Optionally include sendGridBody in the error response for debugging
      // console.error('SendGrid Response Error:', sendGridBody); 
      // Consider adding a status like 'pending_review_notification_failed' ?
      return NextResponse.json({ 
          success: true, // Indicate main task (AI gen) succeeded
          message: 'Prompt generated, but failed to send admin notification email.', 
          emailError: errorMessage, 
          sendGridDetails: sendGridBody // Optionally return details
      }); 
    }
    
    // 7. Return success response
    console.log("API route execution successful.");
    return NextResponse.json({ success: true, message: 'Prompt generated and admin notified.' });

  } catch (error) {
    console.error('Error in /api/generate-design-prompt:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Avoid leaking detailed stack traces to the client in production
    return NextResponse.json({ error: 'Failed to process design request', details: message }, { status: 500 });
  }
} 