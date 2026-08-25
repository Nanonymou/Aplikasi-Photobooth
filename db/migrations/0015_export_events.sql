-- What was exported, kept for counting.
--
-- The admin console reports how many exports a period produced. Nothing in the
-- database could answer that. `render_files` (migration 0009) is the closest
-- thing, and it is unusable for the job twice over: it only holds exports asked
-- to be *persisted* — the ordinary download streams straight back and is never
-- recorded at all — and the rows it does hold are deleted by the sweep twelve
-- hours later. A chart built on it would show a spike today and zero every day
-- before, which is not a quiet inaccuracy but a straight lie.
--
-- So the count gets its own table. One row per finished export, holding only
-- what a report reads: when, in what format, how big, and whether it was kept.
-- Deliberately NOT a foreign key to the file or the design — the point of this
-- row is to outlive both. The file expires in hours; the design may be deleted
-- by its owner; neither should make last month's totals change.
--
-- No storage key and no title, either: this table answers "how much, of what,
-- when", and anything that would let it answer "who made what" is a different
-- table with a different retention argument.

create table export_events (
  id bigint generated always as identity primary key,
  -- Kept so the report can distinguish people from exports (one guest saving
  -- five formats is one person). Not a foreign key: guests have no account row,
  -- and an account being deleted must not erase the fact that work happened.
  owner_id uuid not null,
  format text not null check (format in ('png', 'jpeg', 'webp', 'pdf')),
  bytes integer not null check (bytes >= 0),
  -- 4 means 300 DPI. Worth keeping: "everyone exports at print scale" and
  -- "everyone exports at screen scale" call for different storage decisions.
  scale real not null check (scale > 0),
  -- False for a straight download, true when the file was parked in the render
  -- store for a link or a print queue.
  persisted boolean not null default false,
  created_at timestamptz not null default now()
);

-- Every report reads a window ending now, so the index is on time first; format
-- rides along because the format breakdown is over the same window and can then
-- be answered from the index alone.
create index export_events_window_idx on export_events (created_at desc, format);
