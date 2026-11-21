import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

function integer(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Variavel ${name} deve ser um inteiro positivo`);
  }
  return value;
}

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: integer("PORT", 3000),
  apiKey: required("API_KEY"),
  database: {
    host: required("DB_HOST"),
    port: integer("DB_PORT", 5432),
    name: required("DB_NAME"),
    user: required("DB_USER"),
    password: required("DB_PASSWORD")
  },
  mqtt: {
    url: required("MQTT_URL"),
    username: required("MQTT_USERNAME"),
    password: required("MQTT_PASSWORD")
  }
});

