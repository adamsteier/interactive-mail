import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Create flag variables to track whether each auth method is available
let isEmailPasswordEnabled = true;
let isGoogleAuthEnabled = true;

// This will help prevent auth errors if the Firebase config is incomplete
try {
  auth.useDeviceLanguage();
} catch (error) {
  console.error("Firebase authentication error", error);
  isEmailPasswordEnabled = false;
  isGoogleAuthEnabled = false;
}

// Function to check if auth methods are enabled
export const getEnabledAuthMethods = async () => {
  return {
    emailPassword: isEmailPasswordEnabled,
    google: isGoogleAuthEnabled
  };
};

// Initialize Analytics (only in browser environment)
let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.error("Analytics initialization error", error);
  }
}

export { auth, db, analytics }; 