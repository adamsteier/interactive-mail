/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import OpenAI from "openai";
import axios from "axios";
import FormData from "form-data";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const storage = getStorage();

// Import our functions
import { createCampaignWithLeads } from "./campaign/createCampaignWithLeads";

// Export all functions for Firebase deployment
export {
  createCampaignWithLeads
};

// Example test function (can be removed later)
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", { structuredData: true });
  response.send("Hello from Firebase!");
});

// NEW: Auto-process AI design jobs when they're queued
export const processAIDesignJob = onDocumentCreated(
  {
    document: "aiJobs/{jobId}",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 300, // 5 minutes for AI generation
    secrets: ["OPENAI_API_KEY", "IDEOGRAM_API_KEY"],
  },
  async (event) => {
    const jobId = event.params.jobId;
    const jobData = event.data?.data();

    if (!jobData) {
      logger.error(`No data found for job ${jobId}`);
      return;
    }

    // Only process queued jobs
    if (jobData.status !== "queued") {
      logger.info(`Job ${jobId} is not queued (status: ${jobData.status}), skipping`);
      return;
    }

    logger.info(`Auto-processing AI design job: ${jobId}`);

    try {
      // Update status to generating
      await db.collection("aiJobs").doc(jobId).update({
        status: "generating",
        progress: 10,
        startedAt: new Date(),
      });

      // Get brand data
      const brandDoc = await db
        .collection("users")
        .doc(jobData.userId)
        .collection("brands")
        .doc(jobData.brandId)
        .get();

      if (!brandDoc.exists) {
        throw new Error("Brand not found");
      }

      const brandData = brandDoc.data();

      // Update progress
      await db.collection("aiJobs").doc(jobId).update({ progress: 20 });

      // Create enhanced prompt using existing logic
      const prompt = createV2PostcardPrompt(jobData.requestData, brandData, jobData.logoSpace);

      logger.info(`Generated prompt for job ${jobId}: ${prompt.substring(0, 200)}...`);

      // Update progress
      await db.collection("aiJobs").doc(jobId).update({ 
        progress: 30,
        prompt: prompt 
      });

      // Generate two OpenAI variants with slightly different approaches
      const [openaiResult1, openaiResult2] = await Promise.allSettled([
        generateWithOpenAI(prompt + "\n\nApproach: Create a modern, bold design with strong visual impact."),
        generateWithOpenAI(prompt + "\n\nApproach: Create a clean, professional design with classic appeal."),
      ]);

      // Log the results for debugging
      logger.info(`OpenAI result 1 status: ${openaiResult1.status}`);
      if (openaiResult1.status === "rejected") {
        logger.error(`OpenAI error 1: ${openaiResult1.reason}`);
      }
      
      logger.info(`OpenAI result 2 status: ${openaiResult2.status}`);
      if (openaiResult2.status === "rejected") {
        logger.error(`OpenAI error 2: ${openaiResult2.reason}`);
      }

      // Update progress
      await db.collection("aiJobs").doc(jobId).update({ progress: 80 });

      // Process results
      const results: any = {
        logoPosition: {
          x: jobData.logoSpace?.position?.x || 0,
          y: jobData.logoSpace?.position?.y || 0,
          width: jobData.logoSpace?.width || 1.5,
          height: jobData.logoSpace?.height || 0.8,
        }
      };

      // Process OpenAI result 1 (Modern/Bold)
      if (openaiResult1.status === "fulfilled") {
        try {
          // Download and store the image
          const storedImageUrl = await downloadAndStoreImage(
            openaiResult1.value.imageUrl,
            jobData.campaignId,
            jobData.designId,
            "openai",
            jobData.userId,
            jobData.requestData?.briefId
          );
          
          results.openai = {
            frontImageUrl: storedImageUrl,
            prompt: prompt + "\n\nApproach: Create a modern, bold design with strong visual impact.",
            model: "gpt-image-1",
            executionTime: openaiResult1.value.executionTime,
          };
        } catch (storageError) {
          logger.error("Failed to store OpenAI image 1:", storageError);
          // Fall back to original URL if storage fails
          results.openai = {
            frontImageUrl: openaiResult1.value.imageUrl,
            prompt: prompt + "\n\nApproach: Create a modern, bold design with strong visual impact.",
            model: "gpt-image-1",
            executionTime: openaiResult1.value.executionTime,
            storageError: "Failed to store image permanently",
          };
        }
      } else {
        results.openai = {
          frontImageUrl: "",
          prompt: prompt + "\n\nApproach: Create a modern, bold design with strong visual impact.",
          model: "gpt-image-1",
          executionTime: 0,
          error: String(openaiResult1.reason?.message || "OpenAI generation failed"),
        };
      }

      // Process OpenAI result 2 (Clean/Professional) - store as ideogram for compatibility
      if (openaiResult2.status === "fulfilled") {
        try {
          // Download and store the image
          const storedImageUrl = await downloadAndStoreImage(
            openaiResult2.value.imageUrl,
            jobData.campaignId,
            jobData.designId,
            "openai2",
            jobData.userId,
            jobData.requestData?.briefId
          );
          
          results.ideogram = {
            frontImageUrl: storedImageUrl,
            prompt: prompt + "\n\nApproach: Create a clean, professional design with classic appeal.",
            styleType: "GENERAL",
            renderingSpeed: "DEFAULT",
            executionTime: openaiResult2.value.executionTime,
          };
        } catch (storageError) {
          logger.error("Failed to store OpenAI image 2:", storageError);
          // Fall back to original URL if storage fails
          results.ideogram = {
            frontImageUrl: openaiResult2.value.imageUrl,
            prompt: prompt + "\n\nApproach: Create a clean, professional design with classic appeal.",
            styleType: "GENERAL",
            renderingSpeed: "DEFAULT",
            executionTime: openaiResult2.value.executionTime,
            storageError: "Failed to store image permanently",
          };
        }
      } else {
        results.ideogram = {
          frontImageUrl: "",
          prompt: prompt + "\n\nApproach: Create a clean, professional design with classic appeal.",
          styleType: "GENERAL",
          renderingSpeed: "DEFAULT",
          executionTime: 0,
          error: String(openaiResult2.reason?.message || "OpenAI generation 2 failed"),
        };
      }

      // Log the results structure for debugging
      logger.info("Results structure before save:", JSON.stringify(results, null, 2));
      
      // Final update - mark as complete
      await db.collection("aiJobs").doc(jobId).update({
        status: "complete",
        progress: 100,
        completedAt: FieldValue.serverTimestamp(),
        result: results,
      });

      // Update campaign design status
      if (jobData.campaignId && jobData.designId) {
        await db.collection("campaigns").doc(jobData.campaignId).update({
          [`designs.${jobData.designId}.status`]: "complete",
          [`designs.${jobData.designId}.result`]: results,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      logger.info(`Successfully completed AI design job: ${jobId}`);

    } catch (error) {
      logger.error(`Error processing AI design job ${jobId}:`, error);

      // Update job with error
      await db.collection("aiJobs").doc(jobId).update({
        status: "failed",
        error: error instanceof Error ? error.message : String(error || "Unknown error"),
        completedAt: FieldValue.serverTimestamp(),
      });

      // Update campaign design status
      if (jobData.campaignId && jobData.designId) {
        await db.collection("campaigns").doc(jobData.campaignId).update({
          [`designs.${jobData.designId}.status`]: "failed",
          [`designs.${jobData.designId}.error`]: error instanceof Error 
            ? error.message 
            : String(error || "Unknown error"),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
);

// V2 Enhanced Postcard Prompt Generation
function createV2PostcardPrompt(requestData: any, brandData: any, logoSpace: any): string {
  const { 
    voice, 
    goal, 
    industry, 
    audience, 
    businessDescription,
    customHeadline,
    customCTA,
    imageDescription,
    stylePreference,
    colorMood,
    elementsToExclude,
    customPromptAdditions
  } = requestData;

  // Build comprehensive postcard prompt
  let prompt = "Create the PRINTED CONTENT for a professional direct mail postcard " +
    "(6x4 inch landscape) that will be mailed to potential customers.\n\n" +
    "CRITICAL: This is NOT an image OF a postcard sitting on a surface. " +
    "This IS the actual postcard content that will be printed and mailed.\n\n" +
    "POSTCARD CONTEXT: This is promotional content that recipients " +
    `will receive in their mailbox to promote a ${industry} business. ` +
    "It must grab attention and drive action.\n\n" +
    `LOGO SPACE: ${logoSpace.promptInstructions}\n\n` +
    "BRAND GUIDELINES:";

  // Add brand name
  if (brandData.name?.trim()) {
    prompt += `\nBrand name: ${brandData.name.trim()}`;
  }

  // Add brand description if available
  if (brandData.description?.trim()) {
    prompt += `\nBrand description: ${brandData.description.trim()}`;
  }

  // Add business type if available
  if (brandData.businessInfo?.type?.trim()) {
    prompt += `\nBusiness type: ${brandData.businessInfo.type.trim()}`;
  }

  // Add brand colors from V2 brand structure
  if (brandData.logo?.colors?.extracted?.palette) {
    const colors = brandData.logo.colors.extracted.palette.slice(0, 3);
    prompt += `\nBrand colors: ${colors.join(", ")}`;
  }

  if (brandData.styleComponents?.primaryColor?.trim()) {
    prompt += `\nPrimary brand color: ${brandData.styleComponents.primaryColor.trim()}`;
  }
  if (brandData.styleComponents?.secondaryColor?.trim()) {
    prompt += `\nSecondary brand color: ${brandData.styleComponents.secondaryColor.trim()}`;
  }

  // Add brand identity information
  if (brandData.identity?.tagline?.trim()) {
    prompt += `\nTagline: ${brandData.identity.tagline.trim()}`;
  }
  if (brandData.identity?.voice?.trim()) {
    prompt += `\nBrand voice: ${brandData.identity.voice.trim()}`;
  }
  if (brandData.identity?.valueProposition?.trim()) {
    prompt += `\nValue proposition: ${brandData.identity.valueProposition.trim()}`;
  }

  // Add all contact information
  if (brandData.businessInfo?.phone?.trim()) {
    prompt += `\nPhone: ${brandData.businessInfo.phone.trim()}`;
  }
  if (brandData.businessInfo?.email?.trim()) {
    prompt += `\nEmail: ${brandData.businessInfo.email.trim()}`;
  }
  if (brandData.businessInfo?.website?.trim()) {
    prompt += `\nWebsite: ${brandData.businessInfo.website.trim()}`;
  }
  if (brandData.businessInfo?.address?.trim()) {
    prompt += `\nAddress: ${brandData.businessInfo.address.trim()}`;
  }

  // Add all social media information
  if (brandData.socialMedia?.instagram?.trim()) {
    prompt += `\nInstagram: ${brandData.socialMedia.instagram.trim()}`;
  }
  if (brandData.socialMedia?.facebook?.trim()) {
    prompt += `\nFacebook: ${brandData.socialMedia.facebook.trim()}`;
  }
  if (brandData.socialMedia?.linkedin?.trim()) {
    prompt += `\nLinkedIn: ${brandData.socialMedia.linkedin.trim()}`;
  }
  if (brandData.socialMedia?.twitter?.trim()) {
    prompt += `\nTwitter/X: ${brandData.socialMedia.twitter.trim()}`;
  }
  if (brandData.socialMedia?.tiktok?.trim()) {
    prompt += `\nTikTok: ${brandData.socialMedia.tiktok.trim()}`;
  }
  if (brandData.socialMedia?.youtube?.trim()) {
    prompt += `\nYouTube: ${brandData.socialMedia.youtube.trim()}`;
  }

  prompt += `\nTone: ${voice}
Target audience: ${audience}`;

  // Always use creative brief style - check if this is a structured creative brief or simple goal
  const isStructuredBrief = 
    (requestData.briefId && requestData.briefId.length > 0) ||
    (goal && goal.includes("[CREATIVE_BRIEF_ID:")) ||
    (goal && goal.length > 100 && (
      goal.includes("postcard") || 
      goal.includes("design") || 
      goal.includes("headline") || 
      goal.includes("call-to-action") ||
      goal.includes("CTA")
    ));

  if (isStructuredBrief) {
    // Log detection method for debugging
    const detectionMethod = requestData.briefId ? "briefId field" : 
      (goal && goal.includes("[CREATIVE_BRIEF_ID:")) ? "text marker" : "heuristic";
    const briefInfo = requestData.briefId ? ` (ID: ${requestData.briefId})` : "";
    logger.info(`Structured creative brief detected using: ${detectionMethod}${briefInfo}`);
    
    // Use the full creative brief as the primary directive
    prompt += `\n\nCREATIVE BRIEF:\n${goal}`;
  } else {
    // Convert simple goal to creative brief format
    prompt += `\n\nCREATIVE BRIEF:\n${goal}`;
  }
  
  if (businessDescription) {
    prompt += `\n\nBusiness context: ${businessDescription}`;
  }
  
  prompt += "\n\nADDITIONAL TECHNICAL REQUIREMENTS:";

  // Handle headline - only add if custom headline provided
  if (customHeadline) {
    prompt += `\nHeadline: "${customHeadline}"`;
  }

  // Handle CTA - only add if custom CTA provided
  if (customCTA) {
    prompt += `\nCall-to-action: "${customCTA}"`;
  }

  // Contact information and social media are now included in BRAND GUIDELINES section above
  // No need to duplicate them here since all brand info is already included

  // Image requirements
  if (imageDescription) {
    prompt += `\nImagery: ${imageDescription}`;
  } else if (!isStructuredBrief) {
    prompt += `\nImagery: High-quality, professional images relevant to ${industry} that appeal to ${audience}`;
  }

  // Style preferences
  if (stylePreference) {
    prompt += `\nStyle: ${stylePreference}`;
  }

  if (colorMood) {
    prompt += `\nColor mood: ${colorMood}`;
  }

  prompt += `

TECHNICAL REQUIREMENTS:
- 6x4 inch landscape orientation optimized for print
- 300 DPI quality with 0.125" bleed on all sides
- Full-bleed design that extends to all edges of the print area
- Modern typography that's readable when printed
- Professional layout with proper hierarchy
- Ensure all text is large enough to read in mail format
- Use the latest image generation capabilities for sharp, clear text

CRITICAL DESIGN PRINCIPLES:
- This postcard will be physically mailed, so it must stand out in a mailbox
- Create the actual postcard CONTENT, not an image of a postcard object
- NO borders, frames, or postcard-like edges in the design
- NO table surfaces, shadows, or environmental backgrounds
- The design IS the postcard - it fills the entire frame
- Include enough white space for readability
- Make the most important information (headline, CTA) most prominent
- Ensure contact information is clearly visible but not overwhelming
- Create visual appeal that makes recipients want to keep the postcard

AVOID COMPLETELY:
- Images showing postcards as physical objects
- Postcard frames, borders, or 3D effects
- Table surfaces or environmental contexts
- Drop shadows around the entire design
- Any representation of the postcard as an item sitting on something`;

  // Elements to exclude
  if (elementsToExclude && elementsToExclude.length > 0) {
    prompt += `\n\nAVOID: ${elementsToExclude.join(", ")}`;
  }

  // Custom additions
  if (customPromptAdditions) {
    prompt += `\n\nADDITIONAL REQUIREMENTS: ${customPromptAdditions}`;
  }

  return prompt;
}

// Original Generate Postcard Design Function (V1)
export const generatePostcardDesign = onCall(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: ["OPENAI_API_KEY", "IDEOGRAM_API_KEY"],
  },
  async (request: CallableRequest) => {
    const { auth: authContext, data } = request;
    
    // Authentication check
    if (!authContext) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { campaignId, designId, brandId, formData } = data;

    if (!campaignId || !designId || !brandId || !formData) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: campaignId, designId, brandId, formData"
      );
    }

    try {
      // Start timing
      const startTime = Date.now();

      // Validate campaign ownership
      const campaignDoc = await db
        .collection("campaigns")
        .doc(campaignId)
        .get();

      if (!campaignDoc.exists) {
        throw new HttpsError("not-found", "Campaign not found");
      }

      const campaignData = campaignDoc.data();
      if (campaignData?.ownerUid !== authContext.uid) {
        throw new HttpsError("permission-denied", "Not authorized to modify this campaign");
      }

      // Get brand data
      const brandDoc = await db
        .collection("users")
        .doc(authContext.uid)
        .collection("brands")
        .doc(brandId)
        .get();

      if (!brandDoc.exists) {
        throw new HttpsError("not-found", "Brand not found");
      }

      const brandData = brandDoc.data();

      // Set up AI generation status document
      const statusDoc = db
        .collection("campaigns")
        .doc(campaignId)
        .collection("generationStatus")
        .doc(designId);

      // Update status to generating
      await statusDoc.set({
        status: "generating",
        progress: 0,
        startedAt: new Date(),
        jobId: `${campaignId}_${designId}_${Date.now()}`,
      });

      // Create the prompt
      const prompt = createPostcardPrompt(formData, brandData);

      // Progress update helper
      const updateProgress = async (progress: number, message?: string) => {
        await statusDoc.update({
          progress,
          lastUpdated: new Date(),
          ...(message && { message }),
        });
      };

      // Initialize results
      const results: {
        openai?: {
          frontImageUrl?: string;
          executionTime?: number;
          error?: string;
        };
        ideogram?: {
          frontImageUrl?: string;
          executionTime?: number;
          error?: string;
        };
      } = {};

      // Generate with both providers in parallel
      await updateProgress(20, "Starting AI generation...");

      const [openaiResult, ideogramResult] = await Promise.allSettled([
        generateWithOpenAI(prompt),
        generateWithIdeogram(prompt),
      ]);

      // Process OpenAI result
      if (openaiResult.status === "fulfilled") {
        results.openai = {
          frontImageUrl: openaiResult.value.imageUrl,
          executionTime: openaiResult.value.executionTime,
        };
      } else {
        results.openai = {
          error: openaiResult.reason?.message || "OpenAI generation failed",
        };
      }

      // Process Ideogram result
      if (ideogramResult.status === "fulfilled") {
        results.ideogram = {
          frontImageUrl: ideogramResult.value.imageUrl,
          executionTime: ideogramResult.value.executionTime,
        };
      } else {
        results.ideogram = {
          error: ideogramResult.reason?.message || "Ideogram generation failed",
        };
      }

      await updateProgress(90, "Processing results...");

      // Update final status
      await statusDoc.update({
        status: "complete",
        progress: 100,
        completedAt: new Date(),
        result: results,
        totalExecutionTime: Date.now() - startTime,
      });

      return {
        success: true,
        designId,
        results,
        executionTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error("Error generating postcard design:", error);
      
      // Update error status
      await db
        .collection("campaigns")
        .doc(campaignId)
        .collection("generationStatus")
        .doc(designId)
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        });

      throw new HttpsError("internal", "Failed to generate design");
    }
  }
);

// Helper function to download and store image in Firebase Storage
async function downloadAndStoreImage(
  imageUrl: string, 
  campaignId: string, 
  designId: string, 
  provider: "openai" | "ideogram" | "openai2",
  userId: string,
  briefId?: string | null
): Promise<string> {
  try {
    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    
    // Generate a unique filename following V2 structure
    const timestamp = Date.now();
    const filename = `v2/${userId}/campaigns/${campaignId}/previews/${provider}_${designId}_${timestamp}.png`;
    
    // Get a reference to the file in Firebase Storage
    const bucket = storage.bucket();
    logger.info(`Storage bucket name: ${bucket.name}`);
    const file = bucket.file(filename);
    
    // Upload the image
    await file.save(Buffer.from(response.data), {
      metadata: {
        contentType: "image/png",
        metadata: {
          campaignId,
          designId,
          provider,
          userId,
          generatedAt: new Date().toISOString(),
          briefId: briefId || "none",
          hasBrief: !!briefId,
        },
      },
    });
    
    // File is already publicly readable according to your rules
    // No need to make it public explicitly
    
    // Return the public URL using Firebase Storage URL format
    const encodedFilename = encodeURIComponent(filename);
    // Get the default bucket name which should be {projectId}.appspot.com
    const bucketName = bucket.name || `${process.env.GCLOUD_PROJECT || "post-timely-94681"}.appspot.com`;
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFilename}?alt=media`;
  } catch (error) {
    logger.error(`Error downloading/storing image from ${provider}:`, error);
    throw error;
  }
}

// OpenAI Generation Function - Updated for gpt-image-1
async function generateWithOpenAI(prompt: string): Promise<{
  imageUrl: string;
  executionTime: number;
}> {
  const openaiStartTime = Date.now();
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set in environment variables");
    }
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      size: "1536x1024", // 3:2 aspect ratio, perfect for 6x4 postcards
      quality: "high", // Changed from "hd" to "high" for gpt-image-1
      n: 1,
    });

    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error("No image data returned from OpenAI gpt-image-1");
    }

    // gpt-image-1 can return either URL or base64 depending on configuration
    let imageUrl: string;
    if (imageData.b64_json) {
      // Convert base64 to data URL for frontend display
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    } else if (imageData.url) {
      // Use direct URL if available
      imageUrl = imageData.url;
    } else {
      throw new Error("No image URL or base64 data returned from OpenAI gpt-image-1");
    }

    return {
      imageUrl,
      executionTime: Date.now() - openaiStartTime,
    };
  } catch (error) {
    console.error("OpenAI gpt-image-1 generation error:", error);
    throw error;
  }
}

// Ideogram Generation Function - Updated for Ideogram 3.0
async function generateWithIdeogram(prompt: string): Promise<{
  imageUrl: string;
  executionTime: number;
}> {
  const ideogramStartTime = Date.now();
  
  try {
    if (!process.env.IDEOGRAM_API_KEY) {
      throw new Error("IDEOGRAM_API_KEY is not set in environment variables");
    }
    
    // Create form data for Ideogram v3 API
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("aspect_ratio", "3x2"); // 6x4 postcard ratio (note: x not colon)
    formData.append("rendering_speed", "DEFAULT"); // Balance between speed and quality
    formData.append("negative_prompt", "low quality, blurry, distorted, watermark, text cutoff, poor composition");
    formData.append("num_images", "1");
    formData.append("style_type", "GENERAL"); // For professional marketing postcards
    
    const response = await axios.post(
      "https://api.ideogram.ai/v1/ideogram-v3/generate",
      formData,
      {
        headers: {
          "Api-Key": process.env.IDEOGRAM_API_KEY,
          ...formData.getHeaders(),
        },
      }
    ).catch(error => {
      // Log more details about the Ideogram error
      if (error.response) {
        logger.error("Ideogram API error response:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      }
      throw error;
    });

    const imageUrl = response.data?.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL returned from Ideogram 3.0");
    }

    return {
      imageUrl,
      executionTime: Date.now() - ideogramStartTime,
    };
  } catch (error) {
    console.error("Ideogram 3.0 generation error:", error);
    throw error;
  }
}

// Enhanced Postcard Prompt Generation
function createPostcardPrompt(formData: any, brandData: any): string {
  const { 
    voice, 
    goal, 
    industry, 
    audience, 
    customHeadline,
    customCTA,
    imageDescription,
    stylePreference,
    colorMood,
    elementsToExclude,
    customPromptAdditions
  } = formData;

  // Calculate logo space based on brand data
  const logoSpace = calculateLogoSpace(brandData);
  
  // Build comprehensive postcard prompt
  let prompt = "Create a professional direct mail promotional postcard design " +
    "(6x4 inch landscape) that will be mailed to potential customers.\n\n" +
    "POSTCARD CONTEXT: This is a promotional postcard that recipients " +
    `will receive in their mailbox to promote a ${industry} business. ` +
    "It must grab attention and drive action.\n\n" +
    `LOGO SPACE: ${logoSpace.promptInstructions}\n\n` +
    "BRAND GUIDELINES:";

  // Add brand colors
  if (brandData.colors?.primary) {
    prompt += `\nPrimary brand color: ${brandData.colors.primary}`;
  }
  if (brandData.colors?.secondary) {
    prompt += `\nSecondary brand color: ${brandData.colors.secondary}`;
  }
  if (brandData.colors?.accent) {
    prompt += `\nAccent color: ${brandData.colors.accent}`;
  }

  prompt += `\nTone: ${voice}
Target audience: ${audience}
Campaign goal: ${goal}

CONTENT REQUIREMENTS:`;

  // Handle headline
  if (customHeadline) {
    prompt += `\nHeadline: "${customHeadline}"`;
  } else {
    prompt += `\nGenerate an attention-grabbing headline that appeals to ${audience} and promotes the ${goal}`;
  }

  // Handle CTA - ALWAYS ensure there's a CTA
  if (customCTA) {
    prompt += `\nCall-to-action: "${customCTA}"`;
  } else {
    prompt += "\nGenerate a compelling call-to-action button/text that encourages " +
      "immediate response (examples: \"Call Now\", \"Visit Today\", \"Book Online\", \"Get Started\", \"Save Now\")";
  }

  // Contact information requirement
  prompt += "\nContact info: Include placeholder areas for phone number, website, " +
    "and address in an attractive, readable layout";

  // Image requirements
  if (imageDescription) {
    prompt += `\nImagery: ${imageDescription}`;
  } else {
    prompt += `\nImagery: High-quality, professional images relevant to ${industry} that appeal to ${audience}`;
  }

  // Style preferences
  if (stylePreference) {
    prompt += `\nStyle: ${stylePreference}`;
  }

  if (colorMood) {
    prompt += `\nColor mood: ${colorMood}`;
  }

  prompt += `

TECHNICAL REQUIREMENTS:
- 6x4 inch landscape orientation optimized for print
- 300 DPI quality with 0.125" bleed on all sides
- Full-bleed design that extends to all edges of the print area
- Modern typography that's readable when printed
- Professional layout with proper hierarchy
- Ensure all text is large enough to read in mail format
- Use the latest image generation capabilities for sharp, clear text

CRITICAL DESIGN PRINCIPLES:
- This postcard will be physically mailed, so it must stand out in a mailbox
- Create the actual postcard CONTENT, not an image of a postcard object
- NO borders, frames, or postcard-like edges in the design
- NO table surfaces, shadows, or environmental backgrounds
- The design IS the postcard - it fills the entire frame
- Include enough white space for readability
- Make the most important information (headline, CTA) most prominent
- Ensure contact information is clearly visible but not overwhelming
- Create visual appeal that makes recipients want to keep the postcard

AVOID COMPLETELY:
- Images showing postcards as physical objects
- Postcard frames, borders, or 3D effects
- Table surfaces or environmental contexts
- Drop shadows around the entire design
- Any representation of the postcard as an item sitting on something`;

  // Elements to exclude
  if (elementsToExclude && elementsToExclude.length > 0) {
    prompt += `\n\nAVOID: ${elementsToExclude.join(", ")}`;
  }

  // Custom additions
  if (customPromptAdditions) {
    prompt += `\n\nADDITIONAL REQUIREMENTS: ${customPromptAdditions}`;
  }

  return prompt;
}

// Calculate logo space requirements
function calculateLogoSpace(brandData: any): { promptInstructions: string } {
  // Default logo space calculation
  const logoWidth = 1.5; // inches
  const logoHeight = 1.0; // inches
  
  // Determine background requirement from brand colors
  let backgroundRequirement = "light colored or white";
  
  // If we have brand colors, check if logo needs dark background
  if (brandData.colors?.primary) {
    const primaryColor = brandData.colors.primary.toLowerCase();
    // Simple check for dark colors
    if (primaryColor.includes("black") || primaryColor.includes("#000") || 
        primaryColor.includes("#1a1a1a") || primaryColor.includes("#2f2f2f")) {
      backgroundRequirement = "dark colored";
    }
  }
  
  let instructions = `Reserve a ${logoWidth} x ${logoHeight} inch ${backgroundRequirement} space ` +
    "in the top-left corner for logo placement. Ensure this area has minimal visual elements " +
    "and excellent contrast for logo visibility.";
  
  // Add color avoidance if we have brand colors
  if (brandData.colors?.primary || brandData.colors?.secondary) {
    const colorsToAvoid = [];
    if (brandData.colors.primary) colorsToAvoid.push(brandData.colors.primary);
    if (brandData.colors.secondary) colorsToAvoid.push(brandData.colors.secondary);
    if (brandData.colors.accent) colorsToAvoid.push(brandData.colors.accent);
    
    if (colorsToAvoid.length > 0) {
      instructions += ` Avoid using these exact brand colors in the logo area: ${colorsToAvoid.join(", ")}.`;
    }
  }
  
  return { promptInstructions: instructions };
}

// Get Generation Status Function
export const getGenerationStatus = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request: CallableRequest) => {
    const { auth: authContext, data } = request;
    
    if (!authContext) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { campaignId, designId } = data;

    if (!campaignId || !designId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required fields: campaignId, designId"
      );
    }

    try {
      const statusDoc = await db
        .collection("campaigns")
        .doc(campaignId)
        .collection("generationStatus")
        .doc(designId)
        .get();

      if (!statusDoc.exists) {
        return {
          status: "not-found",
          progress: 0,
        };
      }

      return statusDoc.data();
    } catch (error) {
      console.error("Error getting generation status:", error);
      throw new HttpsError("internal", "Failed to get generation status");
    }
  }
);
