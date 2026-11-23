import { AUTOMATION_LIMITS } from '@casa/contracts/automation';
import { describe, expect, it, vi } from 'vitest';

import type {
  Clock,
  CommandPublisher,
  CommandRecord,
  CommandRepository,
  IdGenerator,
} from '../../domain/ports.js';
import { PublishAutomationCommand } from './publish-automation-command.js';

const commandId = '62dfaa57-4506-4a78-b64a-a621b30a9c78';
const now = new Date('2026-11-23T18:00:00.000Z');

function createDependencies() {
  const commandRepository: CommandRepository = {
    create: vi.fn<(command: CommandRecord) => Promise<void>>().mockResolvedValue(undefined),
    markFailed: vi.fn().mockResolvedValue(undefined),
    markPublished: vi.fn().mockResolvedValue(undefined),
  };
  const commandPublisher: CommandPublisher = {
    publishAutomation: vi.fn().mockResolvedValue(undefined),
    publishDiagnostic: vi.fn().mockResolvedValue(undefined),
  };
  const clock: Clock = { now: () => now };
  const idGenerator: IdGenerator = { generate: () => commandId };
  return { clock, commandPublisher, commandRepository, idGenerator };
}

describe('PublishAutomationCommand', () => {
  it('persists and publishes a command inside the safety limit', async () => {
    const dependencies = createDependencies();
    const useCase = new PublishAutomationCommand(dependencies);
    const command = {
      type: 'irrigation' as const,
      durationSeconds: AUTOMATION_LIMITS.irrigation.maxDurationSeconds,
    };

    const result = await useCase.execute(command);

    expect(dependencies.commandRepository.create).toHaveBeenCalledWith({
      id: commandId,
      deviceId: 'mega',
      commandType: 'irrigation',
      payload: command,
      status: 'created',
      expiresAt: new Date('2026-11-23T18:00:30.000Z'),
    });
    expect(dependencies.commandPublisher.publishAutomation).toHaveBeenCalledWith(commandId, command);
    expect(result).toMatchObject({ commandId, commandType: 'irrigation', status: 'published' });
  });

  it('rejects a command above the firmware limit before persistence', async () => {
    const dependencies = createDependencies();
    const useCase = new PublishAutomationCommand(dependencies);

    await expect(
      useCase.execute({
        type: 'feeding',
        grams: AUTOMATION_LIMITS.feeding.maxGrams + 1,
      }),
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(dependencies.commandRepository.create).not.toHaveBeenCalled();
    expect(dependencies.commandPublisher.publishAutomation).not.toHaveBeenCalled();
  });

  it('records MQTT publication failures', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.commandPublisher.publishAutomation).mockRejectedValue(
      new Error('MQTT indisponível'),
    );
    const useCase = new PublishAutomationCommand(dependencies);

    await expect(
      useCase.execute({ type: 'water_refill', maxDurationSeconds: 10 }),
    ).rejects.toThrow('MQTT indisponível');

    expect(dependencies.commandRepository.markFailed).toHaveBeenCalledWith(
      commandId,
      'MQTT indisponível',
    );
  });
});
