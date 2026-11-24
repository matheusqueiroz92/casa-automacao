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

  it('routes the bounded bench relay pulse to its dedicated topic', () => {
    expect(
      buildAutomationMqttMessage('relay-command-id', {
        type: 'relay_test',
        durationSeconds: 2,
      }),
    ).toEqual({
      topic: 'casa/mega/comando/rele/1',
      payload: 'relay-command-id|2',
    });
  });

  it.each([
    [2, 'casa/mega/comando/rele/2'],
    [3, 'casa/mega/comando/rele/3'],
  ] as const)('routes relay channel %s to its dedicated topic', (channel, topic) => {
    expect(
      buildAutomationMqttMessage('relay-command-id', {
        type: 'relay_test',
        channel,
        durationSeconds: 2,
      }),
    ).toEqual({
      topic,
      payload: 'relay-command-id|2',
    });
  });
});
