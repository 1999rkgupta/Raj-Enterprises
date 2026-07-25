import { createApiClient } from '@raj-enterprises/api-client';
import { getIdToken } from './firebase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

let devAuthToken: string | null = null; // Used for Mock Dev login bypass

export const setMobileAuthToken = (token: string | null) => {
  devAuthToken = token;
};

export const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    // 1. Try to get real Firebase ID token first
    const realToken = await getIdToken();
    if (realToken) {
      return realToken;
    }
    // 2. Fallback to developer mock token
    return devAuthToken;
  },
});
