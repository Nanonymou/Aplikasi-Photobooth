-- Decoration library: page backgrounds.
--
-- A library background is exactly one `PageBackground` value plus the label the
-- panel shows for it, so the payload column reuses the same discriminated shape
-- the editor and `design_pages` already speak. Storing it any other way would
-- mean translating on the way in and out for no gain.
--
-- The per-type fields differ (a solid has a colour, a gradient has two and an
-- angle, a pattern names a tile), so they stay inside the JSON while the
-- discriminator gets a column of its own — the same split as `design_pages`,
-- and for the same reason: it is what every query filters on.

create table backgrounds (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  category_id uuid not null references library_categories (id) on delete restrict,
  keywords text[] not null default '{}',

  background_type page_background_type not null,
  background jsonb not null check (jsonb_typeof(background) = 'object'),

  is_premium boolean not null default false,
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint backgrounds_type_matches
    check (coalesce(background ->> 'type', '') = background_type::text)
);

/*
 * Each background type has its own required fields, and a missing one shows up
 * as a page that renders blank rather than as an error — the failure mode worth
 * spending a constraint on.
 *
 * `transparent` needs nothing beyond its type; `image` is here for completeness
 * but has no library rows yet (an uploaded background lands with the asset
 * pipeline, not the catalogue).
 */
create or replace function background_payload_is_valid(payload jsonb)
returns boolean
language sql
immutable
as $$
  select case payload ->> 'type'
    when 'transparent' then true
    when 'solid' then coalesce(jsonb_typeof(payload -> 'color'), '') = 'string'
    when 'gradient' then coalesce(jsonb_typeof(payload -> 'from'), '') = 'string'
                    and coalesce(jsonb_typeof(payload -> 'to'), '') = 'string'
                    and coalesce(jsonb_typeof(payload -> 'angle'), '') = 'number'
    when 'pattern' then coalesce(jsonb_typeof(payload -> 'pattern'), '') = 'string'
                   and coalesce(jsonb_typeof(payload -> 'foreground'), '') = 'string'
                   and coalesce(jsonb_typeof(payload -> 'background'), '') = 'string'
                   and coalesce(jsonb_typeof(payload -> 'scale'), '') = 'number'
    when 'image' then coalesce(jsonb_typeof(payload -> 'src'), '') = 'string'
    else false
  end;
$$;

alter table backgrounds
  add constraint backgrounds_payload_shape check (background_payload_is_valid(background));

create index backgrounds_browse_idx
  on backgrounds (category_id, position, label)
  where published_at is not null;

create index backgrounds_label_trgm_idx
  on backgrounds using gin (label gin_trgm_ops);

create index backgrounds_keywords_idx
  on backgrounds using gin (keywords);

create trigger backgrounds_touch_updated_at
  before update on backgrounds
  for each row execute function touch_updated_at();

/*
 * The same guarantee is worth having on user designs, where a malformed
 * background reaches the canvas renderer directly. 0001 only checked that the
 * discriminator matched; this checks the payload behind it.
 */
alter table design_pages
  add constraint design_pages_background_shape
  check (background_payload_is_valid(background));
