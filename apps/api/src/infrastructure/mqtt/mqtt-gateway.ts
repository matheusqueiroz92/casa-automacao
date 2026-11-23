import os from 'node:os';
import {
  MQTT_TOPICS,
  type AutomationCommand,
  type DiagnosticMqttPayload,
} from '@casa/contracts';
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';

import type { CommandPublisher, MqttEventRepository } from '../../domain/ports.js';
import type { AppConfig } from '../config/environment.js';
import { buildAutomationMqttMessage } from './automation-mqtt.js';

const SUBSCRIPTIONS = [
  MQTT_TOPICS.mega.status,
  MQTT_TOPICS.mega.event,
  MQTT_TOPICS.mega.telemetry,
] as const;

type AppLogger = {
  info(message: string): void;
  warn(message: string): void;
  error(context: object, message: string): void;
};

export class MqttGateway implements CommandPublisher {
  private readonly client: MqttClient;

  constructor(
    config: AppConfig['mqtt'],
    private readonly eventRepository: MqttEventRepository,
    private readonly logger: AppLogger,
  ) {
    const options: IClientOptions = {
      username: config.username,
      password: config.password,
      clientId: `api-casa-${os.hostname()}`,
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      keepalive: 30,
    };

    this.client = mqtt.connect(config.url, options);
    this.bindEvents();
  }

  isConnected(): boolean {
    return this.client.connected;
  }

  async publishDiagnostic(): Promise<void> {
    if (!this.client.connected) throw new Error('MQTT indisponivel');

    const payload: DiagnosticMqttPayload = 'ping';
    await this.publish(MQTT_TOPICS.mega.command.test, payload, 1, false);
  }

  async publishAutomation(commandId: string, command: AutomationCommand): Promise<void> {
    if (!this.client.connected) throw new Error('MQTT indisponivel');

    const message = buildAutomationMqttMessage(commandId, command);
    await this.publish(message.topic, message.payload, 1, false);
  }

  close(): void {
    this.client.end(true);
  }

  private bindEvents(): void {
    this.client.on('connect', () => {
      this.logger.info('MQTT conectado');
      this.client.subscribe([...SUBSCRIPTIONS], { qos: 1 }, (error) => {
        if (error) this.logger.error({ err: error }, 'Falha ao assinar topicos MQTT');
      });
    });

    this.client.on('reconnect', () => this.logger.warn('Reconectando ao MQTT'));
    this.client.on('error', (error) => this.logger.error({ err: error }, 'Erro MQTT'));
    this.client.on('message', (topic, payload, packet) => {
      void this.eventRepository
        .persist(topic, payload.toString('utf8'), packet.qos)
        .catch((error: unknown) => {
          this.logger.error({ err: error, topic }, 'Falha ao persistir mensagem MQTT');
        });
    });
  }

  private async publish(
    topic: string,
    payload: string,
    qos: 0 | 1 | 2,
    retain: boolean,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.publish(topic, payload, { qos, retain }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
