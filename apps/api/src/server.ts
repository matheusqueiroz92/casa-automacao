import pino from 'pino';

import { GetDeviceState } from './application/use-cases/get-device-state.js';
import { PublishDiagnosticCommand } from './application/use-cases/publish-diagnostic-command.js';
import { PublishAutomationCommand } from './application/use-cases/publish-automation-command.js';
import { loadConfig } from './infrastructure/config/environment.js';
import { createBetterAuth } from './infrastructure/auth/better-auth.js';
import { BetterAuthGateway } from './infrastructure/auth/better-auth-gateway.js';
import { createPostgresClient } from './infrastructure/database/postgres-client.js';
import { PostgresCommandRepository } from './infrastructure/database/postgres-command-repository.js';
import { PostgresDeviceStateRepository } from './infrastructure/database/postgres-device-state-repository.js';
import { PostgresMqttEventRepository } from './infrastructure/database/postgres-mqtt-event-repository.js';
import { MqttGateway } from './infrastructure/mqtt/mqtt-gateway.js';
import {
  InfrastructureReadinessProbe,
  SystemClock,
  UuidGenerator,
} from './infrastructure/system/system-adapters.js';
import { buildHttpApp } from './presentation/http/app.js';

const config = loadConfig();
const sql = createPostgresClient(config.database);
const { auth, pool: authPool } = createBetterAuth(config);
const infrastructureLogger = pino({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
});

const commandRepository = new PostgresCommandRepository(sql);
const deviceStateRepository = new PostgresDeviceStateRepository(sql);
const mqttEventRepository = new PostgresMqttEventRepository(sql);
const mqttGateway = new MqttGateway(config.mqtt, mqttEventRepository, infrastructureLogger);
const readinessProbe = new InfrastructureReadinessProbe(sql, mqttGateway);

const app = buildHttpApp({
  auth: new BetterAuthGateway(auth),
  corsOrigins: config.corsOrigins,
  getDeviceState: new GetDeviceState(deviceStateRepository),
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
  },
  publishDiagnosticCommand: new PublishDiagnosticCommand({
    clock: new SystemClock(),
    commandPublisher: mqttGateway,
    commandRepository,
    idGenerator: new UuidGenerator(),
  }),
  publishAutomationCommand: new PublishAutomationCommand({
    clock: new SystemClock(),
    commandPublisher: mqttGateway,
    commandRepository,
    idGenerator: new UuidGenerator(),
  }),
  readinessProbe,
  onClose: async () => {
    mqttGateway.close();
    await authPool.end();
    await sql.end({ timeout: 5 });
  },
});

async function start(): Promise<void> {
  const databaseIsReady = await readinessProbe.databaseIsReady();
  if (!databaseIsReady) throw new Error('Banco de dados indisponivel durante a inicializacao');

  await app.listen({ host: config.host, port: config.port });
}

async function stop(signal: NodeJS.Signals): Promise<void> {
  app.log.info({ signal }, 'Encerrando API');
  await app.close();
  process.exit(0);
}

process.once('SIGINT', () => void stop('SIGINT'));
process.once('SIGTERM', () => void stop('SIGTERM'));

start().catch((error: unknown) => {
  app.log.fatal({ err: error }, 'Falha ao iniciar API');
  process.exit(1);
});
