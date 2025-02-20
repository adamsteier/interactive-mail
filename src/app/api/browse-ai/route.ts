import { NextResponse } from 'next/server';

const BROWSE_AI_API_KEY = process.env.BROWSE_AI_API_KEY;
const BROWSE_AI_ROBOT_ID = process.env.BROWSE_AI_ROBOT_ID;

interface DirectMailLead {
  name: string;
  address: string;
}

export async function POST(request: Request) {
  try {
    const { leads } = await request.json() as { leads: DirectMailLead[] };
    
    const response = await fetch(`https://api.browse.ai/v2/robots/${BROWSE_AI_ROBOT_ID}/bulk-runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BROWSE_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Direct Mail Leads Processing',
        inputParameters: leads.map((lead) => ({
          businessName: lead.name,
          address: lead.address,
        }))
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: data.message || 'Failed to submit to Browse.ai' 
      }, { status: response.status });
    }

    return NextResponse.json({ 
      success: true, 
      taskId: data.id 
    });

  } catch (error) {
    console.error('Browse.ai API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 