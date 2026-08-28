import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Supabase adds its own managed schemas (auth, storage, realtime, vault,
  // extensions, graphql_public) alongside `public` — without this filter,
  // `drizzle-kit push` also introspects those and can crash on a constraint
  // shape it doesn't expect (hit in production: a `TypeError` deep in its
  // check-constraint parser while pulling one of Supabase's own schemas).
  // This project only ever defines tables in `public`.
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
