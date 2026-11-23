import type {
  AutomationCommand,
  AutomationCommandType,
  CommandStatus,
  DeviceId,
  DeviceStateEntry,
} from '@casa/contracts';

export type CommandRecord = {
  id: string;
  deviceId: DeviceId;
  commandType: 'diagnostic_test' | AutomationCommandType;
  payload: { message: 'ping' } | AutomationCommand;
  status: Extract<CommandStatus, 'created'>;
  expiresAt: Date;
};

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  generate(): string;
}

export interface CommandRepository {
  create(command: CommandRecord): Promise<void>;
  markPublished(commandId: string, publishedAt: Date): Promise<void>;
  markFailed(commandId: string, errorMessage: string): Promise<void>;
}

export interface CommandPublisher {
  publishAutomation(commandId: string, command: AutomationCommand): Promise<void>;
  publishDiagnostic(): Promise<void>;
}

export interface DeviceStateRepository {
  listByDevice(deviceId: DeviceId): Promise<DeviceStateEntry[]>;
}

export interface MqttEventRepository {
  persist(topic: string, payload: string, qos: number): Promise<void>;
}

export interface ReadinessProbe {
  databaseIsReady(): Promise<boolean>;
  mqttIsReady(): boolean;
}
