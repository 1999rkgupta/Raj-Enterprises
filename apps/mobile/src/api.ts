import { createApiClient } from '@raj-enterprises/api-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || '';

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
