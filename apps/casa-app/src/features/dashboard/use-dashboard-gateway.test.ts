import type {
  AutomationCommandAccepted,
  DeviceStateResponse,
  DiagnosticCommandAccepted,
} from '@casa/contracts';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  type DashboardApi,
  useDashboardGateway,
} from './use-dashboard-gateway';

function createApi(overrides: Partial<DashboardApi> = {}): DashboardApi {
  return {
    getMegaState: jest.fn<Promise<DeviceStateResponse>, []>().mockResolvedValue({
      device: 'mega',
      state: [
        {
          topic: 'casa/mega/status',
          payload: 'online',
          receivedAt: '2026-11-22T10:39:09.427Z',
        },
      ],
    }),
    publishDiagnostic: jest
      .fn<Promise<DiagnosticCommandAccepted>, []>()
      .mockResolvedValue({
        commandId: '4d638a5e-f046-487c-ac18-a3283b661254',
        status: 'published',
        expiresAt: '2026-11-22T10:40:00.000Z',
      }),
    publishAutomation: jest
      .fn<Promise<AutomationCommandAccepted>, [{ type: 'feeding'; grams: number }]>()
      .mockResolvedValue({
        commandId: '62dfaa57-4506-4a78-b64a-a621b30a9c78',
        commandType: 'feeding',
        status: 'published',
        expiresAt: '2026-11-23T18:00:30.000Z',
      }),
    ...overrides,
  };
}

describe('useDashboardGateway', () => {
  it('loads the real Mega status on mount', async () => {
    const api = createApi();
    const { result } = await renderHook(() => useDashboardGateway(api));

    await waitFor(() => expect(result.current.connection.status).toBe('online'));
    expect(result.current.connection.lastContact).toBe('2026-11-22T10:39:09.427Z');
  });

  it('publishes a diagnostic command and reports success', async () => {
    const api = createApi();
    const { result } = await renderHook(() => useDashboardGateway(api));
    await waitFor(() => expect(result.current.connection.status).toBe('online'));

    await act(async () => result.current.runDiagnostic());

    expect(api.publishDiagnostic).toHaveBeenCalledTimes(1);
    expect(result.current.diagnostic.status).toBe('published');
  });

  it('turns transport failures into a visible error state', async () => {
    const api = createApi({
      getMegaState: jest.fn().mockRejectedValue(new Error('offline')),
    });
    const { result } = await renderHook(() => useDashboardGateway(api));

    await waitFor(() => expect(result.current.connection.status).toBe('error'));
  });

  it('publishes a bounded automation command', async () => {
    const api = createApi();
    const { result } = await renderHook(() => useDashboardGateway(api));

    const published = await result.current.runAutomation({ type: 'feeding', grams: 60 });

    expect(published).toBe(true);
    expect(api.publishAutomation).toHaveBeenCalledWith({ type: 'feeding', grams: 60 });
  });
});
