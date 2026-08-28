-- How the wall is running, so somebody other than the wall can say.
--
-- Play, pause and pace live in the browser today (src/lib/slideshow/pace.ts),
-- which is right for a screen somebody is sitting at and wrong for the one this
-- feature is actually for: the wall is a projector in the corner, and the
-- operator is walking around the room with a phone. A control that only exists
-- on the machine showing the slideshow can only be reached by walking over to
-- it, which is exactly the moment an operator does not have.
--
-- On the booth settings row rather than on `events`, for the same reason
-- `active_event_id` is: this is the state of the booth right now, not a property
-- of the event. Pausing the wall during a speech should not be something the
-- event remembers next weekend.

alter table event_branding
  add column slideshow_playing boolean not null default true,
  add column slideshow_pace_seconds integer not null default 5
    -- The same four the wall offers. A free-form number would let a control
    -- send 0 and turn the poll loop into a spin.
    check (slideshow_pace_seconds in (3, 5, 8, 15));

comment on column event_branding.slideshow_playing is
  'Whether the wall should be advancing. Read by the wall, written by whoever is holding the remote.';
