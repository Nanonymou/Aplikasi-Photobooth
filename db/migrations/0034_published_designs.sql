-- Publishing a design, and what the showcase is built from.
--
-- A design in `designs` belongs to whoever made it and is nobody else's
-- business. Publishing is a separate act with separate consequences — an address
-- strangers can open, a name attached to it in public, and other people starting
-- their own work from it — so it is a separate row rather than a boolean.
--
-- That also gives the two lifetimes room to differ. Unpublishing has to be
-- possible without deleting the design, deleting the design has to take the
-- publication with it, and the credit a remix carries has to outlive both.

create table published_designs (
  id uuid primary key default gen_random_uuid(),

  -- The design being shown. Cascade: a design that is deleted stops being
  -- published, because there is nothing left to show.
  design_id uuid not null references designs (id) on delete cascade,

  -- Who published it. No foreign key — the showcase carries a maker's name and
  -- has to keep carrying it after they close their account, or every remix
  -- credit in the gallery would quietly lose its subject.
  account_id uuid not null,

  -- The public address. Permanent by intent: a showcase link gets pasted into
  -- group chats and survives the title being edited.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  -- The copy as published. A snapshot, not a view of the design: renaming a
  -- working file should not silently rename it on somebody else's wall.
  title text not null check (length(btrim(title)) between 1 and 160),
  author_name text not null check (length(btrim(author_name)) between 1 and 120),

  category text not null check (
    category in ('pernikahan', 'wisuda', 'ulang-tahun', 'hari-raya', 'komunitas')
  ),

  -- Free text the maker writes, unlike `category` which is a closed set.
  tags text[] not null default '{}'
    check (cardinality(tags) <= 8 and array_position(tags, null) is null),

  -- The page size at publication, so the wall can keep each card its own shape
  -- without loading the design.
  width integer not null check (width between 16 and 20000),
  height integer not null check (height between 16 and 20000),

  -- What it was started from, when it was started from somebody else's. Set
  -- null on delete rather than cascade: losing the original must not delete the
  -- remix, and the credit is allowed to become "from a design that is gone".
  remix_of_id uuid references published_designs (id) on delete set null,
  -- And a design cannot be a remix of itself.
  constraint published_designs_not_own_remix check (remix_of_id is null or remix_of_id <> id),

  published_at timestamptz not null default now(),
  -- Withdrawn from the wall but still addressable, so a link somebody sent last
  -- week can say "the maker took this down" rather than 404.
  unpublished_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table published_designs is
  'One row per published design. The copy is a snapshot; unpublishing is a timestamp, not a delete.';

create trigger published_designs_touch_updated_at
  before update on published_designs
  for each row execute function touch_updated_at();

-- One design is on the wall once. Publishing it again is an edit of this row,
-- not a second card competing with the first.
create unique index published_designs_design_idx on published_designs (design_id);

-- The wall: live publications, newest first, filtered by category.
create index published_designs_live_idx
  on published_designs (category, published_at desc)
  where unpublished_at is null;

-- Search, on the title people actually type at. Same reasoning as the help
-- centre's: the body of a design is pictures, so there is nothing else to match.
create index published_designs_title_trgm_idx
  on published_designs using gin (title gin_trgm_ops)
  where unpublished_at is null;

-- A maker's own published work, for their profile and their creator dashboard.
create index published_designs_account_idx
  on published_designs (account_id, published_at desc);

-- Likes.
--
-- A row per person per design rather than a counter on the design, because the
-- question "have I liked this" is asked on every card of every visit, and a
-- counter cannot answer it. The count is `count(*)`, which is always right;
-- a denormalised total is a number that drifts and then has to be explained.
create table design_likes (
  published_id uuid not null references published_designs (id) on delete cascade,
  -- The owner id from the cookie, which a signed-out visitor also has: liking is
  -- exactly the kind of small gesture worth allowing before an account.
  owner_id uuid not null,
  created_at timestamptz not null default now(),

  primary key (published_id, owner_id)
);

comment on table design_likes is
  'One row per liker per design. The count is count(*); "did I like this" is a lookup.';

-- Counting a design's likes, and listing what one visitor has liked.
create index design_likes_owner_idx on design_likes (owner_id, created_at desc);

-- Which publication a design was started from.
--
-- On `designs`, not on `published_designs`, because a remix is a remix from the
-- moment somebody starts editing — long before they decide whether to publish
-- it, and whether or not they ever do.
alter table designs
  add column remix_of_id uuid references published_designs (id) on delete set null;

comment on column designs.remix_of_id is
  'The published design this one was started from. Kept even if that publication is later withdrawn.';

-- How many designs have been started from a publication — the "N remix" on a
-- card, counted rather than stored.
create index designs_remix_of_idx
  on designs (remix_of_id)
  where remix_of_id is not null;
