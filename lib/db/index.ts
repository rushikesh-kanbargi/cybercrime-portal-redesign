import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and set it " +
      "(local Docker Postgres or a Neon/Supabase connection string).",
  );
}

// ponytail: one shared connection, prepare:false for pgbouncer/Neon pooled
// connections. Add connection pooling tuning only if the hackathon demo
// actually needs it.
const client = postgres(process.env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
