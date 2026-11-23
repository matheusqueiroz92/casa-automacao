import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';

import { AUTH_COOKIE_PREFIX, AUTH_ROLES, hasAdminRole } from './auth.js';
import {
  AUTOMATION_LIMITS,
  isAutomationCommandWithinLimits,
} from './automation.js';
import {
  DeviceStateResponseSchema,
  DiagnosticCommandAcceptedSchema,
  MQTT_TOPICS,
} from './index.js';
import {
  isDeviceStateResponse,
  isDiagnosticCommandAccepted,
} from './validators.js';

describe('contratos compartilhados', () => {
  it('mantém o prefixo do cookie igual entre API e aplicativo', () => {
    expect(AUTH_COOKIE_PREFIX).toBe('casa');
  });

  it('reconhece somente o papel administrativo', () => {
    expect(hasAdminRole(AUTH_ROLES.admin)).toBe(true);
    expect(hasAdminRole(`user,${AUTH_ROLES.admin}`)).toBe(true);
    expect(hasAdminRole(AUTH_ROLES.user)).toBe(false);
    expect(hasAdminRole(undefined)).toBe(false);
  });

  it('mantém os tópicos MQTT compatíveis com o firmware', () => {
    expect(MQTT_TOPICS.mega.command.irrigation).toBe('casa/mega/comando/irrigacao');
    expect(MQTT_TOPICS.mega.command.waterRefill).toBe('casa/mega/comando/agua');
    expect(MQTT_TOPICS.mega.command.feeding).toBe('casa/mega/comando/racao');
    expect(MQTT_TOPICS.mega.command.test).toBe('casa/mega/comando/teste');
    expect(MQTT_TOPICS.mega.status).toBe('casa/mega/status');
    expect(MQTT_TOPICS.mega.telemetry).toBe('casa/mega/telemetria/#');
  });

  it('rejeita comandos que ultrapassam os limites compartilhados', () => {
    expect(
      isAutomationCommandWithinLimits({
        type: 'irrigation',
        durationSeconds: AUTOMATION_LIMITS.irrigation.maxDurationSeconds,
      }),
    ).toBe(true);
    expect(
      isAutomationCommandWithinLimits({
        type: 'irrigation',
        durationSeconds: AUTOMATION_LIMITS.irrigation.maxDurationSeconds + 1,
      }),
    ).toBe(false);
    expect(isAutomationCommandWithinLimits({ type: 'feeding', grams: 121 })).toBe(false);
  });

  it('aceita a resposta publicada de um comando diagnóstico', () => {
    expect(
      Value.Check(DiagnosticCommandAcceptedSchema, {
        commandId: '4d638a5e-f046-487c-ac18-a3283b661254',
        status: 'published',
        expiresAt: '2026-11-21T21:38:26.029Z',
      }),
    ).toBe(true);
  });

  it('rejeita estado de dispositivo sem instante de recebimento', () => {
    expect(
      Value.Check(DeviceStateResponseSchema, {
        device: 'mega',
        state: [{ topic: MQTT_TOPICS.mega.status, payload: 'online' }],
      }),
    ).toBe(false);
  });
});

describe('validadores universais de resposta', () => {
  it('aceita payloads válidos da API', () => {
    expect(
      isDeviceStateResponse({
        device: 'mega',
        state: [
          {
            topic: 'casa/mega/status',
            payload: 'online',
            receivedAt: '2026-11-22T10:39:09.427Z',
          },
        ],
      }),
    ).toBe(true);
    expect(
      isDiagnosticCommandAccepted({
        commandId: 'command-id',
        status: 'published',
        expiresAt: '2026-11-22T10:40:00.000Z',
      }),
    ).toBe(true);
  });

  it('rejeita payloads incompatíveis', () => {
    expect(isDeviceStateResponse({ device: 'mega', state: 'invalid' })).toBe(false);
    expect(isDiagnosticCommandAccepted({ status: 'created' })).toBe(false);
  });
});
