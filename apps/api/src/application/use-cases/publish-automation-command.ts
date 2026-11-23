import {
  isAutomationCommandWithinLimits,
  type AutomationCommand,
  type AutomationCommandAccepted,
} from '@casa/contracts';

import type { Clock, CommandPublisher, CommandRepository, IdGenerator } from '../../domain/ports.js';

type Dependencies = {
  clock: Clock;
  commandPublisher: CommandPublisher;
  commandRepository: CommandRepository;
  idGenerator: IdGenerator;
};

export class AutomationLimitError extends Error {
  readonly statusCode = 400;

  constructor() {
    super('Comando fora dos limites de segurança');
    this.name = 'AutomationLimitError';
  }
}

export class PublishAutomationCommand {
  constructor(private readonly dependencies: Dependencies) {}

  async execute(command: AutomationCommand): Promise<AutomationCommandAccepted> {
    if (!isAutomationCommandWithinLimits(command)) throw new AutomationLimitError();

    const commandId = this.dependencies.idGenerator.generate();
    const now = this.dependencies.clock.now();
    const expiresAt = new Date(now.getTime() + 30_000);

    await this.dependencies.commandRepository.create({
      id: commandId,
      deviceId: 'mega',
      commandType: command.type,
      payload: command,
      status: 'created',
      expiresAt,
    });

    try {
      await this.dependencies.commandPublisher.publishAutomation(commandId, command);
      await this.dependencies.commandRepository.markPublished(commandId, now);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      await this.dependencies.commandRepository.markFailed(commandId, message);
      throw error;
    }

    return {
      commandId,
      commandType: command.type,
      status: 'published',
      expiresAt: expiresAt.toISOString(),
    };
  }
}
