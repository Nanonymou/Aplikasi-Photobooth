-- Decoration library: stickers.
--
-- Two kinds live in one table because they are one thing to the user — an
-- item in a grid they drag onto the canvas — and one thing to the panel that
-- lists them. What differs is only how they are drawn:
--
--   emoji  a glyph the browser renders; no asset to serve, no licence to track
--   image  artwork in storage, addressed by the same content key photos use
--
-- Splitting them into two tables would double every query the library makes
-- and buy nothing; a `kind` column plus a check that the right field is filled
-- keeps each row honest.

create type sticker_kind as enum ('emoji', 'image');

create table stickers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  category_id uuid not null references library_categories (id) on delete restrict,
  keywords text[] not null default '{}',

  kind sticker_kind not null default 'emoji',
  -- Emoji stickers: the glyph itself. Short, because a sticker is one symbol —
  -- and long enough for the ZWJ sequences that make up family or flag emoji.
  glyph text check (glyph is null or length(glyph) between 1 and 32),
  -- Image stickers: `<sha256>.<ext>` in photo storage, plus the intrinsic size
  -- the editor needs to place the artwork at its own aspect ratio.
  storage_key text check (storage_key is null or storage_key ~ '^[0-9a-f]{64}\.(jpg|png|webp)$'),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),

  is_premium boolean not null default false,
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Exactly one representation, matching the declared kind. Without this a row
  -- could claim to be an image and carry nothing to draw.
  constraint stickers_representation check (
    case kind
      when 'emoji' then glyph is not null and storage_key is null
      when 'image' then storage_key is not null and glyph is null
                        and width is not null and height is not null
    end
  )
);

create index stickers_browse_idx
  on stickers (category_id, position, label)
  where published_at is not null;

create index stickers_label_trgm_idx
  on stickers using gin (label gin_trgm_ops);

-- The sticker panel's search is keyword-heavy: people type "graduation" for a
-- sticker labelled "Topi toga".
create index stickers_keywords_idx
  on stickers using gin (keywords);

create trigger stickers_touch_updated_at
  before update on stickers
  for each row execute function touch_updated_at();
