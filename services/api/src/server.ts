import { randomUUID, timingSafeEqual } from "node:crypto";
import Fastify from "fastify";
import { config } from "./config.js";
import { checkDatabase, sql } from "./database.js";
import { MqttService } from "./mqtt-service.js";

const app = Fastify({
  logger: {
    level: config.nodeEnv === "production" ? "info" : "debug"
  },
  trustProxy: true,
  bodyLimit: 16 * 1024
});

const mqttService = new MqttService(app.log);

function validApiKey(candidate: string | undefined): boolean {
  if (!candidate) return false;

  const expected = Buffer.from(config.apiKey);
  const received = Buffer.from(candidate);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

app.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/health/")) return;

  const header = request.headers["x-api-key"];
  const candidate = Array.isArray(header) ? header[0] : header;

  if (!validApiKey(candidate)) {
    return reply.code(401).send({ error: "unauthorized" });
  }
});

app.get("/health/live", async () => ({ status: "ok" }));

app.get("/health/ready", async (_request, reply) => {
  try {
    await checkDatabase();
    if (!mqttService.isConnected()) {
      return reply.code(503).send({ status: "not_ready", mqtt: false, database: true });
    }
    return { status: "ready", mqtt: true, database: true };
  } catch (error) {
    app.log.error({ err: error }, "Readiness check falhou");
    return reply.code(503).send({ status: "not_ready", mqtt: mqttService.isConnected(), database: false });
  }
});

app.get("/v1/devices/mega/state", async () => {
  const state = await sql`
    select topic, payload, received_at
    from device_state
    where topic like 'casa/mega/%'
    order by topic
  `;

  return { device: "mega", state };
});

app.post("/v1/devices/mega/commands/test", async (_request, reply) => {
  const commandId = randomUUID();
  const expiresAt = new Date(Date.now() + 30_000);

  await sql`
    insert into commands (id, device_id, command_type, payload, status, expires_at)
    values (
      ${commandId}::uuid,
      'mega',
      'diagnostic_test',
      ${sql.json({ message: "ping" })},
      'created',
      ${expiresAt}
    )
  `;

  try {
    await mqttService.publishTestCommand(commandId);
    return reply.code(202).send({ commandId, status: "published", expiresAt });
  } catch (error) {
    await sql`
      update commands
      set status = 'failed', error_message = ${error instanceof Error ? error.message : "unknown"}
      where id = ${commandId}::uuid
    `;
    throw error;
  }
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error({ err: error }, "Erro na requisicao");
  const candidateStatusCode =
    error instanceof Error &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
      ? error.statusCode
      : undefined;

  const statusCode =
    candidateStatusCode && candidateStatusCode >= 400 && candidateStatusCode < 500
      ? candidateStatusCode
      : 500;

  const errorCode =
    statusCode === 415 ? "unsupported_media_type" :
    statusCode === 400 ? "bad_request" :
    statusCode === 404 ? "not_found" :
    statusCode < 500 ? "request_error" :
    "internal_server_error";

  void reply.code(statusCode).send({ error: errorCode });
});

app.addHook("onClose", async () => {
  mqttService.close();
  await sql.end({ timeout: 5 });
});

async function start(): Promise<void> {
  await checkDatabase();
  await app.listen({ host: config.host, port: config.port });
}

start().catch((error: unknown) => {
  app.log.fatal({ err: error }, "Falha ao iniciar API");
  process.exit(1);
});

