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

      // Generate with both providers in parallel
      const [openaiResult, ideogramResult] = await Promise.allSettled([
        generateWithOpenAI(prompt),
        generateWithIdeogram(prompt),
      ]);

      // Log the results for debugging
      logger.info(`OpenAI result status: ${openaiResult.status}`);
      if (openaiResult.status === "rejected") {
        logger.error(`OpenAI error: ${openaiResult.reason}`);
      }
      
      logger.info(`Ideogram result status: ${ideogramResult.status}`);
      if (ideogramResult.status === "rejected") {
        logger.error(`Ideogram error: ${ideogramResult.reason}`);
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

      // Process OpenAI result
      if (openaiResult.status === "fulfilled") {
        try {
          // Download and store the image
          const storedImageUrl = await downloadAndStoreImage(
            openaiResult.value.imageUrl,
            jobData.campaignId,
            jobData.designId,
            "openai",
            jobData.userId
          );
          
          results.openai = {
            frontImageUrl: storedImageUrl,
            originalUrl: openaiResult.value.imageUrl, // Keep original for reference
            prompt: prompt,
            model: "gpt-image-1",
            executionTime: openaiResult.value.executionTime,
          };
        } catch (storageError) {
          logger.error("Failed to store OpenAI image:", storageError);
          // Fall back to original URL if storage fails
          results.openai = {
            frontImageUrl: openaiResult.value.imageUrl,
            prompt: prompt,
            model: "gpt-image-1",
            executionTime: openaiResult.value.executionTime,
            storageError: "Failed to store image permanently",
          };
        }
      } else {
        results.openai = {
          frontImageUrl: "",
          prompt: prompt,
          model: "gpt-image-1",
          executionTime: 0,
          error: String(openaiResult.reason?.message || "OpenAI generation failed"),
        };
      }

      // Process Ideogram result
      if (ideogramResult.status === "fulfilled") {
        try {
          // Download and store the image
          const storedImageUrl = await downloadAndStoreImage(
            ideogramResult.value.imageUrl,
            jobData.campaignId,
            jobData.designId,
            "ideogram",
            jobData.userId
          );
          
          results.ideogram = {
            frontImageUrl: storedImageUrl,
            originalUrl: ideogramResult.value.imageUrl, // Keep original for reference
            prompt: prompt,
            styleType: "AUTO",
            renderingSpeed: "DEFAULT",
            executionTime: ideogramResult.value.executionTime,
          };
        } catch (storageError) {
          logger.error("Failed to store Ideogram image:", storageError);
          // Fall back to original URL if storage fails
          results.ideogram = {
            frontImageUrl: ideogramResult.value.imageUrl,
            prompt: prompt,
            styleType: "AUTO",
            renderingSpeed: "DEFAULT",
            executionTime: ideogramResult.value.executionTime,
            storageError: "Failed to store image permanently",
          };
        }
      } else {
        results.ideogram = {
          frontImageUrl: "",
          prompt: prompt,
          styleType: "AUTO", 
          renderingSpeed: "DEFAULT",
          executionTime: 0,
          error: String(ideogramResult.reason?.message || "Ideogram generation failed"),
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
  let prompt = "Create a professional direct mail promotional postcard design " +
    "(6x4 inch landscape) that will be mailed to potential customers.\n\n" +
    "POSTCARD CONTEXT: This is a promotional postcard that recipients " +
    `will receive in their mailbox to promote a ${industry} business. ` +
    "It must grab attention and drive action.\n\n" +
    `LOGO SPACE: ${logoSpace.promptInstructions}\n\n` +
    "BRAND GUIDELINES:";

  // Add brand colors from V2 brand structure
  if (brandData.logo?.colors?.extracted?.palette) {
    const colors = brandData.logo.colors.extracted.palette.slice(0, 3);
    prompt += `\nBrand colors: ${colors.join(", ")}`;
  }

  if (brandData.styleComponents?.primaryColor) {
    prompt += `\nPrimary brand color: ${brandData.styleComponents.primaryColor}`;
  }
  if (brandData.styleComponents?.secondaryColor) {
    prompt += `\nSecondary brand color: ${brandData.styleComponents.secondaryColor}`;
  }

  prompt += `\nTone: ${voice}
Target audience: ${audience}
Campaign goal: ${goal}`;

  if (businessDescription) {
    prompt += `\nBusiness context: ${businessDescription}`;
  }

  prompt += "\n\nCONTENT REQUIREMENTS:";

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
- 300 DPI quality
- Modern typography that's readable when printed
- Professional layout with proper hierarchy
- Ensure all text is large enough to read in mail format
- Use the latest image generation capabilities for sharp, clear text

DESIGN PRINCIPLES:
- This postcard will be physically mailed, so it must stand out in a mailbox
- Include enough white space for readability
- Make the most important information (headline, CTA) most prominent
- Ensure contact information is clearly visible but not overwhelming
- Create visual appeal that makes recipients want to keep the postcard`;

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
  provider: "openai" | "ideogram",
  userId: string
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
        },
      },
    });
    
    // File is already publicly readable according to your rules
    // No need to make it public explicitly
    
    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${filename}`;
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
        console.error("Ideogram API error response:", error.response.data);
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
- 300 DPI quality
- Modern typography that's readable when printed
- Professional layout with proper hierarchy
- Ensure all text is large enough to read in mail format
- Use the latest image generation capabilities for sharp, clear text

DESIGN PRINCIPLES:
- This postcard will be physically mailed, so it must stand out in a mailbox
- Include enough white space for readability
- Make the most important information (headline, CTA) most prominent
- Ensure contact information is clearly visible but not overwhelming
- Create visual appeal that makes recipients want to keep the postcard`;

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
