import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'dummy-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'dummy-project',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dummy.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:123:web:abc',
};

// Safe initialization that never crashes top-level JS bundle load
let app: any;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn('Firebase initializeApp notice:', e);
}

let authInstance: any = null;

function getAuthInstance() {
  if (!authInstance && app) {
    try {
      authInstance = getAuth(app);
    } catch {
      try {
        authInstance = initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        try {
          authInstance = getAuth(app);
        } catch (err) {
          console.warn('Firebase auth init notice:', err);
        }
      }
    }
  }
  return authInstance;
}

export const auth = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getAuthInstance();
    if (!instance) return undefined;
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  },
});

export async function getIdToken(): Promise<string | null> {
  const instance = getAuthInstance();
  if (!instance || !instance.currentUser) return null;
  try {
    return await instance.currentUser.getIdToken(true);
  } catch {
    return null;
  }
}

export default app;
