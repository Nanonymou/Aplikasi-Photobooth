#!/usr/bin/env node
/**
 * Applies every SQL file in db/migrations that has not run yet.
 *
 * Deliberately tiny: migrations are plain SQL, applied in filename order, each
 * inside its own transaction, and recorded in `schema_migrations`. That is the
 * whole contract — no DSL to learn, and the same files run against a local
 * cluster or a hosted PostgreSQL.
 *
 *   DATABASE_URL=postgres://… node scripts/migrate.mjs [--status]
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import pg from "pg";

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations",
);

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const { rows } = await client.query(
      "select name from schema_migrations order by name",
    );
    const applied = new Set(rows.map((row) => row.name));

    const files = (await readdir(MIGRATIONS_DIR))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    if (process.argv.includes("--status")) {
      for (const file of files) {
        console.log(`${applied.has(file) ? "applied" : "pending"}  ${file}`);
      }
      return;
    }

    const pending = files.filter((file) => !applied.has(file));
    if (pending.length === 0) {
      console.log("Database is up to date.");
      return;
    }

    for (const file of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`applying ${file} … `);

      // One transaction per file: a migration either lands whole or not at all.
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [
          file,
        ]);
        await client.query("commit");
        console.log("ok");
      } catch (error) {
        await client.query("rollback");
        console.log("failed");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
