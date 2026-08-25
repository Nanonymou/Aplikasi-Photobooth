-- What a booth shows when it is handed to the crowd.
--
-- Kiosk mode is one screen with three pieces of text on it — the event's name, a
-- line of welcome, and the PIN that lets the organizer back out — and until now
-- all three were constants in the bundle. The first two being hard-coded means
-- every event is somebody else's wedding. The third being hard-coded is worse:
-- it shipped the exit PIN to every browser that loaded the page, which is the
-- one thing kiosk mode exists to withhold.
--
-- The brand name is deliberately NOT here. It already lives in `app_settings`
-- (migration 0016) and means the same thing on this screen as on every other;
-- a second copy is a second thing to change and a first thing to forget.
--
-- One row, like app_settings, for the same reason: an installation runs one
-- booth screen at a time, and "which kiosk config is the live one" is a question
-- with no good answer if the table lets you have two.

create table kiosk_settings (
  id boolean primary key default true check (id),

  event_name text not null default 'Photobooth'
    check (length(btrim(event_name)) between 1 and 120),
  tagline text not null default 'Bergaya, jepret, dan bawa pulang kenangannya.'
    check (length(btrim(tagline)) between 1 and 200),

  /*
   * The PIN, never in the clear.
   *
   * Four digits is ten thousand guesses, so the hash is a KDF with real work
   * behind it rather than a bare digest: if this column ever leaks, the cost of
   * trying the whole space should be measured in hours, not milliseconds. Online
   * guessing is a different problem and is answered by rate limiting at the
   * endpoint, not here.
   *
   * Null means no PIN is set, and the endpoint refuses to unlock at all rather
   * than treating "unset" as "anything works".
   */
  pin_hash text check (pin_hash is null or pin_hash ~ '^scrypt\$'),

  updated_at timestamptz not null default now(),
  -- Who set it up. Not a foreign key, for the same reason as app_settings: the
  -- record of the change outlives the account that made it.
  updated_by uuid
);

create trigger kiosk_settings_touch_updated_at
  before update on kiosk_settings
  for each row execute function touch_updated_at();

-- Present from the start, so the kiosk screen reads settings rather than
-- discovering there are none. No PIN until an organizer sets one.
insert into kiosk_settings (id) values (true);
