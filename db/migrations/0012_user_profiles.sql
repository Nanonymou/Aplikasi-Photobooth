-- User profiles: who an account is, and what it is allowed to do.
--
-- Until now `owner_id` was the whole story — a uuid from a cookie, with nothing
-- on the server that knew a name, an email, or a role. That was fine while every
-- user was an anonymous guest. Social sign-in changes it: a provider hands back
-- a verified identity, and the app has to have somewhere to put it.
--
-- Deliberately no foreign key to an auth provider's user table. The id here is
-- the same uuid every `owner_id` column already carries, whoever issued it —
-- Supabase's `auth.users.id`, or the derived id the stand-in mints today
-- (src/lib/api/account.ts). Binding this table to one provider's schema would
-- mean a migration the day that changes, for a constraint that buys nothing:
-- the id is the contract, not the table it came from.

-- Mirrors Role in src/lib/auth/roles.ts. Membership, not hierarchy: an area
-- names the roles it admits, so widening one role never silently widens another.
create type user_role as enum ('admin', 'editor', 'operator', 'tamu');

-- Which provider the account arrived through. 'email' covers both the magic
-- link and a password, because what matters here is "was this a social sign-in",
-- not which of two email flows it was.
create type auth_provider as enum ('email', 'google', 'apple');

create table user_profiles (
  -- The account id, as carried by designs.owner_id once a session is claimed.
  id uuid primary key,

  -- Lowercased on write so 'Rara@Contoh.ID' and 'rara@contoh.id' cannot become
  -- two accounts. Uniqueness is enforced on that normalised value.
  email text not null check (email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),

  -- What the provider called them. Optional: Apple only shares a name on the
  -- very first authorisation, and only if the user allows it, so a profile with
  -- no name is normal rather than broken.
  display_name text check (display_name is null or length(btrim(display_name)) between 1 and 120),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),

  role user_role not null default 'tamu',
  provider auth_provider not null default 'email',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

comment on table user_profiles is
  'One row per account. The id is the same uuid every owner_id column carries.';

comment on column user_profiles.role is
  'Governs access. Checked server-side; the client RoleGuard is a courtesy, not the boundary.';

-- Sign-in looks an account up by email before it has an id to look up by.
create unique index user_profiles_email_idx on user_profiles (lower(email));

-- "Who are the admins?" — asked by the console's own user list, and by anyone
-- auditing access. Partial, because the answer is never 'tamu'.
create index user_profiles_privileged_idx
  on user_profiles (role)
  where role <> 'tamu';

create trigger user_profiles_touch_updated_at
  before update on user_profiles
  for each row execute function touch_updated_at();
