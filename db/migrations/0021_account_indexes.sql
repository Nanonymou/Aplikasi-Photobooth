-- Indexes the account, session, and design queries turned out to need.
--
-- The tables for those three things were designed one feature at a time —
-- designs first (0001), guest sessions when the booth needed them (0011),
-- accounts and auth sessions when sign-in arrived (0012, 0013) — and each got
-- the indexes its own screen asked for. The screens built since ask different
-- questions of the same rows, and these are the ones nothing covers.
--
-- Every index here exists for a query that is already written, named after what
-- it answers rather than after the columns in it.

/*
 * The gallery searches titles with a substring match, which no btree can serve:
 * `ilike '%reuni%'` has no prefix to seek on. Trigrams can, and pg_trgm is
 * already installed (0004) for the decoration library's own search.
 *
 * Deleted designs are excluded: they are never searched, and a gallery's index
 * should not carry the weight of everything anyone ever threw away.
 */
create index designs_title_trgm_idx
  on designs using gin (title gin_trgm_ops)
  where deleted_at is null;

/*
 * The analytics report counts four tables by day across a window, with no owner
 * in the question — the opposite of every other read of these rows, which start
 * from "whose". The existing indexes all lead with `owner_id`, so a report over
 * ninety days had nothing to walk but the whole table.
 */
create index designs_created_idx on designs (created_at);
create index photo_sessions_created_idx on photo_sessions (created_at);
create index user_profiles_created_idx on user_profiles (created_at);

/*
 * "Which templates were used this period" reads pages by date and cares only
 * about those that came from a template. Most pages do not, so the condition
 * belongs in the index rather than in a filter that reads them anyway.
 */
create index design_pages_template_usage_idx
  on design_pages (created_at)
  where template_id is not null;

/*
 * A design's live share decides the gallery's "shared" badge, and the gallery
 * asks per card. 0019 indexed `design_id` for live rows; expiry is the other
 * half of "live" and is checked on every one of those rows.
 */
drop index if exists shares_design_live_idx;
create index shares_design_live_idx
  on shares (design_id, expires_at)
  where design_id is not null and revoked_at is null;
