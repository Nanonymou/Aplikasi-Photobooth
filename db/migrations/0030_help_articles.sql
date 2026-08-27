-- The help centre, as data.
--
-- Unlike plan names and taglines, which stay in the app because they change when
-- marketing decides something, help articles change because a question keeps
-- arriving — and the person who notices that is the one answering support, not
-- the one deploying. A new answer should be a row, written by whoever holds
-- `admin.content.manage`, the same permission the sticker and template library
-- already uses.
--
-- Two tables rather than a category enum, for the same reason the library has
-- `library_categories`: an admin adding "Pencetakan" should not need a migration
-- on a type, and the categories carry a curated order that an enum has nowhere
-- to put.

create table help_categories (
  id uuid primary key default gen_random_uuid(),
  -- What a URL and a filter chip carry, so a category survives its own row's
  -- uuid and a rename of its label.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null check (length(btrim(label)) between 1 and 80),
  -- Curated order in the chip row; ties fall back to the label.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table help_articles (
  id uuid primary key default gen_random_uuid(),

  -- The article's address. Permanent by intent: a help link is pasted into
  -- chats and emails and outlives the wording of its own title.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),

  title text not null check (length(btrim(title)) between 1 and 160),

  -- One sentence: the answer in miniature, not a teaser. The list shows it, and
  -- somebody who reads only this line should already be unstuck.
  summary text not null check (length(btrim(summary)) between 1 and 400),

  -- The answer itself, as paragraphs. An array rather than one blob of markdown
  -- because that is exactly what it is — the screen renders a <p> per element —
  -- and a renderer is a bigger promise than this content needs.
  body text[] not null check (
    cardinality(body) between 1 and 40
    and array_position(body, null) is null
  ),

  -- `restrict`, not `cascade`: deleting a category that still has articles in it
  -- should be refused, not silently take the answers with it.
  category_id uuid not null references help_categories (id) on delete restrict,

  -- Null means a draft — written, visible in the console, not yet an answer
  -- anybody can find. The same convention `design_templates` uses.
  published_at timestamptz,

  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Who last touched it. No foreign key: an article outlives the staff account
  -- that wrote it, and losing the author should not mean losing the article.
  updated_by uuid
);

comment on table help_articles is
  'One row per answer. Null published_at is a draft; the help centre reads only published rows.';

create trigger help_categories_touch_updated_at
  before update on help_categories
  for each row execute function touch_updated_at();

create trigger help_articles_touch_updated_at
  before update on help_articles
  for each row execute function touch_updated_at();

-- The help centre's own list: published articles, in curated order, by category.
create index help_articles_published_idx
  on help_articles (category_id, position, title)
  where published_at is not null;

-- Search. Titles and summaries are what somebody types at, and trigrams handle
-- the half-remembered word and the typo — which is most of what a help search
-- receives. The body is deliberately not in here: matching a paragraph returns
-- the article that mentions a word once above the one that is about it.
create index help_articles_title_trgm_idx
  on help_articles using gin (title gin_trgm_ops, summary gin_trgm_ops)
  where published_at is not null;

-- The catalogue as it stands in src/lib/help/articles.ts, so the table is not
-- empty on its first read. Positions are the order the file already had.
insert into help_categories (slug, label, position) values
  ('memulai', 'Memulai',          0),
  ('editor',  'Editor',           1),
  ('berbagi', 'Berbagi & cetak',  2),
  ('akun',    'Akun & paket',     3);
