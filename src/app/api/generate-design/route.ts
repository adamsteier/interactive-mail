import { NextResponse } from 'next/server';
import axios from 'axios';
import { 
  GeneratePostcardDesignParams, 
  generateDesignPrompt, 
  extractComponentCode 
} from '../../../services/claude';

export async function POST(request: Request) {
  try {
    // For debugging
    console.log("API route called with Claude API Key:", process.env.CLAUDE_API_KEY ? "Key exists" : "Key missing");
    
    const params = await request.json() as GeneratePostcardDesignParams;
    const prompt = generateDesignPrompt(params);
    
    // Check if API key exists
    if (!process.env.CLAUDE_API_KEY) {
      console.error("Claude API key is missing");
      return NextResponse.json({ 
        completion: '', 
        success: false, 
        error: 'API key is missing in server environment' 
      }, { status: 500 });
    }
    
    try {
      // Call Claude API securely from the server
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: "claude-3-7-sonnet",
          max_tokens: 4000,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01' // Add API version header which might be required
          }
        }
      );
      
      // Extract component code from the Claude response
      const completion = response.data.content[0].text;
      return NextResponse.json({ 
        completion, 
        success: true 
      });
    } catch (apiError) {
      console.error("Claude API call failed:", apiError);
      // Return more detailed error
      return NextResponse.json({ 
        completion: '', 
        success: false, 
        error: apiError instanceof Error ? 
          `Claude API error: ${apiError.message}` : 
          'Unknown Claude API error' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error in generate-design API route:', error);
    return NextResponse.json({ 
      completion: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 