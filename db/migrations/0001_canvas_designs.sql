-- Canvas designs: the projects the editor loads, autosaves, and exports.
--
-- Shape follows the editor's own model (src/types/editor.ts): a design owns an
-- ordered list of pages, and a page owns an ordered list of objects.
--
-- Pages are rows; objects are JSONB. Objects are a heterogeneous union (slot,
-- image, text, sticker, shape) whose ORDER IS the layer order, and almost every
-- edit rewrites the whole array — dragging one object changes its position, its
-- z-order, or both. Normalising that into a table would buy per-object queries
-- nobody makes, and cost a delete-and-reinsert on every autosave. The page is
-- the smallest unit the editor ever saves, so it is the smallest unit stored.
--
-- Plain PostgreSQL, no extensions beyond pgcrypto — it runs the same on a local
-- cluster and on Supabase (which is PostgreSQL). Owner rows are referenced by
-- id only; wiring `owner_id` to an auth provider's user table, and the RLS that
-- goes with it, lands with the authentication work.

create extension if not exists pgcrypto;

-- Kept in sync with PageBackground in src/types/editor.ts.
create type page_background_type as enum (
  'transparent',
  'solid',
  'gradient',
  'pattern',
  'image'
);

create table designs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  -- Bumped on every accepted write; the autosave endpoint uses it to detect a
  -- second tab that saved in the meantime instead of silently overwriting it.
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft delete: a photobooth session's design is the guest's only copy, so
  -- "delete" hides it and leaves it recoverable.
  deleted_at timestamptz
);

comment on column designs.version is
  'Optimistic concurrency token; a write must send the version it read.';

-- Page ids come from the editor (`page_1`, `page_ab12cd34`) and are only ever
-- meaningful inside their own design, so they are scoped that way rather than
-- forced into a uuid the client would have to adopt mid-edit. The design id, by
-- contrast, is server-issued: it identifies the row across users.
create table design_pages (
  design_id uuid not null references designs (id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 64),
  -- 0-based, matches the array index in the editor.
  position integer not null check (position >= 0),
  name text not null check (length(btrim(name)) between 1 and 200),
  -- Id from the bundled template catalogue; null once the page diverges.
  template_id text,
  width integer not null check (width between 16 and 20000),
  height integer not null check (height between 16 and 20000),
  background_type page_background_type not null,
  -- The remaining background fields differ per type (colours, angle, pattern
  -- id, src), so they ride along as JSON next to the discriminator.
  background jsonb not null check (jsonb_typeof(background) = 'object'),
  objects jsonb not null default '[]'::jsonb
    check (jsonb_typeof(objects) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (design_id, id),

  -- Page order is a permutation, enforced per design. Deferrable so a reorder
  -- can renumber several rows inside one transaction.
  constraint design_pages_position_unique unique (design_id, position)
    deferrable initially deferred
);

-- The discriminator lives in a column so it can be constrained and indexed, but
-- it must not drift from the copy inside the JSON the editor reads back.
--
-- `coalesce` matters: a missing key makes `->>` return NULL, and a CHECK that
-- evaluates to NULL passes. Without it a background carrying no `type` at all —
-- exactly the malformed case worth catching — would slip through.
alter table design_pages
  add constraint design_pages_background_type_matches
  check (coalesce(background ->> 'type', '') = background_type::text);

/*
 * Every object carries an id and a kind; anything past that is the editor's
 * business and deliberately not policed here.
 *
 * The check lives in a function because a CHECK constraint cannot contain a
 * subquery, and walking a JSON array needs one. Marked immutable so the planner
 * may use it in a constraint at all — it only reads its argument.
 */
create or replace function canvas_objects_are_valid(objects jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(objects) = 'array'
     and not exists (
       select 1
       from jsonb_array_elements(objects) as object
       -- coalesce again: a missing key yields NULL, and NULL <> 'string' is
       -- NULL, which WHERE reads as no match — the object would pass.
       where jsonb_typeof(object) <> 'object'
          or coalesce(jsonb_typeof(object -> 'id'), '') <> 'string'
          or coalesce(jsonb_typeof(object -> 'kind'), '') <> 'string'
     );
$$;

alter table design_pages
  add constraint design_pages_objects_shape
  check (canvas_objects_are_valid(objects));

-- The dashboard lists a user's designs newest-first; deleted ones stay out of
-- the index entirely.
create index designs_owner_recent_idx
  on designs (owner_id, updated_at desc)
  where deleted_at is null;

create index design_pages_design_position_idx
  on design_pages (design_id, position);

create or replace function touch_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger designs_touch_updated_at
  before update on designs
  for each row execute function touch_updated_at();

create trigger design_pages_touch_updated_at
  before update on design_pages
  for each row execute function touch_updated_at();

/*
 * A design's `updated_at` has to reflect edits to its pages, because that is
 * what the editor actually changes — the design row itself rarely moves. Doing
 * it in a trigger keeps "last edited" honest no matter which endpoint wrote.
 */
create or replace function touch_design_from_page() returns trigger
language plpgsql
as $$
begin
  update designs
     set updated_at = now()
   where id = coalesce(new.design_id, old.design_id);
  return null;
end;
$$;

create trigger design_pages_touch_design
  after insert or update or delete on design_pages
  for each row execute function touch_design_from_page();
