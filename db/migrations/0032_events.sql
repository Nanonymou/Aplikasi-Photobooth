-- Events: a booth runs more than one of them.
--
-- `event_branding` (0018) is a single row, which was right while the question
-- was "what does this installation call itself". It is the wrong shape for what
-- an operator actually does: a wedding on Saturday and a company party on
-- Sunday, each with its own name, its own welcome line, its own exit PIN, and —
-- most of all — its own photos. Today the second one inherits the first one's
-- name and its guests' pictures sit in the same undifferentiated pile.
--
-- So an event becomes a row, and the branding lives on it. The singleton does
-- not go away and does not become a second copy of the same thing: it keeps
-- exactly one job, which is to say which event the booth is running right now
-- (`active_event_id`), plus the fallback copy for an installation that has never
-- created one. A booth that is not running an event still has a face.

create table events (
  id uuid primary key default gen_random_uuid(),

  -- Whose event. No foreign key, for the same reason `payments` has none: an
  -- event and the photos taken at it outlive the staff account that set it up.
  account_id uuid not null,

  -- What it is called, and how it welcomes people. The same three fields the
  -- kiosk and slideshow already read, now per event rather than per install.
  name text not null check (length(btrim(name)) between 1 and 120),
  tagline text not null
    default 'Bergaya, jepret, dan bawa pulang kenangannya.'
    check (length(btrim(tagline)) between 1 and 200),
  accent text not null default 'violet'
    check (accent in ('violet', 'blue', 'emerald', 'rose', 'amber')),

  -- The organizer's exit PIN, hashed. Per event because the person running
  -- Saturday's wedding is not necessarily the person running Sunday's party, and
  -- handing them the same PIN is how a PIN stops being a boundary.
  pin_hash text,

  -- When it runs. Both optional: an operator setting up on the morning of often
  -- does not know when it will end, and refusing to save until they do is a form
  -- that fights its user.
  starts_at timestamptz,
  ends_at timestamptz,
  constraint events_ends_after_start
    check (starts_at is null or ends_at is null or ends_at > starts_at),

  -- Archived rather than deleted: the photos taken at an event outlive the
  -- operator's interest in seeing it in a list.
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid
);

comment on table events is
  'One row per event a booth runs. Branding lives here; event_branding says which one is live.';

create trigger events_touch_updated_at
  before update on events
  for each row execute function touch_updated_at();

-- The operator's list: their events, newest first, archived ones out of the way.
create index events_account_idx
  on events (account_id, coalesce(starts_at, created_at) desc)
  where archived_at is null;

-- Which event the booth is running now.
--
-- On the singleton rather than on `events`, because "is this the live one" is a
-- property of the booth, not of the event — two rows both claiming to be live is
-- a state that cannot exist if only one column can name one. `on delete set
-- null` so removing an event puts the booth back on its fallback branding rather
-- than leaving it pointing at nothing.
alter table event_branding
  add column active_event_id uuid references events (id) on delete set null;

comment on column event_branding.active_event_id is
  'The event the booth is currently running, or null to use this row''s own branding.';

-- Which event a photo session happened at.
--
-- Nullable, and stays nullable: sessions recorded before events existed belong
-- to no event and never will, and a booth used for a quick test is not an event
-- either. `on delete set null` because deleting an event must not take the
-- photographs with it — that is exactly the data an operator would be most upset
-- to lose, and archiving exists so they rarely have to choose.
alter table photo_sessions
  add column event_id uuid references events (id) on delete set null;

-- An event's photos, in the order they were taken: the gallery a slideshow reads
-- and the export an operator hands over at the end of the night.
create index photo_sessions_event_idx
  on photo_sessions (event_id, started_at)
  where event_id is not null;
