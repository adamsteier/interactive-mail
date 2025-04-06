import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

export const maxDuration = 30; // Set max duration to 30 seconds

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { targetArea, businessName, industry, description } = await req.json();
    
    // Debug log
    console.log('Received request:', { targetArea, businessName, industry, description });
    console.log('Using OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');

    const prompt = `I am going to provide you with details about a business, and I want you to determine the most effective advertising method for them using our three available strategies. Please be as specific and granular as possible in your recommendations.

Business Information:
- Business Name: ${businessName}
- Target Area: ${targetArea}
- Industry: ${industry}
- Business Description: ${description}

Method 1: Direct Mail to Businesses
Please identify specific types of businesses that would be ideal targets. For each business type:
- Provide a specific, granular business category (e.g., "Hair Salon", "Barbershop", not "Hair Salons & Barbershops".  Just because I am providing this example, don't favor this result). List each distinct type separately.
- Estimate the number of such businesses in the target area.
- Explain why this specific type of business would benefit from the service.
- Consider various sub-categories and specializations, listing each as a separate target if appropriate. **Crucially, list each business type as a distinct entry. Do not combine multiple business types into a single target entry.**

Method 2: Database Targeting
Please identify specific databases and platforms that would be valuable. For each database:
- Name the specific database or platform
- Categorize the type of database
- Explain why it's particularly suitable
- Estimate the potential reach
- Consider both broad platforms and niche/local databases
- When relevant, specifically consider recurring data sources such as:
  * New real estate listings in the area
  * Recently sold homes
  * Building permits and construction projects
  * Other industry-relevant recurring databases
These recurring data sources are particularly valuable for businesses that can benefit from timely outreach to new opportunities.

Method 3: Mass Flyer Drop
Only recommend if other methods aren't suitable.

Please structure your response to be as granular as possible, breaking down each business type and database separately. Format your response in the following JSON structure:

{
  "recommendedMethods": ["method1", "method2"],
  "primaryRecommendation": "",
  "totalEstimatedReach": 0,
  "method1Analysis": {
    "businessTargets": [
      {
        "type": "[Industry-specific business type]",
        "estimatedReach": 0,
        "reasoning": "[Detailed explanation of why this business type is relevant]"
      }
    ],
    "overallReasoning": ""
  },
  "method2Analysis": {
    "databaseTargets": [
      {
        "name": "[Database name]",
        "type": "[Database type]",
        "reasoning": "[Why this database is relevant]",
        "estimatedReach": 0
      }
    ],
    "overallReasoning": ""
  },
  "method3Analysis": {
    "reasoning": ""
  }
}

Important: Provide specific, relevant recommendations based on the business details provided. Do not use placeholder text in your response. Each recommendation should be tailored to the specific business and industry.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "chatgpt-4o-latest",
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    return NextResponse.json({ analysis: JSON.parse(responseContent) });

  } catch (error) {
    // Enhanced error logging
    console.error('Marketing strategy error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ error: 'Failed to analyze marketing strategy' }, { status: 500 });
  }
} 