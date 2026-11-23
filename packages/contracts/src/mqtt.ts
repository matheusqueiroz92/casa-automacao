import { Type, type Static } from '@sinclair/typebox';

export const MQTT_TOPICS = {
  mega: {
    status: 'casa/mega/status',
    event: 'casa/mega/evento/#',
    telemetry: 'casa/mega/telemetria/#',
    command: {
      feeding: 'casa/mega/comando/racao',
      irrigation: 'casa/mega/comando/irrigacao',
      test: 'casa/mega/comando/teste',
      waterRefill: 'casa/mega/comando/agua',
    },
  },
} as const;

export const DiagnosticMqttPayloadSchema = Type.Literal('ping');
export type DiagnosticMqttPayload = Static<typeof DiagnosticMqttPayloadSchema>;

export const MegaStatusSchema = Type.Union([
  Type.Literal('online'),
  Type.Literal('offline'),
]);
export type MegaStatus = Static<typeof MegaStatusSchema>;
