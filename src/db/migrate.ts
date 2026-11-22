import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { env } from "../lib/env";

const sql = postgres(env.DATABASE_URL, { max: 1 });

try {
	await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
	console.log("Drizzle migrations applied.");
} finally {
	await sql.end();
}
