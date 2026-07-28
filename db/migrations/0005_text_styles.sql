-- Decoration library: artistic text styles.
--
-- A style is a starting point, not a locked design: picking one drops a text
-- object on the canvas with these settings, and everything about it stays
-- editable afterwards. That is why the columns mirror `TextObject` in
-- src/types/editor.ts rather than describing some separate "style" vocabulary
-- the editor would have to translate.
--
-- Plain typographic settings get columns — they are shared by every style and
-- worth constraining. Gradient, stroke and shadow are optional sub-objects with
-- their own little shapes, so they stay JSON: a style either has a gradient or
-- it does not, and spreading five nullable columns per effect across the table
-- would only make "has a gradient" harder to ask.

create table text_styles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  category_id uuid not null references library_categories (id) on delete restrict,
  keywords text[] not null default '{}',

  -- The words the preview shows and the object starts with ("JUDUL KAMU").
  sample_text text not null check (length(sample_text) between 1 and 200),
  font_family text,
  font_size integer not null check (font_size between 4 and 2000),
  font_weight integer not null default 400 check (font_weight between 100 and 900),
  letter_spacing real not null default 0,
  line_height real not null default 1.2 check (line_height > 0),
  align text not null default 'center' check (align in ('left', 'center', 'right')),
  italic boolean not null default false,

  fill text not null check (fill ~ '^#[0-9a-fA-F]{6}$'),
  -- { from, to, angle } — overrides `fill` when present.
  gradient jsonb check (gradient is null or jsonb_typeof(gradient) = 'object'),
  stroke text check (stroke is null or stroke ~ '^#[0-9a-fA-F]{6}$'),
  stroke_width real check (stroke_width is null or stroke_width >= 0),
  -- { color, blur, offsetX, offsetY }
  shadow jsonb check (shadow is null or jsonb_typeof(shadow) = 'object'),
  -- Baseline arc in degrees; positive bulges upward, 0 is a straight line.
  curve real not null default 0 check (curve between -360 and 360),

  is_premium boolean not null default false,
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A stroke colour without a width paints nothing, and a width without a
  -- colour has nothing to paint: they arrive together or not at all.
  constraint text_styles_stroke_pair
    check ((stroke is null) = (stroke_width is null))
);

/*
 * Gradients and shadows are small enough to check exactly, and getting one
 * wrong is the kind of thing that renders as "nothing happened" rather than as
 * an error — worth catching at the door.
 */
create or replace function text_gradient_is_valid(gradient jsonb)
returns boolean
language sql
immutable
as $$
  -- coalesce, because a missing key makes jsonb_typeof NULL, and a CHECK that
  -- evaluates to NULL passes — a gradient missing its angle would slip by.
  select gradient is null
      or (coalesce(jsonb_typeof(gradient -> 'from'), '') = 'string'
      and coalesce(jsonb_typeof(gradient -> 'to'), '') = 'string'
      and coalesce(jsonb_typeof(gradient -> 'angle'), '') = 'number');
$$;

create or replace function text_shadow_is_valid(shadow jsonb)
returns boolean
language sql
immutable
as $$
  select shadow is null
      or (coalesce(jsonb_typeof(shadow -> 'color'), '') = 'string'
      and coalesce(jsonb_typeof(shadow -> 'blur'), '') = 'number'
      and coalesce(jsonb_typeof(shadow -> 'offsetX'), '') = 'number'
      and coalesce(jsonb_typeof(shadow -> 'offsetY'), '') = 'number');
$$;

alter table text_styles
  add constraint text_styles_gradient_shape check (text_gradient_is_valid(gradient)),
  add constraint text_styles_shadow_shape check (text_shadow_is_valid(shadow));

create index text_styles_browse_idx
  on text_styles (category_id, position, label)
  where published_at is not null;

create index text_styles_label_trgm_idx
  on text_styles using gin (label gin_trgm_ops);

create index text_styles_keywords_idx
  on text_styles using gin (keywords);

create trigger text_styles_touch_updated_at
  before update on text_styles
  for each row execute function touch_updated_at();
