import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { businessTypes, targetArea, businessName, industry, description } = await req.json();

    if (!businessTypes || !Array.isArray(businessTypes) || businessTypes.length === 0) {
      return NextResponse.json(
        { error: 'Business types array is required' },
        { status: 400 }
      );
    }

    const prompt = `I am going to provide you with details about a business and specific business types they want to target. Please analyze each business type and provide detailed information about targeting them with direct mail.

Business Information:
- Business Name: ${businessName}
- Target Area: ${targetArea}
- Business Industry: ${industry}
- Business Description: ${description}

Business Types to Analyze: ${businessTypes.join(', ')}

For each business type provided, please:
- Estimate the number of such businesses in the target area
- Explain why this specific type of business would benefit from the service
- Provide reasoning for targeting this business type with direct mail

Please structure your response in the following JSON format:

{
  "businessTargets": [
    {
      "type": "[Business type exactly as provided]",
      "estimatedReach": [number],
      "reasoning": "[Detailed explanation of why this business type is relevant and would benefit from direct mail]"
    }
  ]
}

Important: 
- Use the exact business type names as provided in the input
- Provide specific, relevant reasoning based on the business details provided
- Do not use placeholder text in your response
- Each recommendation should be tailored to the specific business and target area`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response structure
    if (!analysis.businessTargets || !Array.isArray(analysis.businessTargets)) {
      throw new Error('Invalid analysis structure');
    }

    // Ensure all business types are included in the response
    const responseTypes = analysis.businessTargets.map((target: any) => target.type);
    const missingTypes = businessTypes.filter(type => !responseTypes.includes(type));
    
    if (missingTypes.length > 0) {
      console.warn('Some business types missing from response:', missingTypes);
      // Add missing types with default values
      missingTypes.forEach(type => {
        analysis.businessTargets.push({
          type,
          estimatedReach: 25,
          reasoning: `${type} businesses in ${targetArea} could benefit from direct mail marketing to increase local visibility and customer acquisition.`
        });
      });
    }

    return NextResponse.json({ analysis });

  } catch (error) {
    console.error('Error analyzing business types:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze business types' },
      { status: 500 }
    );
  }
}