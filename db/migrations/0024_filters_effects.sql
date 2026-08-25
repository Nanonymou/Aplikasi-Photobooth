-- The look catalogue: colour filters, and effects laid over a photo.
--
-- The other four libraries — templates, stickers, backgrounds, text styles —
-- moved into the database in migrations 0004 through 0007 so an admin could
-- curate them: publish, unpublish, mark premium, reorder. Filters and effects
-- are the same kind of thing wearing a fifth hat, and are still a TypeScript
-- constant, which means the console's content page can manage every part of the
-- editor's palette except the part people actually reach for first.
--
-- Two tables rather than one, because the two are not the same shape. A filter
-- is a colour treatment and its whole definition is a CSS `filter` string, so a
-- preview and the final render agree by construction. An effect is a layer
-- painted *above* the photo — grain, a light leak, falling snow — and needs a
-- background, a blend mode, an opacity, and for weather, the particle
-- description the canvas animates. Folding both into one table would mean a row
-- where half the columns are always null and a CHECK explaining which half.
--
-- Categories are enums on the row rather than rows in `library_categories`. The
-- other libraries have curated, growable category lists; these five filter
-- families and three effect groups are a design decision about how the panel is
-- organised — "something cinematic", "something black and white" — and a family
-- appearing because somebody inserted a row would leave the panel with a tab it
-- has no idea how to label.

create type filter_category as enum (
  'dasar',
  'potret',
  'sinematik',
  'vintage',
  'monokrom'
);

create type effect_category as enum ('partikel', 'cahaya', 'tekstur');

create type effect_blend as enum (
  'screen',
  'overlay',
  'soft-light',
  'multiply',
  'lighten'
);

create table photo_filters (
  id uuid primary key default gen_random_uuid(),
  -- What a slot records when a photo wears this filter, so the look survives
  -- long after the row's uuid is forgotten. `none` is a real row: "no filter" is
  -- a choice the panel offers, not the absence of one.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  category filter_category not null,
  keywords text[] not null default '{}',

  -- A CSS `filter` value. Empty is legal and means the untouched photo; the
  -- length cap is what stops this column becoming a stylesheet.
  css text not null default '' check (length(css) <= 500),

  is_premium boolean not null default false,
  -- Null means a draft: visible to the console, not to the editor.
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table visual_effects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  category effect_category not null,
  keywords text[] not null default '{}',

  -- One line saying what it reads as; the panel shows it under the name.
  hint text not null check (length(btrim(hint)) between 1 and 200),

  -- The CSS `background` painted above the photo, and how it blends in.
  overlay text not null check (length(btrim(overlay)) between 1 and 2000),
  blend effect_blend not null,
  opacity real not null check (opacity > 0 and opacity <= 1),

  /*
   * Weather only: the particle description the canvas draws and animates.
   * Stored as the same object the CSS preview was generated from, so the swatch
   * in the panel and the field on the canvas cannot describe different snow.
   */
  particle jsonb check (particle is null or jsonb_typeof(particle) = 'object'),

  is_premium boolean not null default false,
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A particle spec is only meaningful for the weather group, and a weather
  -- effect without one would render as a still image of nothing.
  constraint visual_effects_particle_is_weather
    check ((particle is not null) = (category = 'partikel'))
);

/*
 * Every number a particle needs, checked at the door.
 *
 * A missing key here does not raise an error at render time — it produces a
 * field of NaN-positioned specks, which draws as nothing at all. That is the
 * failure worth spending a constraint on.
 */
create or replace function particle_spec_is_valid(spec jsonb)
returns boolean
language sql
immutable
as $$
  -- coalesce, because a missing key makes jsonb_typeof NULL, and a CHECK that
  -- evaluates to NULL passes — a spec missing its speed would slip through.
  select spec is null
      or (coalesce(jsonb_typeof(spec -> 'size'), '') = 'number'
      and coalesce(jsonb_typeof(spec -> 'spacing'), '') = 'number'
      and coalesce(jsonb_typeof(spec -> 'color'), '') = 'string'
      and coalesce(jsonb_typeof(spec -> 'tilt'), '') = 'number'
      and coalesce(jsonb_typeof(spec -> 'streak'), '') = 'number'
      and coalesce(jsonb_typeof(spec -> 'speed'), '') = 'number');
$$;

alter table visual_effects
  add constraint visual_effects_particle_shape check (particle_spec_is_valid(particle));

-- The panel reads one family at a time, in curated order, and only what is live.
create index photo_filters_browse_idx
  on photo_filters (category, position, label)
  where published_at is not null;

create index visual_effects_browse_idx
  on visual_effects (category, position, label)
  where published_at is not null;

-- The console's library search matches names across everything at once.
create index photo_filters_label_trgm_idx
  on photo_filters using gin (label gin_trgm_ops);

create index visual_effects_label_trgm_idx
  on visual_effects using gin (label gin_trgm_ops);

create trigger photo_filters_touch_updated_at
  before update on photo_filters
  for each row execute function touch_updated_at();

create trigger visual_effects_touch_updated_at
  before update on visual_effects
  for each row execute function touch_updated_at();
