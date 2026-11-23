import { createBetterAuth } from './infrastructure/auth/better-auth.js';
import { loadConfig } from './infrastructure/config/environment.js';

const config = loadConfig();

export const { auth } = createBetterAuth(config);
