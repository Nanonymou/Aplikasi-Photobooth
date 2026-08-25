-- Who changed whose role, and when.
--
-- A console that can promote people needs to be able to say who did. Not for
-- suspicion — for the ordinary question that follows any surprise, "when did
-- this account become an admin, and at whose hand". `user_profiles.role` holds
-- the answer to *what*, and nothing at all held the answer to *who*, because a
-- column that is overwritten remembers only its last value.
--
-- Append-only by intent: there is no update path and nothing here is ever
-- rewritten. A log that can be edited by the same console it is logging is
-- worth about as much as no log.
--
-- No foreign keys, deliberately. The record of a promotion has to outlive both
-- the account that received it and the admin who granted it — deleting a person
-- must not quietly rewrite the history of what they did or what was done to
-- them.

create table role_changes (
  id bigint generated always as identity primary key,

  -- Whose role changed.
  subject_id uuid not null,
  -- Who changed it. Null when it was not a person: a seeding script, a future
  -- automated demotion, anything without an account behind it.
  actor_id uuid,

  from_role user_role not null,
  to_role user_role not null,

  created_at timestamptz not null default now(),

  -- A change that changed nothing is not a change; recording it would fill the
  -- log with the noise of somebody saving a form twice.
  constraint role_changes_actually_changed check (from_role <> to_role)
);

-- The two questions asked of this table: "what happened to this account" and
-- "what has been happening lately".
create index role_changes_subject_idx on role_changes (subject_id, created_at desc);
create index role_changes_recent_idx on role_changes (created_at desc);
