-- Which design a share came from.
--
-- A share has always been "these bytes, behind this code" — enough to hand
-- someone a link, and not enough to answer the question a gallery asks about
-- every card it draws: has this one been shared? Without the link the badge is
-- either absent or a guess, and a guess about whether something is public is
-- the wrong thing to guess about.
--
-- Nullable, because plenty of shares have no design behind them: a photo
-- uploaded straight from a phone is a share of a file, not of a project. The
-- column records a fact when there is one to record, and stays empty otherwise.
--
-- `on delete set null` rather than cascade: deleting a design must not silently
-- break links already handed out. The guest holding the QR code did nothing
-- wrong, and the file they were given still exists — the share simply stops
-- knowing where it came from.

alter table shares
  add column design_id uuid references designs (id) on delete set null;

-- Answers "is this design shared right now" — the gallery asks it once per card,
-- so the index carries only live shares and the query never touches the rest.
create index shares_design_live_idx
  on shares (design_id)
  where design_id is not null and revoked_at is null;
