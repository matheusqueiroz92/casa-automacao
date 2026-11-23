import {
  type AutomationCommandAccepted,
  type DeviceStateResponse,
  type DiagnosticCommandAccepted,
} from '@casa/contracts';
import type { AutomationCommand } from '@casa/contracts/automation';
import {
  isAutomationCommandAccepted,
  isDeviceStateResponse,
  isDiagnosticCommandAccepted,
} from '@casa/contracts/validators';

export type FetchLike = typeof globalThis.fetch;

export type CasaApiClientOptions = {
  authHeaders?: () => Promise<Record<string, string>> | Record<string, string>;
  baseUrl: string;
  fetch?: FetchLike;
  onUnauthorized?: () => Promise<void> | void;
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number | undefined;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

export class CasaApiClient {
  private readonly authHeaders: () => Promise<Record<string, string>> | Record<string, string>;
  private readonly baseUrl: string;
  private readonly fetch: FetchLike;
  private readonly onUnauthorized: () => Promise<void> | void;

  constructor(options: CasaApiClientOptions) {
    this.authHeaders = options.authHeaders ?? (() => ({}));
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetch =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.onUnauthorized = options.onUnauthorized ?? (() => undefined);
  }

  async getMegaState(): Promise<DeviceStateResponse> {
    return this.request('/v1/devices/mega/state', isDeviceStateResponse, {
      method: 'GET',
    });
  }

  async publishDiagnostic(): Promise<DiagnosticCommandAccepted> {
    return this.request(
      '/v1/devices/mega/commands/test',
      isDiagnosticCommandAccepted,
      { method: 'POST', body: '{}' },
    );
  }

  async publishAutomation(command: AutomationCommand): Promise<AutomationCommandAccepted> {
    return this.request(
      '/v1/devices/mega/commands/automation',
      isAutomationCommandAccepted,
      { method: 'POST', body: JSON.stringify(command) },
    );
  }

  private async request<TResult>(
    path: string,
    validate: (value: unknown) => value is TResult,
    init: Pick<RequestInit, 'body' | 'method'>,
  ): Promise<TResult> {
    let response: Response;

    try {
      const authHeaders = await this.authHeaders();
      response = await this.fetch(`${this.baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...authHeaders,
        },
      });
    } catch {
      throw new ApiClientError(
        'network_error',
        'Não foi possível se conectar à API da casa.',
      );
    }

    const payload = await parseJson(response);

    if (!response.ok) {
      if (response.status === 401) {
        try {
          await this.onUnauthorized();
        } catch {
          // Session cleanup must not hide the original API error.
        }
      }

      const code = readErrorCode(payload);
      throw new ApiClientError(code, `A API respondeu com status ${response.status}.`, response.status);
    }

    if (!validate(payload)) {
      throw new ApiClientError(
        'invalid_response',
        'A resposta da API não corresponde ao contrato esperado.',
        response.status,
      );
    }

    return payload;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiClientError(
      'invalid_json',
      'A API retornou uma resposta que não é JSON válido.',
      response.status,
    );
  }
}

function readErrorCode(payload: unknown): string {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error;
  }

  return 'request_failed';
}
