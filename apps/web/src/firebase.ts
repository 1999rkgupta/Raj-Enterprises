/**
 * Raj Enterprises — Firebase Configuration
 *
 * All config values from environment variables.
 * Replace the VITE_ prefixed values in .env with your Firebase project credentials.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'dummy-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dummy-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'dummy.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123:web:abc',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XXXXXX',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Helper to get current user's ID token for API calls
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken(true);
  } catch {
    return null;
  }
}

export default app;
