-- Decoration library: ready-made page templates.
--
-- Unlike designs and photos, library content has no owner — it is catalogue the
-- product ships and an operator curates. That difference drives the whole
-- shape: no `owner_id`, but a publish state, an order, and a premium flag,
-- because the questions asked of this table are "what may this user see, in
-- what order" rather than "what is mine".

create extension if not exists pg_trgm;

/*
 * Categories are shared by every library — templates, stickers, backgrounds,
 * text styles — because they are the same idea wearing four hats, and the
 * panels that show them are one component. `kind` keeps the namespaces apart:
 * "retro" means something in each of them.
 */
create type library_kind as enum ('template', 'sticker', 'background', 'text_style');

create table library_categories (
  id uuid primary key default gen_random_uuid(),
  kind library_kind not null,
  -- Stable identifier the client filters by (`wisuda`, `retro`).
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 80),
  -- Curated order in the panel; ties fall back to the label.
  position integer not null default 0,
  created_at timestamptz not null default now(),

  unique (kind, slug)
);

create table design_templates (
  id uuid primary key default gen_random_uuid(),
  -- What `CanvasPage.templateId` stores, so a page can still say which template
  -- it came from after the row's uuid is long forgotten.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  category_id uuid not null references library_categories (id) on delete restrict,
  -- Extra search terms beyond the label ("graduation", "toga").
  keywords text[] not null default '{}',

  -- Templates carry their own canvas size: picking a photostrip should give you
  -- a photostrip-shaped page, not squeeze one into whatever was open.
  width integer not null check (width between 16 and 20000),
  height integer not null check (height between 16 and 20000),

  background_type page_background_type not null,
  background jsonb not null check (jsonb_typeof(background) = 'object'),

  -- The composition, in the same vocabulary the editor instantiates. Kept as
  -- JSON for the same reason page objects are: it is a heterogeneous tree that
  -- is always read and written whole.
  slots jsonb not null,
  texts jsonb not null default '[]'::jsonb check (jsonb_typeof(texts) = 'array'),
  stickers jsonb not null default '[]'::jsonb check (jsonb_typeof(stickers) = 'array'),

  is_premium boolean not null default false,
  -- Null means a draft: visible to the admin dashboard, not to the editor.
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint design_templates_background_type_matches
    check (coalesce(background ->> 'type', '') = background_type::text)
);

/*
 * A template with no photo slot is not a template, and a slot without a
 * rectangle cannot be placed. Same shape of check as the page objects one, and
 * for the same reason: a subquery is needed, so it lives in a function.
 */
create or replace function template_slots_are_valid(slots jsonb)
returns boolean
language sql
immutable
as $$
  select jsonb_typeof(slots) = 'array'
     and jsonb_array_length(slots) > 0
     and not exists (
       select 1
       from jsonb_array_elements(slots) as slot
       where jsonb_typeof(slot) <> 'object'
          or coalesce(jsonb_typeof(slot -> 'x'), '') <> 'number'
          or coalesce(jsonb_typeof(slot -> 'y'), '') <> 'number'
          or coalesce(jsonb_typeof(slot -> 'width'), '') <> 'number'
          or coalesce(jsonb_typeof(slot -> 'height'), '') <> 'number'
     );
$$;

alter table design_templates
  add constraint design_templates_slots_shape check (template_slots_are_valid(slots));

-- The editor's list: published templates of one category, in curated order.
create index design_templates_browse_idx
  on design_templates (category_id, position, label)
  where published_at is not null;

-- Free-text search over the label. Trigram rather than full-text: the panel
-- searches as you type, and "wisu" has to match "Wisuda" before the word ends.
create index design_templates_label_trgm_idx
  on design_templates using gin (label gin_trgm_ops);

-- Keyword filtering (`keywords @> array['toga']`).
create index design_templates_keywords_idx
  on design_templates using gin (keywords);

create trigger design_templates_touch_updated_at
  before update on design_templates
  for each row execute function touch_updated_at();
