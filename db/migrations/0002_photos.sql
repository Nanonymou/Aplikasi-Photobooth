-- Metadata for photos taken with the webcam or picked from a device.
--
-- The bytes live in storage under a content-addressed key (see
-- src/lib/storage/photo-storage.ts); this table records what that key *is* —
-- whose photo it is, where it came from, how big it is, and the capture
-- settings worth remembering. Splitting the two means a re-upload of identical
-- bytes stays one file while still producing one row per person who took it.
--
-- Grouping photos into sessions and everything else the history view wants is
-- deliberately not here yet; this is the metadata the capture endpoint writes.

create type photo_source as enum ('camera', 'upload', 'demo');

create table photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  -- Content-addressed storage key: `<sha256>.<ext>`.
  storage_key text not null check (storage_key ~ '^[0-9a-f]{64}\.(jpg|png|webp)$'),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  source photo_source not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  bytes integer not null check (bytes > 0),
  -- Whether the frame was flipped to match the mirrored preview. Worth keeping:
  -- it is the difference between a portrait and its reflection.
  mirrored boolean not null default false,
  -- When the shutter fired, as reported by the device. Nullable because an
  -- upload from the file picker has no capture moment we can trust.
  captured_at timestamptz,
  created_at timestamptz not null default now(),

  -- The same person storing the same bytes twice is the same photo, not two.
  constraint photos_owner_key_unique unique (owner_id, storage_key)
);

-- The history view reads "my photos, newest first".
create index photos_owner_recent_idx on photos (owner_id, created_at desc);
