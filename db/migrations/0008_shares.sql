-- Share links: a short code that hands one finished picture to whoever scans it.
--
-- The code is the whole security model, and that is a deliberate choice for a
-- photobooth: a guest at a wedding will not make an account to collect their
-- strip, so the link has to work from a phone that has never seen this app.
-- What makes that acceptable is that the code is long enough not to be guessed,
-- the link expires, and it points at one file rather than at an account.

create table shares (
  -- Short, unambiguous, and case-sensitive: 10 characters of base62 is ~59 bits,
  -- far past guessing, while still fitting under a QR at kiosk size.
  code text primary key check (code ~ '^[0-9A-Za-z]{10}$'),
  owner_id uuid not null,
  -- The stored file this link hands out, in photo storage.
  storage_key text not null check (storage_key ~ '^[0-9a-f]{64}\.(jpg|png|webp)$'),
  content_type text not null,
  -- What the browser should call it when saved.
  filename text not null check (length(btrim(filename)) between 1 and 200),
  bytes integer not null check (bytes > 0),
  -- A share is a moment, not a hosting plan: seven days is long enough to get
  -- home and download the picture, short enough that a booth does not become a
  -- permanent archive of strangers' faces.
  expires_at timestamptz not null default (now() + interval '7 days'),
  -- Owner revoked it. Kept rather than deleted so a revoked link can answer
  -- "this link was turned off" instead of "no such link".
  revoked_at timestamptz,
  download_count integer not null default 0 check (download_count >= 0),
  last_downloaded_at timestamptz,
  created_at timestamptz not null default now()
);

-- The owner's own list of links, newest first.
create index shares_owner_recent_idx on shares (owner_id, created_at desc);

-- What a cleanup job scans.
create index shares_expiring_idx on shares (expires_at) where revoked_at is null;
