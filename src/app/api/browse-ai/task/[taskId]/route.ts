import { NextResponse } from 'next/server';
import https from 'https';

type Params = Promise<{ taskId: string }>;

export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const { taskId } = await params;
    console.log('Fetching task:', taskId);
    console.log('Using API key:', process.env.BROWSE_AI_API_KEY?.slice(0, 5) + '...');

    // Create a promise-based version of the request
    const makeRequest = () => new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        hostname: 'api.browse.ai',
        path: `/v2/robots/${process.env.BROWSE_AI_ROBOT_ID}/tasks/${taskId}`,
        headers: {
          'Authorization': `Bearer ${process.env.BROWSE_AI_API_KEY}`,
          'Accept': 'application/json'
        }
      };

      console.log('Making request with options:', {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': 'Bearer ' + process.env.BROWSE_AI_API_KEY?.slice(0, 5) + '...'
        }
      });

      const req = https.request(options, (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => chunks.push(chunk));

        response.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          console.log('Browse AI Response:', body);
          resolve(JSON.parse(body));
        });
      });

      req.on('error', (error) => {
        console.error('Request error:', error);
        reject(error);
      });
      
      req.end();
    });

    const result = await makeRequest();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Browse.ai task status error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task status' },
      { status: 500 }
    );
  }
} 