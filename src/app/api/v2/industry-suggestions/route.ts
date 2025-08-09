import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { input } = await request.json();

    if (!input || input.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const prompt = `Given the partial business industry input "${input}", suggest up to 5 specific business industries that match or are related. Return only industry names, no descriptions. Include a variety of business types like "Law Firm", "Dental Practice", "Auto Repair Shop", "Italian Restaurant", "Real Estate Agency", "Plumbing Service", "Hair Salon", "Veterinary Clinic", etc. Return as a JSON array of strings.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that suggests business industries based on partial input. Always return a JSON array of strings with no additional formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const response = completion.choices[0].message.content;
    
    try {
      const suggestions = JSON.parse(response || '[]');
      return NextResponse.json({ 
        suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 5) : [] 
      });
    } catch {
      console.error('Error parsing OpenAI response:', response);
      return NextResponse.json({ suggestions: [] });
    }

  } catch (error) {
    console.error('Error getting industry suggestions:', error);
    return NextResponse.json({ suggestions: [] }, { status: 500 });
  }
} 