-- Saving a design, which is not the same as liking one.
--
-- `design_likes` (0034) is a signal to the person who made it — a public number
-- on a card. Saving is a note to yourself: a shortlist somebody comes back to,
-- and nobody else's business. Collapsing them into one star would mean liking
-- something also filed it, and unfiling it also took the like away.
--
-- Same shape as likes because the same two questions are asked of both — how
-- many, and did I — and the same answer is right: a row per person, counted
-- rather than stored.

create table design_saves (
  published_id uuid not null references published_designs (id) on delete cascade,
  -- The owner id from the cookie, like likes: saving is worth allowing before an
  -- account exists, and a guest who later signs in brings their saves with them
  -- through the same session claim every other guest record travels on.
  owner_id uuid not null,
  created_at timestamptz not null default now(),

  primary key (published_id, owner_id)
);

comment on table design_saves is
  'One row per person per saved design. Private to that person, unlike a like.';

-- Somebody's own shortlist, newest first — the "Tersimpan" view of the wall.
create index design_saves_owner_idx on design_saves (owner_id, created_at desc);
