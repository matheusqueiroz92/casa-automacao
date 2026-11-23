import type { CommandRecord, CommandRepository } from '../../domain/ports.js';
import type { PostgresClient } from './postgres-client.js';

export class PostgresCommandRepository implements CommandRepository {
  constructor(private readonly sql: PostgresClient) {}

  async create(command: CommandRecord): Promise<void> {
    await this.sql`
      insert into commands (id, device_id, command_type, payload, status, expires_at)
      values (
        ${command.id}::uuid,
        ${command.deviceId},
        ${command.commandType},
        ${this.sql.json(command.payload)},
        ${command.status},
        ${command.expiresAt}
      )
    `;
  }

  async markPublished(commandId: string, publishedAt: Date): Promise<void> {
    await this.sql`
      update commands
      set status = 'published', published_at = ${publishedAt}
      where id = ${commandId}::uuid
    `;
  }

  async markFailed(commandId: string, errorMessage: string): Promise<void> {
    await this.sql`
      update commands
      set status = 'failed', error_message = ${errorMessage}
      where id = ${commandId}::uuid
    `;
  }
}
