// Shared guard against accidentally running destructive/bulk-synthetic
// operations against the production database. This project's production DB
// is Supabase (see cybercrime-portal-requirements/execution/PRODUCTION_READINESS.md) —
// if DATABASE_URL ever points there, a demo-data or suspect-data reseed would
// insert/delete real rows in production.
const PRODUCTION_HOST_MARKERS = ["supabase.co", "supabase.com"];

export function refuseIfProductionDatabase(context: string) {
  const configured = process.env.DATABASE_URL;
  const looksLikeProduction =
    !!configured && PRODUCTION_HOST_MARKERS.some((marker) => configured.includes(marker));
  if (looksLikeProduction && process.env.ALLOW_PRODUCTION_SEED !== "1") {
    throw new Error(
      `Refusing to run ${context}: DATABASE_URL looks like a production database ` +
        `(${configured!.replace(/:[^:@]*@/, ":***@")}). Point it at the local Docker Postgres instead ` +
        "(see docker-compose.yml), or pass ALLOW_PRODUCTION_SEED=1 if you really mean this.",
    );
  }
}
