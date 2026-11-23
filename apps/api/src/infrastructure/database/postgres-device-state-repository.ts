import type { DeviceId, DeviceStateEntry } from '@casa/contracts';

import type { DeviceStateRepository } from '../../domain/ports.js';
import type { PostgresClient } from './postgres-client.js';

type DeviceStateRow = {
  topic: string;
  payload: string;
  received_at: Date;
};

export class PostgresDeviceStateRepository implements DeviceStateRepository {
  constructor(private readonly sql: PostgresClient) {}

  async listByDevice(deviceId: DeviceId): Promise<DeviceStateEntry[]> {
    const rows = await this.sql<DeviceStateRow[]>`
      select topic, payload, received_at
      from device_state
      where topic like ${`casa/${deviceId}/%`}
      order by topic
    `;

    return rows.map((row) => ({
      topic: row.topic,
      payload: row.payload,
      receivedAt: row.received_at.toISOString(),
    }));
  }
}
