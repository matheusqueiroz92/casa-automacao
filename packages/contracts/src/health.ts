import { Type, type Static } from '@sinclair/typebox';

export const LivenessResponseSchema = Type.Object({ status: Type.Literal('ok') });
export type LivenessResponse = Static<typeof LivenessResponseSchema>;

export const ReadinessResponseSchema = Type.Object({
  status: Type.Union([Type.Literal('ready'), Type.Literal('not_ready')]),
  mqtt: Type.Boolean(),
  database: Type.Boolean(),
});
export type ReadinessResponse = Static<typeof ReadinessResponseSchema>;
