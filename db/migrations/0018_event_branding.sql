-- The booth's face, under the name the console calls it.
--
-- Migration 0017 created `kiosk_settings` for the kiosk screen's copy and its
-- exit PIN. The branding page in the admin console turns out to edit exactly
-- that — event name, tagline, exit PIN — plus an accent colour, and describes it
-- as what the kiosk *and* the slideshow read. Two tables for one set of values
-- would mean an organizer changing the event's name at the booth and an admin
-- changing it in the console, each convinced they had.
--
-- So the table is renamed to what it holds, and gains the one field it lacked.
-- Renaming rather than adding: `kiosk_settings` was the narrower name for the
-- same row, and the narrow name is what would invite the second table later.

alter table kiosk_settings rename to event_branding;
alter trigger kiosk_settings_touch_updated_at on event_branding
  rename to event_branding_touch_updated_at;

-- The accent the kiosk and slideshow tint themselves with. Stored as the option
-- id, not a hex colour: the five choices are a design decision with matching
-- light and dark values behind each name, and letting any colour through would
-- put "#000000 on #000000" one careless save away.
alter table event_branding
  add column accent text not null default 'violet'
  check (accent in ('violet', 'blue', 'emerald', 'rose', 'amber'));
