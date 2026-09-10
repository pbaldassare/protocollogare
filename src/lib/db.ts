import { Pool, type QueryResultRow } from "pg";

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL mancante: collega il progetto a Supabase.");
  }
  return url;
}

declare global {
  var __pgarePool: Pool | undefined;
}

export function getPool() {
  if (!globalThis.__pgarePool) {
    globalThis.__pgarePool = new Pool({
      connectionString: connectionString().replace(/[?&]sslmode=[^&]+/, ""),
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalThis.__pgarePool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
