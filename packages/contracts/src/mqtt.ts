import { Type, type Static } from '@sinclair/typebox';

export { MQTT_TOPICS, PRESENCE_STATES } from './mqtt-topics.js';
export type { PresenceState } from './mqtt-topics.js';

export const DiagnosticMqttPayloadSchema = Type.Literal('ping');
export type DiagnosticMqttPayload = Static<typeof DiagnosticMqttPayloadSchema>;

export const MegaStatusSchema = Type.Union([
  Type.Literal('online'),
  Type.Literal('offline'),
]);
export type MegaStatus = Static<typeof MegaStatusSchema>;

export const PresenceStateSchema = Type.Union([
  Type.Literal('warming_up'),
  Type.Literal('detected'),
  Type.Literal('clear'),
]);
