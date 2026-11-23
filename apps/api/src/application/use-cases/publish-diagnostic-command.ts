import type { DiagnosticCommandAccepted } from '@casa/contracts';

import type { Clock, CommandPublisher, CommandRepository, IdGenerator } from '../../domain/ports.js';

type Dependencies = {
  clock: Clock;
  commandPublisher: CommandPublisher;
  commandRepository: CommandRepository;
  idGenerator: IdGenerator;
};

export class PublishDiagnosticCommand {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(): Promise<DiagnosticCommandAccepted> {
    const commandId = this.dependencies.idGenerator.generate();
    const now = this.dependencies.clock.now();
    const expiresAt = new Date(now.getTime() + 30_000);

    await this.dependencies.commandRepository.create({
      id: commandId,
      deviceId: 'mega',
      commandType: 'diagnostic_test',
      payload: { message: 'ping' },
      status: 'created',
      expiresAt,
    });

    try {
      await this.dependencies.commandPublisher.publishDiagnostic();
      await this.dependencies.commandRepository.markPublished(commandId, now);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      await this.dependencies.commandRepository.markFailed(commandId, message);
      throw error;
    }

    return {
      commandId,
      status: 'published',
      expiresAt: expiresAt.toISOString(),
    };
  }
}
