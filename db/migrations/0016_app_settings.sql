-- Booth-wide settings, as one row.
--
-- These are the knobs an admin turns for the whole installation: what it calls
-- itself, whether walk-up guests are allowed at all, how long their work is
-- kept, how registration behaves. Until now they lived as a TypeScript constant
-- the form pretended to save, which is fine for building a form and useless for
-- running a booth.
--
-- Deliberately typed columns rather than a jsonb blob. Every value here has a
-- shape worth enforcing — a retention of -1 days or a language of "xx" is not a
-- setting, it is a bug that will surface somewhere far away — and a blob moves
-- all of that checking into whichever code path happens to read it next.
--
-- One row, enforced by the primary key: `id` may only ever be true. That is the
-- cheapest way to say "there is exactly one of these" in SQL, and it makes the
-- read a plain select rather than a select with an ordering nobody can justify.

create table app_settings (
  id boolean primary key default true check (id),

  brand_name text not null default 'FrameStudio'
    check (length(btrim(brand_name)) between 1 and 80),
  language text not null default 'id' check (language in ('id', 'en')),

  -- A booth that refuses guests is a booth with a login screen in front of a
  -- camera; allowed by default because the walk-up guest is the main user.
  allow_guest boolean not null default true,
  -- Matches the bounds the settings slider offers. Photos already expire on
  -- their own schedule (migration 0002); this is the guest *session*, and a
  -- value outside these bounds would either lose work or keep it forever.
  guest_retention_days integer not null default 30
    check (guest_retention_days between 7 and 90),

  export_quality text not null default 'high'
    check (export_quality in ('standard', 'high', 'max')),

  require_email_verification boolean not null default true,
  allow_registration boolean not null default true,
  admin_two_factor boolean not null default false,

  updated_at timestamptz not null default now(),
  -- Who turned the knob. Not a foreign key to user_profiles: an account being
  -- deleted must not take the record of what they changed with it.
  updated_by uuid
);

create trigger app_settings_touch_updated_at
  before update on app_settings
  for each row execute function touch_updated_at();

-- The row exists from the start, carrying the defaults above, so a fresh
-- install reads settings rather than discovering there are none. Every later
-- write is an update to this row.
insert into app_settings (id) values (true);
