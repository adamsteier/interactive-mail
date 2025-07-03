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
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";
import axios from "axios";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

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

// Generate Postcard Design Function
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

// OpenAI Generation Function - Updated for gpt-image-1
async function generateWithOpenAI(prompt: string): Promise<{
  imageUrl: string;
  executionTime: number;
}> {
  const openaiStartTime = Date.now();
  
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: prompt,
      size: "1792x1024", // Landscape format supported by TypeScript types
      quality: "hd", // High quality setting supported by TypeScript types
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
    const response = await axios.post(
      "https://api.ideogram.ai/generate",
      {
        image_request: {
          prompt: prompt,
          model: "V_3_0", // Ideogram 3.0 latest model
          aspect_ratio: "ASPECT_3_2", // Closest to 6:4 postcard ratio
          magic_prompt_option: "AUTO", // Enhanced prompt processing
          style_type: "AUTO", // Let AI choose appropriate style
          negative_prompt: "low quality, blurry, distorted, watermark, text cutoff, poor composition"
        }
      },
      {
        headers: {
          "Api-Key": process.env.IDEOGRAM_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

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
    "POSTCARD CONTEXT: This is a promotional postcard that recipients will receive " +
    `in their mailbox to promote a ${industry} business. It must grab attention and drive action.\n\n` +
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
    prompt += `\nGenerate a compelling call-to-action button/text that encourages immediate response (examples: "Call Now", "Visit Today", "Book Online", "Get Started", "Save Now")`;
  }

  // Contact information requirement
  prompt += `\nContact info: Include placeholder areas for phone number, website, and address in an attractive, readable layout`;

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
    prompt += `\n\nAVOID: ${elementsToExclude.join(', ')}`;
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
  let backgroundRequirement = 'light colored or white';
  
  // If we have brand colors, check if logo needs dark background
  if (brandData.colors?.primary) {
    const primaryColor = brandData.colors.primary.toLowerCase();
    // Simple check for dark colors
    if (primaryColor.includes('black') || primaryColor.includes('#000') || 
        primaryColor.includes('#1a1a1a') || primaryColor.includes('#2f2f2f')) {
      backgroundRequirement = 'dark colored';
    }
  }
  
  let instructions = `Reserve a ${logoWidth} x ${logoHeight} inch ${backgroundRequirement} space in the top-left corner for logo placement. Ensure this area has minimal visual elements and excellent contrast for logo visibility.`;
  
  // Add color avoidance if we have brand colors
  if (brandData.colors?.primary || brandData.colors?.secondary) {
    const colorsToAvoid = [];
    if (brandData.colors.primary) colorsToAvoid.push(brandData.colors.primary);
    if (brandData.colors.secondary) colorsToAvoid.push(brandData.colors.secondary);
    if (brandData.colors.accent) colorsToAvoid.push(brandData.colors.accent);
    
    if (colorsToAvoid.length > 0) {
      instructions += ` Avoid using these exact brand colors in the logo area: ${colorsToAvoid.join(', ')}.`;
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
