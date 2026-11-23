import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getMigrations } from 'better-auth/db/migration';

import { createBetterAuth } from '../auth/better-auth.js';
import { loadConfig } from '../config/environment.js';
import { createPostgresClient } from './postgres-client.js';

const config = loadConfig();
const sql = createPostgresClient(config.database);
const { auth, pool } = createBetterAuth(config);

async function migrate() {
  const schemaPath = path.resolve(process.cwd(), '../../deploy/postgres/init.sql');
  const applicationSchema = await readFile(schemaPath, 'utf8');
  await sql.unsafe(applicationSchema);

  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
}

migrate()
  .then(() => console.log('Migrações do banco concluídas.'))
  .catch((error: unknown) => {
    console.error('Falha ao executar migrações.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await sql.end({ timeout: 5 });
  });
