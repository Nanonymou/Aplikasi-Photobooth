-- Frame textures, as data.
--
-- A texture is a small seamless tile a border is stroked with, drawn in code
-- rather than downloaded: nothing to load, no resolution ceiling, and the same
-- tile redrawn at export size. What the code supplies is the *routine* — how
-- paper fibres, wood grain, or a metallic sheen are laid down. What each texture
-- actually is, is that routine plus two colours, which is why the catalogue's
-- own comment says gold linen is the linen routine with a different pair.
--
-- So the row can hold everything except the drawing: which routine, which
-- colours, what it is called, and whether the editor may offer it. That is
-- enough for an admin to add a texture — "Tembaga" is the sheen routine in
-- copper — without anybody deploying code, which is the difference between a
-- catalogue somebody curates and a constant somebody edits.
--
-- `kind` is an enum because each value names a function that has to exist. A row
-- claiming a routine nobody wrote would render as nothing at all, and a text
-- column would let one in.

create type texture_kind as enum ('kertas', 'kayu', 'linen', 'kilau', 'marmer');

create table frame_textures (
  id uuid primary key default gen_random_uuid(),
  -- What a border records when it wears this texture, so the look survives the
  -- row's uuid.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 120),
  kind texture_kind not null,
  keywords text[] not null default '{}',

  -- The tile is drawn from these: base fill first, then its markings. Checked
  -- as six-digit hex because the canvas takes them verbatim, and a colour it
  -- cannot parse paints transparent — a texture that silently does nothing.
  base text not null check (base ~ '^#[0-9a-fA-F]{6}$'),
  accent text not null check (accent ~ '^#[0-9a-fA-F]{6}$'),

  is_premium boolean not null default false,
  -- Null means a draft: visible to the console, not to the editor.
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A base and an accent that match draw a flat colour, which is not a texture.
  constraint frame_textures_two_colours check (lower(base) <> lower(accent))
);

create index frame_textures_browse_idx
  on frame_textures (position, label)
  where published_at is not null;

create index frame_textures_label_trgm_idx
  on frame_textures using gin (label gin_trgm_ops);

create trigger frame_textures_touch_updated_at
  before update on frame_textures
  for each row execute function touch_updated_at();
