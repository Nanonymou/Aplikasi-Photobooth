-- Temporary home for finished exports.
--
-- A render is derived: the design that produced it is still in the database, so
-- the file can always be made again. Keeping it is therefore a convenience with
-- a deadline — long enough for a download to start, a print queue to pick it
-- up, or a share link to be created from it, and no longer.
--
-- The row is what makes the deadline real. Storage is content-addressed and
-- would happily keep bytes forever; this table is what a sweep reads to decide
-- what may go.

create table render_files (
  storage_key text primary key
    check (storage_key ~ '^[0-9a-f]{64}\.(jpg|png|webp|pdf)$'),
  owner_id uuid not null,
  content_type text not null,
  filename text not null check (length(btrim(filename)) between 1 and 200),
  bytes integer not null check (bytes > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  -- Twelve hours: a guest downloads within minutes, a print operator within the
  -- session. Anything that must outlive that becomes a share link, which has
  -- its own, longer clock.
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now()
);

create index render_files_owner_recent_idx
  on render_files (owner_id, created_at desc);

create index render_files_expiring_idx on render_files (expires_at);
