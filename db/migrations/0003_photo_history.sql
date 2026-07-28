-- User photo history: the shots someone can come back to.
--
-- 0002 recorded what a photo IS. This adds what a person actually looks for
-- afterwards — "the strip we took at the wedding" rather than a flat wall of
-- files — plus the two lifecycles a photobooth needs: a guest removing a shot,
-- and the kiosk forgetting one on its own.

/*
 * A session is one sitting at the booth: the countdown fires a few times and
 * those shots belong together. Grouping them is what makes the history
 * readable, and it is also the unit a guest thinks in when they ask for their
 * photos back.
 */
create table photo_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  -- What the guest called it, or what the app named it from the design.
  label text check (label is null or length(btrim(label)) between 1 and 200),
  -- The design the shots were taken for, if the session started from one.
  -- Nulled rather than cascaded: deleting a design should not erase the photos
  -- taken during it.
  design_id uuid references designs (id) on delete set null,
  started_at timestamptz not null default now(),
  -- Moves with the last photo added; a session has no explicit end in the UI.
  ended_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table photos
  add column session_id uuid references photo_sessions (id) on delete set null,
  -- Order within the session: shot 1, shot 2, shot 3.
  add column position integer check (position is null or position >= 0),
  -- Guest removed it from their history; the bytes stay until the purge job
  -- runs, so an accidental tap is recoverable.
  add column deleted_at timestamptz,
  /*
   * When the booth may forget this photo. A shared kiosk holds strangers'
   * faces, so keeping them forever is a liability, not a feature; the default
   * gives a guest a month to come back and the operator one switch to change.
   */
  add column expires_at timestamptz not null
    default (now() + interval '30 days');

-- The history view: my sessions, newest first.
create index photo_sessions_owner_recent_idx
  on photo_sessions (owner_id, ended_at desc);

-- Photos of one session, in the order they were taken.
create index photos_session_position_idx
  on photos (session_id, position)
  where session_id is not null;

-- What the purge job scans. Partial, because deleted rows are the minority and
-- an index over live rows only is the one that stays small.
create index photos_expiring_idx
  on photos (expires_at)
  where deleted_at is null;

-- The history list skips removed photos entirely.
drop index photos_owner_recent_idx;
create index photos_owner_recent_idx
  on photos (owner_id, created_at desc)
  where deleted_at is null;

/*
 * A session's `ended_at` follows its last photo, so "newest first" stays true
 * as a sitting continues. Doing it in a trigger means it holds no matter which
 * endpoint wrote the photo.
 */
create or replace function touch_session_from_photo() returns trigger
language plpgsql
as $$
begin
  if new.session_id is not null then
    update photo_sessions
       set ended_at = greatest(ended_at, new.created_at)
     where id = new.session_id;
  end if;
  return null;
end;
$$;

create trigger photos_touch_session
  after insert or update of session_id on photos
  for each row execute function touch_session_from_photo();
