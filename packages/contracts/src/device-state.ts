import { Type, type Static } from '@sinclair/typebox';

export const DeviceIdSchema = Type.Literal('mega');
export type DeviceId = Static<typeof DeviceIdSchema>;

export const DeviceStateEntrySchema = Type.Object(
  {
    topic: Type.String({ minLength: 1 }),
    payload: Type.String(),
    receivedAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type DeviceStateEntry = Static<typeof DeviceStateEntrySchema>;

export const DeviceStateResponseSchema = Type.Object(
  {
    device: DeviceIdSchema,
    state: Type.Array(DeviceStateEntrySchema),
  },
  { additionalProperties: false },
);
export type DeviceStateResponse = Static<typeof DeviceStateResponseSchema>;
