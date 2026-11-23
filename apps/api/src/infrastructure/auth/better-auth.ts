import { expo } from '@better-auth/expo';
import { AUTH_COOKIE_PREFIX } from '@casa/contracts/auth';
import { hash, verify, type Options as ArgonOptions } from '@node-rs/argon2';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { Pool } from 'pg';

import type { AppConfig } from '../config/environment.js';

const argonOptions: ArgonOptions = {
  algorithm: 2,
  memoryCost: 65_536,
  outputLen: 32,
  parallelism: 1,
  timeCost: 3,
};

export function createBetterAuth(config: AppConfig) {
  const pool = new Pool({
    connectionString: config.database.url,
    max: config.database.maxConnections,
  });

  const auth = betterAuth({
    appName: 'Casa Automação',
    baseURL: config.auth.baseUrl,
    secret: config.auth.secret,
    database: pool,
    trustedOrigins: config.auth.trustedOrigins,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      password: {
        hash: (password) => hash(password, argonOptions),
        verify: ({ hash: digest, password }) => verify(digest, password, argonOptions),
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      database: { joins: true },
    },
    plugins: [
      expo(),
      admin({
        adminRoles: ['admin'],
        defaultRole: 'user',
      }),
    ],
  });

  return { auth, pool };
}

export type CasaAuth = ReturnType<typeof createBetterAuth>['auth'];
