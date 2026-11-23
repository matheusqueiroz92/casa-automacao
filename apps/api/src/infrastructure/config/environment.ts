import 'dotenv/config';

function requiredValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  return value;
}

function positiveInteger(raw: string | undefined, name: string, fallback: number): number {
  if (!raw) return fallback;

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Variavel ${name} deve ser um inteiro positivo`);
  }
  return value;
}

function secureSecret(value: string | undefined): string {
  const secret = requiredValue(value, 'BETTER_AUTH_SECRET');
  if (secret.length < 32) {
    throw new Error('Variavel BETTER_AUTH_SECRET deve possuir ao menos 32 caracteres');
  }
  return secret;
}

function localDatabaseUrl(environment: NodeJS.ProcessEnv): string {
  const host = environment.DB_HOST ?? '127.0.0.1';
  const port = positiveInteger(environment.DB_PORT, 'DB_PORT', 5433);
  const name = requiredValue(environment.DB_NAME ?? environment.POSTGRES_DB, 'DB_NAME');
  const user = requiredValue(environment.DB_USER ?? environment.POSTGRES_USER, 'DB_USER');
  const password = requiredValue(
    environment.DB_PASSWORD ?? environment.POSTGRES_PASSWORD,
    'DB_PASSWORD',
  );

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env) {
  const nodeEnv = environment.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const port = positiveInteger(environment.PORT, 'PORT', isProduction ? 3000 : 3001);
  const authBaseUrl =
    environment.BETTER_AUTH_URL ??
    (isProduction ? undefined : `http://127.0.0.1:${port}`);
  const resolvedAuthBaseUrl = requiredValue(authBaseUrl, 'BETTER_AUTH_URL');

  return Object.freeze({
    nodeEnv,
    host: environment.HOST ?? '0.0.0.0',
    port,
    auth: {
      baseUrl: resolvedAuthBaseUrl,
      secret: secureSecret(environment.BETTER_AUTH_SECRET),
      trustedOrigins: environment.AUTH_TRUSTED_ORIGINS
        ? environment.AUTH_TRUSTED_ORIGINS.split(',').map((origin) => origin.trim())
        : isProduction
          ? [resolvedAuthBaseUrl, 'casaautomacao://']
          : [
              resolvedAuthBaseUrl,
              'casaautomacao://',
              'exp://',
              'exp://**',
              'exp://192.168.*.*:*/**',
              'http://localhost:*',
              'http://127.0.0.1:*',
            ],
    },
    corsOrigins: environment.CORS_ORIGINS
      ? environment.CORS_ORIGINS.split(',').map((origin) => origin.trim())
      : isProduction
        ? []
        : [
            /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/,
            /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/,
          ],
    database: {
      url:
        environment.DATABASE_URL ||
        (isProduction
          ? requiredValue(environment.DATABASE_URL, 'DATABASE_URL')
          : localDatabaseUrl(environment)),
      maxConnections: positiveInteger(environment.DB_MAX_CONNECTIONS, 'DB_MAX_CONNECTIONS', 5),
    },
    mqtt: {
      url: requiredValue(
        environment.MQTT_URL ?? (isProduction ? undefined : 'mqtt://127.0.0.1:1883'),
        'MQTT_URL',
      ),
      username: requiredValue(
        environment.MQTT_USERNAME ?? environment.MQTT_API_USERNAME,
        'MQTT_USERNAME',
      ),
      password: requiredValue(
        environment.MQTT_PASSWORD ?? environment.MQTT_API_PASSWORD,
        'MQTT_PASSWORD',
      ),
    },
  });
}

export type AppConfig = ReturnType<typeof loadConfig>;
