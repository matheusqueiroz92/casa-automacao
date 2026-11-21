import postgres from "postgres";
import { config } from "./config.js";

export const sql = postgres({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

export async function checkDatabase(): Promise<void> {
  await sql`select 1`;
}

