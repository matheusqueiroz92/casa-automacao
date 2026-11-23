import { describe, expect, it } from 'vitest';

import { loadConfig } from './environment.js';

describe('loadConfig', () => {
  it('maps the shared deploy variables to local development services', () => {
    const config = loadConfig({
      BETTER_AUTH_SECRET: 'a'.repeat(32),
      POSTGRES_DB: 'casa_automacao',
      POSTGRES_USER: 'casa_api',
      POSTGRES_PASSWORD: 'database-secret',
      MQTT_API_USERNAME: 'api-casa',
      MQTT_API_PASSWORD: 'mqtt-secret',
    });

    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 3001,
      auth: {
        baseUrl: 'http://127.0.0.1:3001',
        secret: 'a'.repeat(32),
      },
      database: {
        url: 'postgresql://casa_api:database-secret@127.0.0.1:5433/casa_automacao',
        maxConnections: 5,
      },
      mqtt: {
        url: 'mqtt://127.0.0.1:1883',
        username: 'api-casa',
        password: 'mqtt-secret',
      },
    });
    expect(config.corsOrigins).toHaveLength(2);
    expect(config.corsOrigins.some((origin) => origin instanceof RegExp && origin.test('http://192.168.1.67:8081'))).toBe(true);
  });

  it('preserves explicit production connection settings', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'b'.repeat(32),
      BETTER_AUTH_URL: 'https://casa-api.matheusqueiroz.dev.br',
      DATABASE_URL: 'postgresql://casa_api:secret@ep-example-pooler.neon.tech/casa?sslmode=require',
      MQTT_URL: 'mqtt://mqtt:1883',
      MQTT_USERNAME: 'api-casa',
      MQTT_PASSWORD: 'mqtt-secret',
    });

    expect(config.port).toBe(3000);
    expect(config.database.url).toContain('neon.tech');
    expect(config.auth.baseUrl).toBe('https://casa-api.matheusqueiroz.dev.br');
    expect(config.mqtt.url).toBe('mqtt://mqtt:1883');
  });
});
