import { expoClient } from '@better-auth/expo/client';
import { AUTH_COOKIE_PREFIX } from '@casa/contracts/auth';
import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { resolveApiBaseUrl } from '@/infrastructure/api/resolve-api-base-url';
import { createSessionExpirationHandler } from '@/infrastructure/auth/session-expiration';

type AppExtra = {
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;
const configuredApiBaseUrl = extra.apiBaseUrl ?? 'http://127.0.0.1:3001';
const webHostname =
  Platform.OS === 'web' && typeof globalThis.location !== 'undefined'
    ? globalThis.location.hostname
    : undefined;

export const apiBaseUrl = resolveApiBaseUrl({
  configuredUrl: configuredApiBaseUrl,
  development: __DEV__,
  platform: Platform.OS,
  webHostname,
});

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  plugins: [
    expoClient({
      cookiePrefix: AUTH_COOKIE_PREFIX,
      scheme: 'casaautomacao',
      storage: SecureStore,
      storagePrefix: 'casa-automacao',
    }),
    adminClient(),
  ],
  sessionOptions: {
    refetchInterval: 60,
    refetchOnWindowFocus: true,
  },
});

export const expireAuthentication = createSessionExpirationHandler(async () => {
  await authClient.signOut();
});

export async function getAuthenticationHeaders(): Promise<Record<string, string>> {
  if (Platform.OS === 'web') return {};

  const cookie = await authClient.getCookie();
  return cookie ? { cookie } : {};
}
