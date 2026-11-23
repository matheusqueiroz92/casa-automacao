import type { DeviceId, DeviceStateResponse } from '@casa/contracts';

import type { DeviceStateRepository } from '../../domain/ports.js';

export class GetDeviceState {
  constructor(private readonly repository: DeviceStateRepository) {}

  async execute(deviceId: DeviceId): Promise<DeviceStateResponse> {
    return {
      device: deviceId,
      state: await this.repository.listByDevice(deviceId),
    };
  }
}
