import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

/**
 * Check if user is admin
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    return userData?.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Verify Firebase ID token
 */
export async function verifyFirebaseToken(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      };
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    return {
      success: true,
      userId: decodedToken.uid
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid token'
    };
  }
}

/**
 * Require admin access (for admin routes only)
 */
export async function requireAdmin(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  response?: NextResponse;
}> {
  // First verify the user is authenticated
  const tokenAuth = await verifyFirebaseToken(request);
  if (!tokenAuth.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: tokenAuth.error || 'Authentication required' },
        { status: 401 }
      )
    };
  }

  // Then check if they're admin
  const isAdmin = await checkAdminStatus(tokenAuth.userId!);
  if (!isAdmin) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    };
  }

  return {
    success: true,
    userId: tokenAuth.userId
  };
}

/**
 * Require user authentication (for user routes)
 */
export async function requireUser(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  response?: NextResponse;
}> {
  const tokenAuth = await verifyFirebaseToken(request);
  if (!tokenAuth.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: tokenAuth.error || 'Authentication required' },
        { status: 401 }
      )
    };
  }

  return {
    success: true,
    userId: tokenAuth.userId
  };
}

/**
 * Verify CRON secret for scheduled tasks
 */
export function requireCronAuth(request: NextRequest): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON authentication not configured' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'CRON authentication required' },
      { status: 401 }
    );
  }

  const token = authHeader.split('Bearer ')[1];
  if (token !== cronSecret) {
    return NextResponse.json(
      { error: 'Invalid CRON secret' },
      { status: 401 }
    );
  }

  return null; // Success - no error response
}

/**
 * Check if test routes are allowed
 */
export function requireTestEnvironment(): NextResponse | null {
  const nodeEnv = process.env.NODE_ENV;
  const allowTests = process.env.ALLOW_TEST_ROUTES;
  
  // Allow tests in development or if explicitly enabled
  if (nodeEnv !== 'development' && allowTests !== 'true') {
    return NextResponse.json(
      { error: 'Test endpoints are disabled in production' },
      { status: 403 }
    );
  }

  return null; // Success - no error response
}
