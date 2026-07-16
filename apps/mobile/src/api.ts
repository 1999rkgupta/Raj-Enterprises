import { createApiClient } from '@raj-enterprises/api-client';

// Fallback to localhost (10.0.2.2 for Android emulators, custom local IP for real devices)
const API_BASE_URL = 'http://localhost:8000';

let authToken: string | null = 'mock-customer'; // Default to mock-customer in dev mode

export const setMobileAuthToken = (token: string | null) => {
  authToken = token;
};

export const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    return authToken;
  },
});
