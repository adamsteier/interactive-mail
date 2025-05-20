/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

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
