import postgres from 'postgres';

import type { AppConfig } from '../config/environment.js';

export function createPostgresClient(config: AppConfig['database']) {
  return postgres(config.url, {
    max: config.maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export type PostgresClient = ReturnType<typeof createPostgresClient>;
