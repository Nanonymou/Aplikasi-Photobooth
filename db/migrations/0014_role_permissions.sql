-- What each role may actually do.
--
-- `user_profiles.role` (migration 0012) says *which* role someone holds; it says
-- nothing about what that buys them. Today the answer lives in allow-lists
-- scattered across the frontend — `allow={["operator", "admin"]}` on the kiosk
-- page, another list on the slideshow page, another in the account menu. Every
-- one of those is a copy of a policy that exists nowhere, so widening a role
-- means finding all of them, and missing one is silent.
--
-- This gives the policy a home. A permission is a verb the app knows; a role is
-- a set of them; a check becomes "does this role have this permission?" instead
-- of "is this role in this hand-written list?".
--
-- Deliberately NOT a `roles` table: the roles themselves are already the
-- `user_role` enum that `user_profiles.role` references. A second list of role
-- names would be a second source of truth, and the first disagreement between
-- them would be a security bug rather than a display bug.

-- Named after the thing being done, not the page doing it: pages get renamed and
-- split, and a permission called `admin.console` survives that where one called
-- `view_admin_page` does not.
create type app_permission as enum (
  -- Admin console
  'admin.console',
  'admin.users.manage',
  'admin.content.manage',
  'admin.analytics.view',
  'admin.settings.manage',
  'admin.branding.manage',
  -- Running a booth
  'booth.kiosk',
  'booth.slideshow',
  -- Ordinary use
  'design.edit',
  'design.export',
  'design.share'
);

create table role_permissions (
  role user_role not null,
  permission app_permission not null,
  -- Granting the same permission twice is meaningless, and the pair is the only
  -- thing ever looked up, so it is the key.
  primary key (role, permission)
);

comment on table role_permissions is
  'The access policy. A role may do exactly what it has a row for here.';

-- The seed mirrors the allow-lists the app already enforces client-side, so
-- turning those into server checks changes where the policy is decided, not what
-- it decides. Anything not listed is denied — the table is an allow-list, and a
-- role with no row for a permission simply does not have it.
insert into role_permissions (role, permission) values
  -- Admin: the console, and everything a booth or a user can do.
  ('admin', 'admin.console'),
  ('admin', 'admin.users.manage'),
  ('admin', 'admin.content.manage'),
  ('admin', 'admin.analytics.view'),
  ('admin', 'admin.settings.manage'),
  ('admin', 'admin.branding.manage'),
  ('admin', 'booth.kiosk'),
  ('admin', 'booth.slideshow'),
  ('admin', 'design.edit'),
  ('admin', 'design.export'),
  ('admin', 'design.share'),

  -- Editor: curates the library, but does not run booths or manage people.
  ('editor', 'admin.content.manage'),
  ('editor', 'design.edit'),
  ('editor', 'design.export'),
  ('editor', 'design.share'),

  -- Operator: runs the event — kiosk and slideshow — without console access.
  ('operator', 'booth.kiosk'),
  ('operator', 'booth.slideshow'),
  ('operator', 'design.edit'),
  ('operator', 'design.export'),
  ('operator', 'design.share'),

  -- Guest: makes and keeps their own work, and nothing else.
  ('tamu', 'design.edit'),
  ('tamu', 'design.export'),
  ('tamu', 'design.share');

-- The question asked on every guarded request is "what may this role do?", so
-- the primary key's leading column already serves it; this index is for the
-- reverse — "who can manage content?" — which the console's role editor asks.
create index role_permissions_by_permission_idx
  on role_permissions (permission, role);
