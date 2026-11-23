import { ApiClientError, type CasaApiClient } from '@casa/api-client';
import type { DeviceStateResponse } from '@casa/contracts';
import type { AutomationCommand } from '@casa/contracts/automation';
import { useCallback, useEffect, useState } from 'react';

export type DashboardApi = Pick<
  CasaApiClient,
  'getMegaState' | 'publishAutomation' | 'publishDiagnostic'
>;

type ConnectionState = {
  status: 'loading' | 'online' | 'offline' | 'error';
  errorCode?: string;
  lastContact?: string;
};

type DiagnosticState = {
  status: 'idle' | 'publishing' | 'published' | 'error';
};

export function useDashboardGateway(api: DashboardApi) {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'loading' });
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({ status: 'idle' });

  const refresh = useCallback(async () => {
    try {
      const response = await api.getMegaState();
      setConnection(toConnectionState(response));
    } catch (error) {
      setConnection({ status: 'error', errorCode: readErrorCode(error) });
    }
  }, [api]);

  useEffect(() => {
    let active = true;

    api.getMegaState().then(
      (response) => {
        if (active) setConnection(toConnectionState(response));
      },
      (error: unknown) => {
        if (active) {
          setConnection({ status: 'error', errorCode: readErrorCode(error) });
        }
      },
    );

    return () => {
      active = false;
    };
  }, [api]);

  const runDiagnostic = useCallback(async () => {
    setDiagnostic({ status: 'publishing' });

    try {
      await api.publishDiagnostic();
      setDiagnostic({ status: 'published' });
      await refresh();
    } catch {
      setDiagnostic({ status: 'error' });
    }
  }, [api, refresh]);

  const runAutomation = useCallback(
    async (command: AutomationCommand): Promise<boolean> => {
      try {
        await api.publishAutomation(command);
        return true;
      } catch {
        return false;
      }
    },
    [api],
  );

  return { connection, diagnostic, refresh, runAutomation, runDiagnostic };
}

function readErrorCode(error: unknown): string {
  return error instanceof ApiClientError ? error.code : 'unexpected_error';
}

function toConnectionState(response: DeviceStateResponse): ConnectionState {
  const status = response.state.find((entry) => entry.topic === 'casa/mega/status');

  return {
    status: status?.payload === 'online' ? 'online' : 'offline',
    ...(status ? { lastContact: status.receivedAt } : {}),
  };
}
