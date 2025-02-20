import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { targetArea, businessName, industry, description } = await req.json();

    const prompt = `I am going to provide you with details about a business, and I want you to determine the most effective advertising method for them using our three available strategies. Please be as specific and granular as possible in your recommendations.

Business Information:
- Business Name: ${businessName}
- Target Area: ${targetArea}
- Industry: ${industry}
- Business Description: ${description}

Method 1: Direct Mail to Businesses
Please identify specific types of businesses that would be ideal targets. For each business type:
- Provide a specific business category
- Estimate the number of such businesses in the target area
- Explain why this specific type of business would benefit from the service
- Consider various sub-categories and specializations

Method 2: Database Targeting
Please identify specific databases and platforms that would be valuable. For each database:
- Name the specific database or platform
- Categorize the type of database
- Explain why it's particularly suitable
- Estimate the potential reach
- Consider both broad platforms and niche/local databases

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
        "type": "Legal Offices - Corporate Law",
        "estimatedCount": 150,
        "reasoning": ""
      },
      {
        "type": "Legal Offices - Real Estate Law",
        "estimatedCount": 100,
        "reasoning": ""
      }
      // ... more specific targets
    ],
    "overallReasoning": ""
  },
  "method2Analysis": {
    "databaseTargets": [
      {
        "name": "LinkedIn",
        "type": "Professional Network",
        "reasoning": "",
        "estimatedReach": 1000
      },
      {
        "name": "Edmonton Chamber of Commerce",
        "type": "Local Directory",
        "reasoning": "",
        "estimatedReach": 500
      }
      // ... more specific databases
    ],
    "overallReasoning": ""
  },
  "method3Analysis": {
    "reasoning": ""
  }
}`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4-0125-preview",
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error('No response content from OpenAI');
    }

    return NextResponse.json({ analysis: JSON.parse(responseContent) });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to analyze marketing strategy' }, { status: 500 });
  }
} 