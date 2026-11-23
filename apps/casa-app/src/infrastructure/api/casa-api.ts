import { CasaApiClient } from '@casa/api-client';
import {
  apiBaseUrl,
  expireAuthentication,
  getAuthenticationHeaders,
} from '@/infrastructure/auth/auth-client';

export const casaApiClient = new CasaApiClient({
  authHeaders: getAuthenticationHeaders,
  baseUrl: apiBaseUrl,
  onUnauthorized: expireAuthentication,
});
