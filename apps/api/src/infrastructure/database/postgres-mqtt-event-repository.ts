import type { MqttEventRepository } from '../../domain/ports.js';
import type { PostgresClient } from './postgres-client.js';

export class PostgresMqttEventRepository implements MqttEventRepository {
  constructor(private readonly sql: PostgresClient) {}

  async persist(topic: string, payload: string, qos: number): Promise<void> {
    await this.sql.begin(async (transaction) => {
      await transaction`
        insert into mqtt_events (topic, payload, qos)
        values (${topic}, ${payload}, ${qos})
      `;

      await transaction`
        insert into device_state (topic, payload, received_at)
        values (${topic}, ${payload}, now())
        on conflict (topic)
        do update set payload = excluded.payload, received_at = excluded.received_at
      `;
    });
  }
}
