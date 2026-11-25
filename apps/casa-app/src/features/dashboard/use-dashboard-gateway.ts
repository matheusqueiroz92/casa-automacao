import { ApiClientError, type CasaApiClient } from '@casa/api-client';
import type { DeviceStateResponse } from '@casa/contracts';
import type { AutomationCommand } from '@casa/contracts/automation';
import { MQTT_TOPICS, type PresenceState } from '@casa/contracts/mqtt-topics';
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

type PresenceViewState = {
  status: PresenceState | 'unknown';
  lastChange?: string;
};

const DEVICE_STATE_REFRESH_INTERVAL_MS = 5000;

export function useDashboardGateway(api: DashboardApi) {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'loading' });
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({ status: 'idle' });
  const [presence, setPresence] = useState<PresenceViewState>({ status: 'unknown' });

  const refresh = useCallback(async () => {
    try {
      const response = await api.getMegaState();
      setConnection(toConnectionState(response));
      setPresence(toPresenceState(response));
    } catch (error) {
      setConnection({ status: 'error', errorCode: readErrorCode(error) });
      setPresence({ status: 'unknown' });
    }
  }, [api]);

  useEffect(() => {
    let active = true;

    const loadState = async () => {
      try {
        const response = await api.getMegaState();
        if (!active) return;
        setConnection(toConnectionState(response));
        setPresence(toPresenceState(response));
      } catch (error) {
        if (!active) return;
        setConnection({ status: 'error', errorCode: readErrorCode(error) });
        setPresence({ status: 'unknown' });
      }
    };

    void loadState();
    const interval = setInterval(() => void loadState(), DEVICE_STATE_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(interval);
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

  return { connection, diagnostic, presence, refresh, runAutomation, runDiagnostic };
}

function readErrorCode(error: unknown): string {
  return error instanceof ApiClientError ? error.code : 'unexpected_error';
}

function toConnectionState(response: DeviceStateResponse): ConnectionState {
  const status = response.state.find((entry) => entry.topic === MQTT_TOPICS.mega.status);

  return {
    status: status?.payload === 'online' ? 'online' : 'offline',
    ...(status ? { lastContact: status.receivedAt } : {}),
  };
}

function toPresenceState(response: DeviceStateResponse): PresenceViewState {
  const presence = response.state.find((entry) => entry.topic === MQTT_TOPICS.mega.presence);
  const status = presence?.payload;

  if (
    !presence ||
    (status !== 'warming_up' && status !== 'detected' && status !== 'clear')
  ) {
    return { status: 'unknown' };
  }

  return { status, lastChange: presence.receivedAt };
}
