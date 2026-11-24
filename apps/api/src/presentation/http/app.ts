import type { IncomingHttpHeaders } from 'node:http';
import {
  AutomationCommandAcceptedSchema,
  AutomationCommandRequestSchema,
  DeviceStateResponseSchema,
  DiagnosticCommandAcceptedSchema,
  LivenessResponseSchema,
  ReadinessResponseSchema,
  type AutomationCommandAccepted,
  type DeviceStateResponse,
  type DiagnosticCommandAccepted,
} from '@casa/contracts';
import type { AutomationCommand } from '@casa/contracts/automation';
import cors from '@fastify/cors';
import Fastify, { type FastifyServerOptions } from 'fastify';

import type { ReadinessProbe } from '../../domain/ports.js';

type Executable<TResult, TArguments extends unknown[] = []> = {
  execute(...arguments_: TArguments): Promise<TResult>;
};

export type HttpAppDependencies = {
  auth: HttpAuthGateway;
  corsOrigins: (RegExp | string)[];
  getDeviceState: Executable<DeviceStateResponse, ['mega']>;
  logger?: FastifyServerOptions['logger'];
  onClose?: () => Promise<void>;
  publishDiagnosticCommand: Executable<DiagnosticCommandAccepted>;
  publishAutomationCommand: Executable<AutomationCommandAccepted, [AutomationCommand]>;
  readinessProbe: ReadinessProbe;
};

export type HttpAuthGateway = {
  getSession(headers: IncomingHttpHeaders): Promise<{
    session: { id: string };
    user: { email: string; id: string; name: string };
  } | null>;
  handle(request: Request): Promise<Response>;
};

async function forwardAuthRequest(
  request: { body: unknown; headers: IncomingHttpHeaders; method: string; protocol: string; url: string },
  auth: HttpAuthGateway,
): Promise<Response> {
  const host = request.headers.host ?? '127.0.0.1';
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(key, item));
    else if (value !== undefined) headers.set(key, value);
  }

  return auth.handle(
    new Request(`${request.protocol}://${host}${request.url}`, {
      method: request.method,
      headers,
      ...(request.body === undefined ? {} : { body: JSON.stringify(request.body) }),
    }),
  );
}

async function sendAuthResponse(response: Response, reply: { code(status: number): unknown; header(name: string, value: string | string[]): unknown; send(payload?: unknown): unknown }) {
  reply.code(response.status);
  const responseHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  responseHeaders.forEach((value, key) => {
    if (key !== 'set-cookie') reply.header(key, value);
  });
  const cookies = responseHeaders.getSetCookie?.() ?? [];
  if (cookies.length > 0) reply.header('set-cookie', cookies);
  return reply.send(response.body ? await response.text() : undefined);
}

function getHttpStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 500
  ) {
    return error.statusCode;
  }

  return 500;
}

export function buildHttpApp(dependencies: HttpAppDependencies) {
  const app = Fastify({
    ajv: {
      customOptions: {
        // Nao remova campos antes de avaliar todos os ramos dos contratos
        // discriminados. Isso preserva `channel` nos comandos relay_test.
        removeAdditional: false,
      },
    },
    logger: dependencies.logger ?? false,
    trustProxy: true,
    bodyLimit: 16 * 1024,
  });

  void app.register(cors, {
    allowedHeaders: ['content-type', 'cookie'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    origin: dependencies.corsOrigins,
  });

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS') return;
    if (request.url.startsWith('/health/')) return;
    if (request.url.startsWith('/api/auth/')) return;

    const session = await dependencies.auth.getSession(request.headers);
    if (!session) {
      request.log.warn('Sessão ausente ou inválida');
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const response = await forwardAuthRequest(request, dependencies.auth);
      return sendAuthResponse(response, reply);
    },
  });

  app.get(
    '/health/live',
    { schema: { response: { 200: LivenessResponseSchema } } },
    () => ({ status: 'ok' as const }),
  );

  app.get(
    '/health/ready',
    { schema: { response: { 200: ReadinessResponseSchema, 503: ReadinessResponseSchema } } },
    async (_request, reply) => {
      const database = await dependencies.readinessProbe.databaseIsReady();
      const mqtt = dependencies.readinessProbe.mqttIsReady();
      const ready = database && mqtt;
      const response = { status: ready ? ('ready' as const) : ('not_ready' as const), mqtt, database };

      return ready ? response : reply.code(503).send(response);
    },
  );

  app.get(
    '/v1/devices/mega/state',
    { schema: { response: { 200: DeviceStateResponseSchema } } },
    async () => dependencies.getDeviceState.execute('mega'),
  );

  app.post(
    '/v1/devices/mega/commands/test',
    { schema: { response: { 202: DiagnosticCommandAcceptedSchema } } },
    async (_request, reply) =>
      reply.code(202).send(await dependencies.publishDiagnosticCommand.execute()),
  );

  app.post<{ Body: AutomationCommand }>(
    '/v1/devices/mega/commands/automation',
    {
      schema: {
        body: AutomationCommandRequestSchema,
        response: { 202: AutomationCommandAcceptedSchema },
      },
    },
    async (request, reply) =>
      reply.code(202).send(await dependencies.publishAutomationCommand.execute(request.body)),
  );

  app.setErrorHandler((error, _request, reply) => {
    app.log.error({ err: error }, 'Erro na requisicao');
    const statusCode = getHttpStatusCode(error);

    const errorCode =
      statusCode === 415
        ? 'unsupported_media_type'
        : statusCode === 400
          ? 'bad_request'
          : statusCode === 404
            ? 'not_found'
            : statusCode < 500
              ? 'request_error'
              : 'internal_server_error';

    void reply.code(statusCode).send({ error: errorCode });
  });

  if (dependencies.onClose) {
    app.addHook('onClose', dependencies.onClose);
  }

  return app;
}
