import { automationCommandValue, type AutomationCommand } from '@casa/contracts/automation';
import { MQTT_TOPICS } from '@casa/contracts';

const TOPICS = {
  feeding: MQTT_TOPICS.mega.command.feeding,
  irrigation: MQTT_TOPICS.mega.command.irrigation,
  water_refill: MQTT_TOPICS.mega.command.waterRefill,
} as const;

export function buildAutomationMqttMessage(commandId: string, command: AutomationCommand) {
  return {
    payload: `${commandId}|${automationCommandValue(command)}`,
    topic: TOPICS[command.type],
  };
}
