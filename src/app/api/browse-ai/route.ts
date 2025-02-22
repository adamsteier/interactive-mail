import { NextResponse } from 'next/server';
import https from 'https';

export async function POST(req: Request) {
  try {
    const { inputParameters } = await req.json();
    
    console.log('Creating Browse AI task with body:', { inputParameters });

    // Create a promise-based version of the http request
    const makeRequest = () => new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        hostname: 'api.browse.ai',
        path: `/v2/robots/${process.env.BROWSE_AI_ROBOT_ID}/tasks`,
        headers: {
          'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      };

      const request = https.request(options, (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => chunks.push(chunk));

        response.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          console.log('Browse AI response:', body);  // Log the response
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to create Browse.ai task: ${body}`));
          } else {
            resolve(JSON.parse(body));
          }
        });
      });

      request.on('error', (error) => reject(error));

      request.write(JSON.stringify({ inputParameters }));
      request.end();
    });

    const result = await makeRequest();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Browse.ai error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Browse.ai task' },
      { status: 500 }
    );
  }
} 