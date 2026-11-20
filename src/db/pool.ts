import postgres from "postgres";
import { env } from "../lib/env";

let pool: ReturnType<typeof postgres> | undefined;

export function databasePool() {
  pool ??= postgres(env.DATABASE_URL, {
    max: 5,
    prepare: false,
    connect_timeout: 4,
    idle_timeout: 30,
    onnotice: () => {},
    connection: { statement_timeout: 8_000, lock_timeout: 3_000, idle_in_transaction_session_timeout: 10_000 },
  });
  return pool;
}
