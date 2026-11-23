import type { AutomationCommandAccepted, DiagnosticCommandAccepted } from './commands.js';
import type { DeviceStateEntry, DeviceStateResponse } from './device-state.js';

export function isDeviceStateResponse(value: unknown): value is DeviceStateResponse {
  if (!isRecord(value) || value.device !== 'mega' || !Array.isArray(value.state)) {
    return false;
  }

  return value.state.every(isDeviceStateEntry);
}

export function isDiagnosticCommandAccepted(
  value: unknown,
): value is DiagnosticCommandAccepted {
  return (
    isRecord(value) &&
    typeof value.commandId === 'string' &&
    value.commandId.length > 0 &&
    value.status === 'published' &&
    typeof value.expiresAt === 'string' &&
    value.expiresAt.length > 0
  );
}

export function isAutomationCommandAccepted(
  value: unknown,
): value is AutomationCommandAccepted {
  return (
    isRecord(value) &&
    typeof value.commandId === 'string' &&
    value.commandId.length > 0 &&
    (value.commandType === 'irrigation' ||
      value.commandType === 'water_refill' ||
      value.commandType === 'feeding') &&
    value.status === 'published' &&
    typeof value.expiresAt === 'string' &&
    value.expiresAt.length > 0
  );
}

function isDeviceStateEntry(value: unknown): value is DeviceStateEntry {
  return (
    isRecord(value) &&
    typeof value.topic === 'string' &&
    value.topic.length > 0 &&
    typeof value.payload === 'string' &&
    typeof value.receivedAt === 'string' &&
    value.receivedAt.length > 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
