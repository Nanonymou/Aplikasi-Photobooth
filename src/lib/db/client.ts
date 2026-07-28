import "server-only";

import pg from "pg";

/**
 * Shared connection pool.
 *
 * Next.js reloads modules on every edit in development, which would leak a pool
 * per reload; caching it on `globalThis` keeps exactly one for the process. In
 * production the module is evaluated once and the branch never matters.
 */
const globalForPool = globalThis as typeof globalThis & {
  __framestudioPool?: pg.Pool;
};

export function getPool(): pg.Pool {
  if (!globalForPool.__framestudioPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set — see .env.example.");
    }

    globalForPool.__framestudioPool = new pg.Pool({
      connectionString,
      // Serverless platforms hand out few connections per instance; a small pool
      // that recycles quickly beats a large one that sits idle holding slots.
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return globalForPool.__framestudioPool;
}

export async function query<Row extends pg.QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await getPool().query<Row>(text, values as unknown[]);
  return result.rows;
}

/**
 * Runs `work` inside a transaction, rolling back if it throws.
 *
 * Writes that touch a design and its pages have to be atomic — a half-saved
 * design is worse than a failed save, because the editor would reload it as
 * truth.
 */
export async function transaction<T>(
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
