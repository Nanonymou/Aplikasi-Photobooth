-- Auth sessions: the record behind a signed-in browser.
--
-- Until now the cookie *was* the identity — it carried the account id, so the
-- server believed whatever id it was handed. That is fine for a stand-in and
-- indefensible for a session: the id is derived from an email address, so anyone
-- who knows someone's email could mint their own cookie. A session token fixes
-- the shape of the problem, not just this instance of it: the cookie now carries
-- an opaque secret that means nothing on its own, and the server decides who it
-- belongs to.
--
-- Only the hash is stored. A leaked backup, a stray log, or a curious operator
-- then holds something that cannot be replayed — the same reason nobody stores
-- passwords in the clear.

create table auth_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null,

  -- sha256 of the token the browser holds, hex. Unique so a lookup is an index
  -- hit rather than a scan, and so a repeat token is impossible by construction.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),

  created_at timestamptz not null default now(),
  -- Touched on every request the session is used for; what the sliding refresh
  -- is measured from, and what tells an operator whether a session is dormant.
  last_used_at timestamptz not null default now(),
  -- Slides forward as the session is used, up to `absolute_expires_at`.
  expires_at timestamptz not null default (now() + interval '30 days'),
  -- The ceiling refreshing cannot push past: a session must end eventually, or
  -- "stay signed in" quietly becomes "signed in forever".
  absolute_expires_at timestamptz not null default (now() + interval '180 days'),

  -- Set when signed out, so an ended session is remembered as ended rather than
  -- vanishing — the difference between "this was revoked" and "no such session".
  revoked_at timestamptz,

  constraint auth_sessions_expiry_within_absolute
    check (expires_at <= absolute_expires_at)
);

comment on table auth_sessions is
  'One row per signed-in browser. The cookie holds the token; this holds its hash.';

-- Every request that resolves a session: hash the cookie, look it up here.
-- Partial, because an expired or revoked row is never the answer to that query.
create index auth_sessions_live_idx
  on auth_sessions (token_hash)
  where revoked_at is null;

-- "Sign me out everywhere", and the console's own view of an account's devices.
create index auth_sessions_account_idx on auth_sessions (account_id, created_at desc);

-- What a cleanup sweep collects.
create index auth_sessions_expired_idx on auth_sessions (absolute_expires_at);
