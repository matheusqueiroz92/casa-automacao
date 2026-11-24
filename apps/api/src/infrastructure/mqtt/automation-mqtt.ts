import { automationCommandValue, type AutomationCommand } from '@casa/contracts/automation';
import { MQTT_TOPICS } from '@casa/contracts';

const TOPICS = {
  feeding: MQTT_TOPICS.mega.command.feeding,
  irrigation: MQTT_TOPICS.mega.command.irrigation,
  water_refill: MQTT_TOPICS.mega.command.waterRefill,
} as const;

const RELAY_TEST_TOPICS = {
  1: MQTT_TOPICS.mega.command.relayTest,
  2: MQTT_TOPICS.mega.command.relayTest2,
  3: MQTT_TOPICS.mega.command.relayTest3,
} as const;

export function buildAutomationMqttMessage(commandId: string, command: AutomationCommand) {
  if (command.type === 'relay_test') {
    return {
      payload: `${commandId}|${automationCommandValue(command)}`,
      topic: RELAY_TEST_TOPICS[command.channel ?? 1],
    };
  }

  return {
    payload: `${commandId}|${automationCommandValue(command)}`,
    topic: TOPICS[command.type],
  };
}
