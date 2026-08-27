-- Visual effects belong to a page, and until now they had nowhere to be saved.
--
-- `CanvasPage.effects` has existed in the editor since weather was added: snow
-- falls across the whole strip rather than inside one slot, so an effect is a
-- property of the scene and not of a photo. The catalogue of them is a table
-- already (`visual_effects`, migration 0024). The one thing missing was the
-- column that remembers which ones a page is wearing — so every effect a user
-- chose was lost the moment autosave ran, silently, with the editor still
-- showing it until the next reload.
--
-- Deliberately not a join table. A page's effects are read and written together,
-- always, as part of the whole document autosave sends; a second table would
-- mean a second round trip and a second thing to keep in step for a list that is
-- never longer than a handful of slugs.
--
-- Deliberately not validated against `visual_effects` either. An admin
-- unpublishing an effect must not make an existing page unsaveable — the page
-- would then be a document its owner could open but not keep. The renderer
-- already ignores an id it does not know, which is the right behaviour for
-- decoration and the wrong behaviour to enforce with a constraint.

-- A check constraint may not contain a subquery, and "every element looks like a
-- slug" needs one — so it lives in a function, the same way the object and
-- background shape checks on this table already do.
create or replace function effect_ids_are_valid(ids text[])
returns boolean
language sql
immutable
as $$
  select ids is not null
     and cardinality(ids) <= 12
     and not exists (
       select 1
       from unnest(ids) as id
       -- `is null or` first: a null element fails the regex to NULL, and WHERE
       -- reads NULL as no match, which would let it through.
       where id is null
          or id !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     );
$$;

alter table design_pages
  add column effects text[] not null default '{}'
    -- At most a handful, all of them slug-shaped. Not a list somebody can grow
    -- until the render loop crawls.
    check (effect_ids_are_valid(effects));

comment on column design_pages.effects is
  'Ids of page-wide visual effects (see visual_effects). Unknown ids are ignored when rendering, never rejected on write.';
