-- Guest sessions: what makes a design a *guest's* design.
--
-- A walk-up guest never signs in, so `designs.owner_id` is minted into a cookie
-- (src/lib/api/owner.ts) and that is the whole identity. This table is the
-- registry that turns those anonymous ids into a session the booth can talk
-- about: it gives the guest a short code they can read aloud or carry to another
-- screen, an expiry after which the booth may forget them, and a record of the
-- moment their work was claimed by a real account.
--
-- Guest designs are NOT a separate table. A design does not change what it is
-- when its owner signs up — claiming re-stamps `designs.owner_id` and the row
-- stays put. Copying designs into a "guest_designs" table would mean two schemas
-- to keep in step and a migration on every claim, for no query anyone makes.
--
-- Mirrors the client's session model in src/lib/session/guest-session.ts: the
-- same alphabet, the same length, the same 30-day life.

create table guest_sessions (
  -- The cookie's owner id; the same value carried by `designs.owner_id` and
  -- `photos.owner_id` while the session is unclaimed. Deliberately no foreign
  -- key: an account-owned design has no guest session, so the relationship only
  -- runs one way.
  owner_id uuid primary key,

  -- Unambiguous when read aloud at a noisy booth or printed on a receipt: no
  -- 0/O, no 1/I. 32 symbols over 6 places is ~30 bits — plenty against a typo,
  -- and not the security boundary either way, since the code only names a
  -- session that must still present its cookie.
  code text not null unique check (code ~ '^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$'),

  created_at timestamptz not null default now(),
  -- Touched on each request from the session, so an active booth guest is not
  -- swept away mid-session by a cleanup that only reads `expires_at`.
  last_seen_at timestamptz not null default now(),
  -- Matches the anonymous retention the client promises: 30 days.
  expires_at timestamptz not null default (now() + interval '30 days'),

  -- Set together when the guest signs in and takes their work with them. After
  -- this the row is history: the designs now answer to `claimed_by`.
  claimed_at timestamptz,
  claimed_by uuid,

  constraint guest_sessions_claim_complete
    check ((claimed_at is null) = (claimed_by is null)),
  constraint guest_sessions_expiry_after_start
    check (expires_at > created_at)
);

comment on table guest_sessions is
  'Anonymous booth sessions. Designs stay in `designs`; this row is the identity behind them until it is claimed.';

comment on column guest_sessions.code is
  'Short human-facing code. Names a session; never authorises one on its own.';

-- What a cleanup job scans: only unclaimed sessions can expire, because a
-- claimed one has already handed its work to an account.
create index guest_sessions_expiring_idx
  on guest_sessions (expires_at)
  where claimed_at is null;

-- "Which sessions did this account claim?" — asked when merging or supporting a
-- user, and cheap to keep.
create index guest_sessions_claimed_by_idx
  on guest_sessions (claimed_by)
  where claimed_by is not null;
