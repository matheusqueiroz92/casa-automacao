import { describe, expect, it } from 'vitest';

import { buildAutomationMqttMessage } from './automation-mqtt.js';

describe('buildAutomationMqttMessage', () => {
  it('encodes the command id and the bounded value for the Mega', () => {
    expect(
      buildAutomationMqttMessage('command-id', {
        type: 'water_refill',
        maxDurationSeconds: 10,
      }),
    ).toEqual({
      topic: 'casa/mega/comando/agua',
      payload: 'command-id|10',
    });
  });
});
