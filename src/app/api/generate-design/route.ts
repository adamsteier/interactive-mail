import { NextResponse } from 'next/server';
import axios from 'axios';
import { 
  GeneratePostcardDesignParams, 
  generateDesignPrompt, 
  extractComponentCode 
} from '../../../services/claude';

export async function POST(request: Request) {
  try {
    const params = await request.json() as GeneratePostcardDesignParams;
    const prompt = generateDesignPrompt(params);
    
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
          'x-api-key': process.env.CLAUDE_API_KEY || ''
        }
      }
    );
    
    // Extract component code from the Claude response
    const completion = response.data.content[0].text;
    return NextResponse.json({ 
      completion, 
      success: true 
    });
    
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return NextResponse.json({ 
      completion: '', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 