import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { 
  GeneratePostcardDesignParams,
  generateDesignPrompt,
  BrandData
} from '../../../services/claude';
import { getFallbackDesignCode } from '../../../services/fallback';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Remove the inline fallback function since we now have it in a separate file
// Temporary fallback code - will be replaced with actual Claude API responses once working
// const getFallbackDesignCode = (designStyle: string, brandName: string = 'Brand Name') => {
//   return `
//   ... [removed old fallback code] ...
// `;
// };

/**
 * Saves a postcard template to Firestore
 */
const savePostcardTemplate = async (
  designStyle: string, 
  code: string, 
  usedFallback: boolean = false,
  brandData: BrandData = {} as BrandData
) => {
  try {
    await addDoc(collection(db, 'postcard_template'), {
      designStyle,
      code,
      usedFallback,
      brandName: brandData.brandName || 'Unnamed Brand',
      createdAt: serverTimestamp(),
      primaryColor: brandData.primaryColor || '',
      accentColor: brandData.accentColor || '',
    });
    console.log('Postcard template saved to Firestore');
  } catch (error) {
    console.error('Error saving postcard template to Firestore:', error);
    // Don't throw - continue even if saving fails
  }
};

export async function POST(request: Request) {
  try {
    // For debugging
    console.log("API route called with Claude API Key:", process.env.CLAUDE_API_KEY ? "Key exists" : "Key missing");
    
    const params = await request.json() as GeneratePostcardDesignParams;
    console.log("Requested design style:", params.designStyle);
    
    // Check if we should use the real API or fallback
    if (!process.env.CLAUDE_API_KEY) {
      console.log("Using fallback design - Claude API key not found");
      const completion = getFallbackDesignCode(params.designStyle, params.brandData.brandName);
      
      // Save fallback template to Firestore
      await savePostcardTemplate(params.designStyle, completion, true, params.brandData);
      
      return NextResponse.json({ 
        completion, 
        success: true 
      });
    }
    
    // Try to use the real Claude API
    try {
      const prompt = generateDesignPrompt(params);
      
      // Log the prompt (showing beginning and end)
      console.log("\n==== CLAUDE PROMPT ====");
      const promptPreview = prompt.length > 500 
        ? prompt.substring(0, 250) + "...\n[middle truncated]...\n" + prompt.substring(prompt.length - 250)
        : prompt;
      console.log(promptPreview);
      console.log("==== END PROMPT ====\n");
      
      // Initialize the Anthropic client with API key from environment
      const anthropic = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
      });
      
      console.log("Calling Claude API with model: claude-3-7-sonnet-latest");
      console.log(`Token budgets: ${36000} thinking tokens, ${40000} max response tokens`);
      
      // Use streaming approach to avoid timeout with large token budgets
      const stream = await anthropic.messages.stream({
        model: "claude-3-7-sonnet-latest",
        max_tokens: 20000,
        thinking: {
          type: "enabled",
          budget_tokens: 10000
        },
        messages: [
          { role: "user", content: prompt }
        ]
      });

      // Collect content as it arrives
      console.log("Starting to stream response from Claude API");
      let fullText = "";
      
      // Process the stream
      for await (const chunk of stream) {
        // Handle content block deltas (actual text content)
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          fullText += chunk.delta.text;
          // Log progress occasionally
          if (fullText.length % 500 === 0) {
            console.log(`Received ${fullText.length} characters so far...`);
          }
        }
        
        // Log message events
        if (chunk.type === 'message_start') {
          console.log("Message started");
        } else if (chunk.type === 'message_stop') {
          console.log("Message completed");
        }
      }
      
      // Get the final message once stream is complete
      const finalMessage = await stream.finalMessage();
      console.log("Stream completed, received final message");
      
      // Extract completion from the response - ensure we get all text content
      let completion = "";
      for (const block of finalMessage.content) {
        if (block.type === 'text') {
          completion += block.text;
        }
      }
      
      console.log("Claude API responded successfully with content length:", completion.length);
      
      // Log the raw response
      console.log("\n==== CLAUDE RAW RESPONSE ====");
      const completionPreview = completion.length > 1000 
        ? completion.substring(0, 500) + "...\n[middle truncated]...\n" + completion.substring(completion.length - 500)
        : completion;
      console.log(completionPreview);
      console.log("==== END RAW RESPONSE ====\n");
      
      // Diagnostic logging
      console.log("Response diagnostics:");
      console.log(`- Contains JSX tags (<div>): ${completion.includes('<div')}`);
      console.log(`- Contains React.createElement: ${completion.includes('React.createElement')}`);
      
      // Save successful template to Firestore
      await savePostcardTemplate(params.designStyle, completion, false, params.brandData);
      
      // Return the completion
      return NextResponse.json({ 
        completion, 
        success: true 
      });
    } catch (apiError) {
      console.error("\n==== CLAUDE API ERROR ====");
      console.error("Error type:", apiError?.constructor?.name);
      console.error("Error message:", apiError instanceof Error ? apiError.message : 'Unknown Claude API error');
      if (apiError instanceof Error && apiError.stack) {
        console.error("Error stack:", apiError.stack);
      }
      if (apiError instanceof Anthropic.APIError) {
        console.error("API Error details:", {
          status: apiError.status,
          message: apiError.message,
        });
      }
      console.error("==== END API ERROR ====\n");
      
      // Return fallback if API call fails
      console.log("Falling back to static design after API error");
      const completion = getFallbackDesignCode(params.designStyle, params.brandData.brandName);
      
      // Save fallback template to Firestore when API call fails
      await savePostcardTemplate(params.designStyle, completion, true, params.brandData);
      
      return NextResponse.json({ 
        completion, 
        success: true,
        usedFallback: true,
        error: apiError instanceof Error ? apiError.message : 'Unknown Claude API error'
      });
    }
  } catch (error) {
    console.error("\n==== GENERAL ERROR IN ROUTE HANDLER ====");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    console.error("==== END GENERAL ERROR ====\n");
    
    return NextResponse.json({ 
      completion: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 