import { describe, expect, it, vi } from 'vitest';

import type {
  Clock,
  CommandPublisher,
  CommandRecord,
  CommandRepository,
  IdGenerator,
} from '../../domain/ports.js';
import { PublishDiagnosticCommand } from './publish-diagnostic-command.js';

const commandId = '4d638a5e-f046-487c-ac18-a3283b661254';
const now = new Date('2026-11-21T21:37:56.029Z');

function createDependencies() {
  const repository: CommandRepository = {
    create: vi.fn<(command: CommandRecord) => Promise<void>>().mockResolvedValue(undefined),
    markFailed: vi.fn<(id: string, message: string) => Promise<void>>().mockResolvedValue(undefined),
    markPublished: vi.fn<(id: string, publishedAt: Date) => Promise<void>>().mockResolvedValue(undefined),
  };

  const publisher: CommandPublisher = {
    publishAutomation: vi.fn().mockResolvedValue(undefined),
    publishDiagnostic: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };

  const clock: Clock = { now: () => now };
  const idGenerator: IdGenerator = { generate: () => commandId };

  return { clock, idGenerator, publisher, repository };
}

describe('PublishDiagnosticCommand', () => {
  it('persiste, publica e confirma um comando diagnóstico', async () => {
    const dependencies = createDependencies();
    const useCase = new PublishDiagnosticCommand({
      clock: dependencies.clock,
      commandPublisher: dependencies.publisher,
      commandRepository: dependencies.repository,
      idGenerator: dependencies.idGenerator,
    });

    const result = await useCase.execute();

    expect(dependencies.repository.create).toHaveBeenCalledWith({
      id: commandId,
      deviceId: 'mega',
      commandType: 'diagnostic_test',
      payload: { message: 'ping' },
      status: 'created',
      expiresAt: new Date('2026-11-21T21:38:26.029Z'),
    });
    expect(dependencies.publisher.publishDiagnostic).toHaveBeenCalledOnce();
    expect(dependencies.repository.markPublished).toHaveBeenCalledWith(commandId, now);
    expect(result).toEqual({
      commandId,
      status: 'published',
      expiresAt: '2026-11-21T21:38:26.029Z',
    });
  });

  it('registra a falha quando a publicação MQTT não funciona', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.publisher.publishDiagnostic).mockRejectedValue(new Error('MQTT indisponível'));
    const useCase = new PublishDiagnosticCommand({
      clock: dependencies.clock,
      commandPublisher: dependencies.publisher,
      commandRepository: dependencies.repository,
      idGenerator: dependencies.idGenerator,
    });

    await expect(useCase.execute()).rejects.toThrow('MQTT indisponível');
    expect(dependencies.repository.markFailed).toHaveBeenCalledWith(commandId, 'MQTT indisponível');
    expect(dependencies.repository.markPublished).not.toHaveBeenCalled();
  });

  it('normaliza falhas que não são instâncias de Error', async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.publisher.publishDiagnostic).mockRejectedValue('offline');
    const useCase = new PublishDiagnosticCommand({
      clock: dependencies.clock,
      commandPublisher: dependencies.publisher,
      commandRepository: dependencies.repository,
      idGenerator: dependencies.idGenerator,
    });

    await expect(useCase.execute()).rejects.toBe('offline');
    expect(dependencies.repository.markFailed).toHaveBeenCalledWith(commandId, 'unknown');
  });
});
