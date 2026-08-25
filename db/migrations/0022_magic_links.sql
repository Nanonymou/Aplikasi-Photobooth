-- One-time sign-in links.
--
-- Until now the email door took an address and gave back a session, which is a
-- login form with the password field removed: anyone who could type someone
-- else's address was them. This is the proof that was missing — possession of a
-- mailbox, demonstrated by following a link only that mailbox received.
--
-- Same shape as `auth_sessions` (0013) and for the same reason: the token goes
-- out in an email, only its sha256 is kept here. A leak of this table hands over
-- nothing that can be redeemed, and there is nothing to redeem it *for* — a link
-- is worth one session, once, for fifteen minutes.

create table magic_links (
  id uuid primary key default gen_random_uuid(),

  -- Lowercased at the door, like `user_profiles.email`, so a link requested for
  -- Rara@… and one for rara@… are the same mailbox and share a cooldown.
  email text not null check (email = lower(email) and position('@' in email) > 1),

  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),

  created_at timestamptz not null default now(),
  -- Long enough to walk to another device and open the mail, short enough that a
  -- link forwarded or left in a mailbox stops being a key by lunchtime.
  expires_at timestamptz not null default now() + interval '15 minutes',
  -- Stamped the moment it is redeemed. One link, one session: a link that could
  -- be replayed is a password that was mailed in plaintext.
  consumed_at timestamptz,

  constraint magic_links_expires_after_created check (expires_at > created_at)
);

-- Redemption looks up by hash and nothing else, and only live links can be
-- redeemed — spent ones stay for a while as history, not as candidates.
create index magic_links_redeemable_idx
  on magic_links (token_hash)
  where consumed_at is null;

-- The request cooldown asks "when did this address last get one", and the sweep
-- asks "what has expired"; both walk this.
create index magic_links_email_recent_idx on magic_links (email, created_at desc);
