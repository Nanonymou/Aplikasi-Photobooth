#!/usr/bin/env node
/**
 * Creates the three staff accounts a fresh installation needs.
 *
 * Everyone who signs up is a `tamu` — that is the column's default, and the
 * right one: a booth's visitors outnumber its staff by a few orders of
 * magnitude. Which leaves a chicken and egg for the roles that are not the
 * default. The admin console is guarded by a permission only an admin holds, so
 * the first admin cannot be made from inside the app; and until one exists,
 * nobody can promote anyone.
 *
 * This is the way in. It writes one profile per staff role — admin, editor,
 * operator — with the id the app derives from an email address, so signing in
 * with that address lands on the seeded profile rather than minting a second one
 * beside it.
 *
 * No passwords, because there are none: sign-in is a magic link or a social
 * provider, and what this seeds is *who* an address is, never how they prove it.
 * Seeding an address you do not control therefore grants nothing — which is also
 * why the defaults below are example.com addresses that nobody can receive mail
 * at. Override them for a real deployment:
 *
 *   SEED_ADMIN_EMAIL=you@studio.id \
 *   SEED_EDITOR_EMAIL=… SEED_OPERATOR_EMAIL=… \
 *   DATABASE_URL=postgres://… node scripts/seed-roles.mjs
 *
 * Idempotent, and deliberately conservative about what it overwrites: an
 * existing profile keeps its display name, and its role is only raised to the
 * seeded one when it is still the default `tamu`. Re-running this must never
 * demote a person somebody promoted on purpose, nor hand an existing account a
 * role it was not given — pass --force to overwrite roles anyway.
 */
import { createHash } from "node:crypto";

import pg from "pg";

const FORCE = process.argv.includes("--force");

/**
 * The same derivation `accountIdForEmail` uses in the app.
 *
 * Deterministic rather than random on purpose: the seeded row and the row a
 * sign-in would look for have to be the same row, and the only thing both sides
 * share is the address.
 */
function accountIdForEmail(email) {
  const hash = createHash("sha256")
    .update(`framestudio:account:${email.trim().toLowerCase()}`)
    .digest("hex");

  const version = "5";
  const variant = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    version + hash.slice(13, 16),
    variant + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

const STAFF = [
  {
    role: "admin",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
    name: "Admin FrameStudio",
  },
  {
    role: "editor",
    email: process.env.SEED_EDITOR_EMAIL ?? "editor@example.com",
    name: "Editor Konten",
  },
  {
    role: "operator",
    email: process.env.SEED_OPERATOR_EMAIL ?? "operator@example.com",
    name: "Operator Booth",
  },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query("begin");

    for (const person of STAFF) {
      const email = person.email.trim().toLowerCase();
      const id = accountIdForEmail(email);

      const { rows } = await client.query(
        `insert into user_profiles (id, email, display_name, role, provider)
         values ($1, $2, $3, $4, 'email')
         on conflict (id) do update
            set display_name = coalesce(user_profiles.display_name, excluded.display_name),
                role = case
                         when $5::boolean then excluded.role
                         when user_profiles.role = 'tamu' then excluded.role
                         else user_profiles.role
                       end
         returning role, (xmax = 0) as created`,
        [id, email, person.name, person.role, FORCE],
      );

      const { role, created } = rows[0];
      const state =
        created ? "created" : role === person.role ? "up to date" : `left as ${role}`;

      console.log(`  ${person.role.padEnd(8)} ${email.padEnd(28)} ${state}`);
    }

    await client.query("commit");

    console.log(
      FORCE
        ? "Seeded 3 staff roles (roles overwritten)."
        : "Seeded 3 staff roles. Existing roles were left alone; use --force to overwrite.",
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
