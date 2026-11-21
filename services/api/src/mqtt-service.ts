import os from "node:os";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import type { FastifyBaseLogger } from "fastify";
import { config } from "./config.js";
import { sql } from "./database.js";

const SUBSCRIPTIONS = [
  "casa/mega/status",
  "casa/mega/evento/#",
  "casa/mega/telemetria/#"
] as const;

export class MqttService {
  private readonly client: MqttClient;

  constructor(private readonly logger: FastifyBaseLogger) {
    const options: IClientOptions = {
      username: config.mqtt.username,
      password: config.mqtt.password,
      clientId: `api-casa-${os.hostname()}`,
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      keepalive: 30
    };

    this.client = mqtt.connect(config.mqtt.url, options);
    this.bindEvents();
  }

  isConnected(): boolean {
    return this.client.connected;
  }

  async publishTestCommand(commandId: string): Promise<void> {
    if (!this.client.connected) {
      throw new Error("MQTT indisponivel");
    }

    // O firmware de diagnostico aceita somente este topico e trata o payload
    // como sinal de teste. Nenhum atuador pode ser acionado por esta rota.
    await this.publish("casa/mega/comando/teste", "ping", 1, false);

    await sql`
      update commands
      set status = 'published', published_at = now()
      where id = ${commandId}::uuid
    `;
  }

  close(): void {
    this.client.end(true);
  }

  private bindEvents(): void {
    this.client.on("connect", () => {
      this.logger.info("MQTT conectado");
      this.client.subscribe([...SUBSCRIPTIONS], { qos: 1 }, (error) => {
        if (error) {
          this.logger.error({ err: error }, "Falha ao assinar topicos MQTT");
        }
      });
    });

    this.client.on("reconnect", () => {
      this.logger.warn("Reconectando ao MQTT");
    });

    this.client.on("error", (error) => {
      this.logger.error({ err: error }, "Erro MQTT");
    });

    this.client.on("message", (topic, payload, packet) => {
      void this.persistMessage(topic, payload.toString("utf8"), packet.qos).catch((error: unknown) => {
        this.logger.error({ err: error, topic }, "Falha ao persistir mensagem MQTT");
      });
    });
  }

  private async persistMessage(topic: string, payload: string, qos: number): Promise<void> {
    await sql.begin(async (transaction) => {
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

  private async publish(topic: string, payload: string, qos: 0 | 1 | 2, retain: boolean): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.client.publish(topic, payload, { qos, retain }, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

