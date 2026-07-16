/**
 * Raj Enterprises — API Client Instance
 *
 * Creates a singleton API client with Firebase token injection.
 */

import { createApiClient } from '@raj-enterprises/api-client';
import { getIdToken } from '../firebase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: getIdToken,
});

export default api;
