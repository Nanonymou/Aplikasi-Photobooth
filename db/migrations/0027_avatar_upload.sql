-- A profile picture somebody chose, as opposed to one a provider handed over.
--
-- `user_profiles.avatar_url` (migration 0012) has always meant one thing: the
-- picture Google or Apple gave us at sign-in. Its check enforces that — https,
-- somebody else's host — and it should keep meaning exactly that.
--
-- The settings screen asks a different question. A user picks a file from their
-- own device, the browser crops it square and re-encodes it, and what comes back
-- is bytes we now hold. That is not a provider URL and pretending it is would
-- mean either relaxing the check until it stops saying anything, or storing a
-- base64 data URL in a column that `describeMe()` reads on every page load —
-- thirty kilobytes of string dragged through every request to draw a 28px
-- circle.
--
-- So the bytes go where every other user-supplied image in this app already
-- goes: the content-addressed blob store (src/lib/storage/blob-storage.ts), and
-- the row keeps its key. Same bytes, same key, stored once — two people who
-- upload the same picture share it, and a re-upload of an unchanged file writes
-- nothing.
--
-- Both columns exist at once on purpose. They answer different questions —
-- "what did the provider send" and "what did they choose" — and a single column
-- would lose the provider's picture the moment somebody uploaded one, with
-- nothing to fall back to if they later removed theirs.

alter table user_profiles
  add column avatar_key text
    -- `<sha256>.<ext>`, exactly what the blob store issues. Constrained here so
    -- a bad write is refused by the database rather than discovered later by a
    -- route handler trying to read a file that was never going to exist.
    check (avatar_key is null or avatar_key ~ '^[0-9a-f]{64}\.(webp|png|jpg)$');

comment on column user_profiles.avatar_url is
  'The picture the sign-in provider supplied, if any. Never a picture the user uploaded.';

comment on column user_profiles.avatar_key is
  'Blob-store key of the picture the user uploaded, which takes precedence over avatar_url.';

-- Which blobs are still spoken for, for the sweep that deletes the ones that are
-- not. Partial because the rows that matter are the few with a picture, not the
-- many without one.
create index user_profiles_avatar_key_idx
  on user_profiles (avatar_key)
  where avatar_key is not null;
