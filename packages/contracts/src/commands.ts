import { Type, type Static } from '@sinclair/typebox';

import { AUTOMATION_LIMITS } from './automation.js';

export const CommandStatusSchema = Type.Union([
  Type.Literal('created'),
  Type.Literal('published'),
  Type.Literal('executing'),
  Type.Literal('completed'),
  Type.Literal('failed'),
  Type.Literal('expired'),
]);
export type CommandStatus = Static<typeof CommandStatusSchema>;

export const DiagnosticCommandAcceptedSchema = Type.Object(
  {
    commandId: Type.String({ minLength: 1 }),
    status: Type.Literal('published'),
    expiresAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type DiagnosticCommandAccepted = Static<typeof DiagnosticCommandAcceptedSchema>;

export const AutomationCommandRequestSchema = Type.Union([
  Type.Object(
    {
      type: Type.Literal('irrigation'),
      durationSeconds: Type.Integer({
        minimum: 1,
        maximum: AUTOMATION_LIMITS.irrigation.maxDurationSeconds,
      }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Literal('water_refill'),
      maxDurationSeconds: Type.Integer({
        minimum: 1,
        maximum: AUTOMATION_LIMITS.water_refill.maxDurationSeconds,
      }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      type: Type.Literal('feeding'),
      grams: Type.Integer({ minimum: 1, maximum: AUTOMATION_LIMITS.feeding.maxGrams }),
    },
    { additionalProperties: false },
  ),
]);

export const AutomationCommandAcceptedSchema = Type.Object(
  {
    commandId: Type.String({ minLength: 1 }),
    commandType: Type.Union([
      Type.Literal('irrigation'),
      Type.Literal('water_refill'),
      Type.Literal('feeding'),
    ]),
    status: Type.Literal('published'),
    expiresAt: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type AutomationCommandAccepted = Static<typeof AutomationCommandAcceptedSchema>;
