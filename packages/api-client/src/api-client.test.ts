import { describe, expect, it, vi } from 'vitest';

import { CasaApiClient, type ApiClientError } from './index.js';

const baseUrl = 'http://127.0.0.1:3001';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('CasaApiClient', () => {
  it('fetches and validates the current Mega state', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse({
        device: 'mega',
        state: [
          {
            topic: 'casa/mega/status',
            payload: 'online',
            receivedAt: '2026-11-22T10:39:09.427Z',
          },
        ],
      }),
    );
    const client = new CasaApiClient({
      authHeaders: () => ({ cookie: 'casa.session_token=valid' }),
      baseUrl,
      fetch,
    });

    const result = await client.getMegaState();

    expect(result.device).toBe('mega');
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('http://127.0.0.1:3001/v1/devices/mega/state');
    expect(init?.method).toBe('GET');
    expect(init?.headers).toMatchObject({ cookie: 'casa.session_token=valid' });
    expect(init?.credentials).toBe('include');
  });

  it('publishes a diagnostic command as JSON', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse(
        {
          commandId: '4d638a5e-f046-487c-ac18-a3283b661254',
          status: 'published',
          expiresAt: '2026-11-22T10:40:00.000Z',
        },
        202,
      ),
    );
    const client = new CasaApiClient({ baseUrl, fetch });

    const result = await client.publishDiagnostic();

    expect(result.status).toBe('published');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/v1/devices/mega/commands/test',
      expect.objectContaining({ method: 'POST', body: '{}' }),
    );
  });

  it('publishes a bounded automation command as JSON', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
      jsonResponse(
        {
          commandId: '62dfaa57-4506-4a78-b64a-a621b30a9c78',
          commandType: 'feeding',
          status: 'published',
          expiresAt: '2026-11-23T18:00:30.000Z',
        },
        202,
      ),
    );
    const client = new CasaApiClient({ baseUrl, fetch });

    const result = await client.publishAutomation({ type: 'feeding', grams: 60 });

    expect(result.commandType).toBe('feeding');
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:3001/v1/devices/mega/commands/automation',
      expect.objectContaining({ method: 'POST', body: '{"type":"feeding","grams":60}' }),
    );
  });

  it('exposes an actionable error for non-success responses', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401));
    const client = new CasaApiClient({ baseUrl, fetch });

    await expect(client.getMegaState()).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 401,
      code: 'unauthorized',
    } satisfies Partial<ApiClientError>);
  });

  it('notifies the application when the session is no longer authorized', async () => {
    const onUnauthorized = vi.fn().mockResolvedValue(undefined);
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ error: 'unauthorized' }, 401));
    const client = new CasaApiClient({ baseUrl, fetch, onUnauthorized });

    await expect(client.getMegaState()).rejects.toMatchObject({ status: 401 });

    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('rejects responses that violate the shared contract', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValue(jsonResponse({ device: 'mega', state: 'invalid' }));
    const client = new CasaApiClient({ baseUrl, fetch });

    await expect(client.getMegaState()).rejects.toMatchObject({
      name: 'ApiClientError',
      code: 'invalid_response',
    } satisfies Partial<ApiClientError>);
  });
});
