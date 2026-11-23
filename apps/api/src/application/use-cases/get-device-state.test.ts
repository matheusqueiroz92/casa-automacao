import { describe, expect, it, vi } from 'vitest';

import type { DeviceStateRepository } from '../../domain/ports.js';
import { GetDeviceState } from './get-device-state.js';

describe('GetDeviceState', () => {
  it('returns the device with its latest persisted state', async () => {
    const state = [
      {
        topic: 'casa/mega/status',
        payload: 'online',
        receivedAt: '2026-11-22T10:39:09.427Z',
      },
    ];
    const repository: DeviceStateRepository = {
      listByDevice: vi.fn().mockResolvedValue(state),
    };

    const result = await new GetDeviceState(repository).execute('mega');

    expect(repository.listByDevice).toHaveBeenCalledWith('mega');
    expect(result).toEqual({ device: 'mega', state });
  });
});
