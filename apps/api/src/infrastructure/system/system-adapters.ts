import { randomUUID } from 'node:crypto';

import type { Clock, IdGenerator, ReadinessProbe } from '../../domain/ports.js';
import type { PostgresClient } from '../database/postgres-client.js';
import type { MqttGateway } from '../mqtt/mqtt-gateway.js';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}

export class InfrastructureReadinessProbe implements ReadinessProbe {
  constructor(
    private readonly sql: PostgresClient,
    private readonly mqttGateway: MqttGateway,
  ) {}

  async databaseIsReady(): Promise<boolean> {
    try {
      await this.sql`select 1`;
      return true;
    } catch {
      return false;
    }
  }

  mqttIsReady(): boolean {
    return this.mqttGateway.isConnected();
  }
}
