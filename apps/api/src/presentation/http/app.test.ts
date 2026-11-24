import { describe, expect, it, vi } from 'vitest';

import { buildHttpApp } from './app.js';

function createApp(authenticated = false) {
  const executeDiagnostic = vi.fn().mockResolvedValue({
    commandId: '4d638a5e-f046-487c-ac18-a3283b661254',
    status: 'published' as const,
    expiresAt: '2026-11-21T21:38:26.029Z',
  });
  const executeAutomation = vi.fn().mockResolvedValue({
    commandId: '62dfaa57-4506-4a78-b64a-a621b30a9c78',
    commandType: 'irrigation' as const,
    status: 'published' as const,
    expiresAt: '2026-11-23T18:00:30.000Z',
  });
  const getDeviceState = vi.fn().mockResolvedValue({
    device: 'mega' as const,
    state: [
      {
        topic: 'casa/mega/status',
        payload: 'online',
        receivedAt: '2026-11-21T21:33:12.383Z',
      },
    ],
  });

  return {
    app: buildHttpApp({
      auth: {
        getSession: vi.fn().mockResolvedValue(
          authenticated
            ? {
                session: { id: 'session-1' },
                user: { id: 'user-1', email: 'matheus@example.com', name: 'Matheus' },
              }
            : null,
        ),
        handle: vi.fn().mockResolvedValue(
          Response.json(
            { user: { id: 'user-1', email: 'matheus@example.com' } },
            {
              headers: {
                'set-cookie': 'casa.session_token=opaque; Path=/; HttpOnly; SameSite=Lax',
              },
            },
          ),
        ),
      },
      corsOrigins: ['http://localhost:8081'],
      getDeviceState: { execute: getDeviceState },
      logger: false,
      publishAutomationCommand: { execute: executeAutomation },
      publishDiagnosticCommand: { execute: executeDiagnostic },
      readinessProbe: {
        databaseIsReady: vi.fn().mockResolvedValue(true),
        mqttIsReady: vi.fn().mockReturnValue(true),
      },
    }),
    executeDiagnostic,
    executeAutomation,
    getDeviceState,
  };
}

describe('HTTP API', () => {
  it('expõe liveness sem autenticação', async () => {
    const { app } = createApp();

    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('permite o app web somente a partir das origens configuradas', async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/devices/mega/state',
      headers: {
        origin: 'http://localhost:8081',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8081');
    await app.close();
  });

  it('expõe os endpoints do provedor de autenticação sem sessão prévia', async () => {
    const { app } = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in/email',
      headers: { 'content-type': 'application/json' },
      payload: { email: 'matheus@example.com', password: 'uma-senha-segura' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { id: 'user-1' } });
    expect(response.headers['set-cookie']?.toString()).toContain('casa.session_token=opaque');
    await app.close();
  });

  it('protege rotas da casa com sessão de usuário', async () => {
    const { app } = createApp();

    const response = await app.inject({ method: 'GET', url: '/v1/devices/mega/state' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthorized' });
    await app.close();
  });

  it('reports readiness only when database and MQTT are available', async () => {
    const { app } = createApp();

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready', mqtt: true, database: true });
    await app.close();
  });

  it('returns the current state through the application use case', async () => {
    const { app, getDeviceState } = createApp(true);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/devices/mega/state',
      headers: { cookie: 'casa.session_token=valid' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ device: 'mega' });
    expect(getDeviceState).toHaveBeenCalledWith('mega');
    await app.close();
  });

  it('delega o comando diagnóstico para a aplicação', async () => {
    const { app, executeDiagnostic } = createApp(true);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/devices/mega/commands/test',
      headers: { cookie: 'casa.session_token=valid', 'content-type': 'application/json' },
      payload: {},
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({ status: 'published' });
    expect(executeDiagnostic).toHaveBeenCalledOnce();
    await app.close();
  });

  it('valida e delega um comando de automação', async () => {
    const { app, executeAutomation } = createApp(true);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/devices/mega/commands/automation',
      headers: { cookie: 'casa.session_token=valid', 'content-type': 'application/json' },
      payload: { type: 'irrigation', durationSeconds: 15 },
    });

    expect(response.statusCode).toBe(202);
    expect(executeAutomation).toHaveBeenCalledWith({
      type: 'irrigation',
      durationSeconds: 15,
    });
    await app.close();
  });

  it('preserva o canal solicitado para um relé de bancada', async () => {
    const { app, executeAutomation } = createApp(true);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/devices/mega/commands/automation',
      headers: { cookie: 'casa.session_token=valid', 'content-type': 'application/json' },
      payload: { type: 'relay_test', channel: 2, durationSeconds: 2 },
    });

    expect(response.statusCode).toBe(202);
    expect(executeAutomation).toHaveBeenCalledWith({
      type: 'relay_test',
      channel: 2,
      durationSeconds: 2,
    });
    await app.close();
  });

  it('rejeita campos desconhecidos em vez de remove-los silenciosamente', async () => {
    const { app, executeAutomation } = createApp(true);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/devices/mega/commands/automation',
      headers: { cookie: 'casa.session_token=valid', 'content-type': 'application/json' },
      payload: { type: 'relay_test', channel: 2, durationSeconds: 2, unexpected: true },
    });

    expect(response.statusCode).toBe(400);
    expect(executeAutomation).not.toHaveBeenCalled();
    await app.close();
  });

  it('rejeita automação acima do limite antes do caso de uso', async () => {
    const { app, executeAutomation } = createApp(true);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/devices/mega/commands/automation',
      headers: { cookie: 'casa.session_token=valid', 'content-type': 'application/json' },
      payload: { type: 'feeding', grams: 121 },
    });

    expect(response.statusCode).toBe(400);
    expect(executeAutomation).not.toHaveBeenCalled();
    await app.close();
  });
});
