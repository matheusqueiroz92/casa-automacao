export const AUTOMATION_LIMITS = {
  irrigation: {
    defaultDurationSeconds: 15,
    maxDurationSeconds: 45,
  },
  water_refill: {
    defaultMaxDurationSeconds: 10,
    maxDurationSeconds: 30,
  },
  feeding: {
    defaultGrams: 60,
    maxGrams: 120,
  },
  relay_test: {
    defaultDurationSeconds: 2,
    maxDurationSeconds: 5,
  },
} as const;

export type AutomationCommand =
  | { type: 'irrigation'; durationSeconds: number }
  | { type: 'water_refill'; maxDurationSeconds: number }
  | { type: 'feeding'; grams: number }
  | { type: 'relay_test'; durationSeconds: number };

export type AutomationCommandType = AutomationCommand['type'];

export function isAutomationCommandWithinLimits(command: AutomationCommand): boolean {
  switch (command.type) {
    case 'irrigation':
      return Number.isInteger(command.durationSeconds) &&
        command.durationSeconds >= 1 &&
        command.durationSeconds <= AUTOMATION_LIMITS.irrigation.maxDurationSeconds;
    case 'water_refill':
      return Number.isInteger(command.maxDurationSeconds) &&
        command.maxDurationSeconds >= 1 &&
        command.maxDurationSeconds <= AUTOMATION_LIMITS.water_refill.maxDurationSeconds;
    case 'feeding':
      return Number.isInteger(command.grams) &&
        command.grams >= 1 &&
        command.grams <= AUTOMATION_LIMITS.feeding.maxGrams;
    case 'relay_test':
      return Number.isInteger(command.durationSeconds) &&
        command.durationSeconds >= 1 &&
        command.durationSeconds <= AUTOMATION_LIMITS.relay_test.maxDurationSeconds;
  }
}

export function automationCommandValue(command: AutomationCommand): number {
  switch (command.type) {
    case 'irrigation':
      return command.durationSeconds;
    case 'water_refill':
      return command.maxDurationSeconds;
    case 'feeding':
      return command.grams;
    case 'relay_test':
      return command.durationSeconds;
  }
}
