#!/usr/bin/env node
/**
 * Loads the decoration library into the database.
 *
 * The catalogue lives in `src/lib/editor/` as TypeScript — that is where it was
 * written while the editor was built frontend-first, and it stays the single
 * source of truth rather than being copied into a SQL file that would drift
 * from it. This script compiles those modules to a temporary directory, imports
 * them, and upserts every row.
 *
 * Idempotent: run it after every catalogue change.
 *
 *   DATABASE_URL=postgres://… node scripts/seed-library.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..");

/**
 * Compiles the catalogue modules and imports them.
 *
 * `tsc` leaves the `@/…` path aliases in the output — they are a bundler
 * convention, not a runtime one — so they are rewritten to relative specifiers
 * before Node ever sees them.
 */
async function loadCatalogue() {
  const out = await mkdtemp(path.join(tmpdir(), "framestudio-seed-"));

  // tsc reports the `@/…` specifiers it cannot resolve and exits non-zero, but
  // it still emits — and emitting is all this needs, since the modules being
  // compiled are plain data. Type checking proper is `npm run build`'s job.
  try {
    compile(out);
  } catch {
    // Fall through: the import below is the real test of whether it worked.
  }

  await writeFile(path.join(out, "package.json"), '{"type":"module"}');

  for (const file of [
    "editor/decorations.js",
    "editor/templates.js",
    "editor/filters.js",
    "editor/textures.js",
  ]) {
    const target = path.join(out, file);
    const source = await readFile(target, "utf8");
    await writeFile(
      target,
      source.replace(/from "@\/(?:lib\/editor|components[^"]*)\/([^"]+)"/g, 'from "./$1.js"'),
    );
  }

  const decorations = await import(path.join(out, "editor/decorations.js"));
  const templates = await import(path.join(out, "editor/templates.js"));
  const filters = await import(path.join(out, "editor/filters.js"));
  const textures = await import(path.join(out, "editor/textures.js"));
  const help = await import(path.join(out, "help/articles.js"));
  await rm(out, { recursive: true, force: true });

  return { ...decorations, ...templates, ...filters, ...textures, ...help };
}

function compile(out) {
  execFileSync(
    "npx",
    [
      "tsc",
      "src/lib/editor/decorations.ts",
      "src/lib/editor/templates.ts",
      "src/lib/editor/filters.ts",
      "src/lib/editor/textures.ts",
      "src/lib/editor/id.ts",
      "src/lib/help/articles.ts",
      // Pinned so the emitted layout does not shift when the input list gains a
      // file outside `editor/` — tsc otherwise derives the root from the common
      // prefix, and every path below would move.
      "--rootDir",
      "src/lib",
      "--outDir",
      out,
      "--module",
      "esnext",
      "--target",
      "es2022",
      "--moduleResolution",
      "bundler",
      "--skipLibCheck",
    ],
    { cwd: ROOT, stdio: "pipe" },
  );
}

async function seedCategories(client, kind, categories) {
  const ids = new Map();

  for (const [position, category] of categories.entries()) {
    const { rows } = await client.query(
      `insert into library_categories (kind, slug, label, position)
       values ($1, $2, $3, $4)
       on conflict (kind, slug) do update set label = excluded.label,
                                              position = excluded.position
       returning id`,
      [kind, category.id, category.label, position],
    );
    ids.set(category.id, rows[0].id);
  }

  return ids;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set. See .env.example.");
    process.exit(1);
  }

  const catalogue = await loadCatalogue();
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query("begin");

    const templateCategories = await seedCategories(
      client,
      "template",
      catalogue.TEMPLATE_CATEGORIES,
    );
    for (const [position, template] of catalogue.TEMPLATES.entries()) {
      await client.query(
        `insert into design_templates
           (slug, label, category_id, keywords, width, height, background_type,
            background, slots, texts, stickers, published_at, position)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now(), $12)
         on conflict (slug) do update set
           label = excluded.label, category_id = excluded.category_id,
           keywords = excluded.keywords, width = excluded.width,
           height = excluded.height, background_type = excluded.background_type,
           background = excluded.background, slots = excluded.slots,
           texts = excluded.texts, stickers = excluded.stickers,
           position = excluded.position`,
        [
          template.id,
          template.label,
          templateCategories.get(template.category),
          template.keywords ?? [],
          template.width,
          template.height,
          template.background.type,
          JSON.stringify(template.background),
          JSON.stringify(template.slots),
          JSON.stringify(template.texts ?? []),
          JSON.stringify(template.stickers ?? []),
          position,
        ],
      );
    }

    const stickerCategories = await seedCategories(
      client,
      "sticker",
      catalogue.STICKER_CATEGORIES,
    );
    for (const [position, sticker] of catalogue.STICKERS.entries()) {
      await client.query(
        `insert into stickers
           (slug, label, category_id, keywords, kind, glyph, published_at, position)
         values ($1,$2,$3,$4,'emoji',$5, now(), $6)
         on conflict (slug) do update set
           label = excluded.label, category_id = excluded.category_id,
           keywords = excluded.keywords, glyph = excluded.glyph,
           position = excluded.position`,
        [
          sticker.id,
          sticker.label,
          stickerCategories.get(sticker.category),
          sticker.keywords ?? [],
          sticker.glyph,
          position,
        ],
      );
    }

    const backgroundCategories = await seedCategories(
      client,
      "background",
      catalogue.BACKGROUND_CATEGORIES,
    );
    for (const [position, background] of catalogue.BACKGROUNDS.entries()) {
      await client.query(
        `insert into backgrounds
           (slug, label, category_id, keywords, background_type, background,
            published_at, position)
         values ($1,$2,$3,$4,$5,$6, now(), $7)
         on conflict (slug) do update set
           label = excluded.label, category_id = excluded.category_id,
           keywords = excluded.keywords,
           background_type = excluded.background_type,
           background = excluded.background, position = excluded.position`,
        [
          background.id,
          background.label,
          backgroundCategories.get(background.category),
          background.keywords ?? [],
          background.background.type,
          JSON.stringify(background.background),
          position,
        ],
      );
    }

    const textCategories = await seedCategories(
      client,
      "text_style",
      catalogue.TEXT_STYLE_CATEGORIES,
    );
    for (const [position, style] of catalogue.TEXT_STYLES.entries()) {
      await client.query(
        `insert into text_styles
           (slug, label, category_id, keywords, sample_text, font_size,
            font_weight, letter_spacing, fill, gradient, stroke, stroke_width,
            shadow, curve, italic, published_at, position)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now(), $16)
         on conflict (slug) do update set
           label = excluded.label, category_id = excluded.category_id,
           keywords = excluded.keywords, sample_text = excluded.sample_text,
           font_size = excluded.font_size, font_weight = excluded.font_weight,
           letter_spacing = excluded.letter_spacing, fill = excluded.fill,
           gradient = excluded.gradient, stroke = excluded.stroke,
           stroke_width = excluded.stroke_width, shadow = excluded.shadow,
           curve = excluded.curve, italic = excluded.italic,
           position = excluded.position`,
        [
          style.id,
          style.label,
          textCategories.get(style.category),
          style.keywords ?? [],
          style.text,
          style.fontSize,
          style.fontWeight,
          style.letterSpacing,
          style.fill,
          style.gradient ? JSON.stringify(style.gradient) : null,
          style.stroke ?? null,
          style.stroke ? (style.strokeWidth ?? 0) : null,
          style.shadow ? JSON.stringify(style.shadow) : null,
          style.curve ?? 0,
          style.italic ?? false,
          position,
        ],
      );
    }

    /*
     * Filters and effects carry their family as an enum rather than pointing at
     * `library_categories`, so there is no category pass for them — the row is
     * the whole record. Position comes from the order the catalogue lists them
     * in, which is the order the panel is meant to show.
     */
    for (const [position, filter] of catalogue.PHOTO_FILTERS.entries()) {
      await client.query(
        `insert into photo_filters (slug, label, category, css, position, published_at)
         values ($1, $2, $3, $4, $5, now())
         on conflict (slug) do update
            set label = excluded.label,
                category = excluded.category,
                css = excluded.css,
                position = excluded.position,
                -- A filter pulled from the shop window by an admin stays pulled;
                -- re-running the seed must not quietly republish it.
                published_at = photo_filters.published_at`,
        [filter.id, filter.label, filter.category, filter.css, position],
      );
    }

    for (const [position, effect] of catalogue.VISUAL_EFFECTS.entries()) {
      await client.query(
        `insert into visual_effects
           (slug, label, category, hint, overlay, blend, opacity, particle, position, published_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, now())
         on conflict (slug) do update
            set label = excluded.label,
                category = excluded.category,
                hint = excluded.hint,
                overlay = excluded.overlay,
                blend = excluded.blend,
                opacity = excluded.opacity,
                particle = excluded.particle,
                position = excluded.position,
                published_at = visual_effects.published_at`,
        [
          effect.id,
          effect.label,
          effect.category,
          effect.hint,
          effect.overlay,
          effect.blend,
          effect.opacity,
          effect.particle ? JSON.stringify(effect.particle) : null,
          position,
        ],
      );
    }

    for (const [position, texture] of catalogue.FRAME_TEXTURES.entries()) {
      await client.query(
        `insert into frame_textures (slug, label, kind, base, accent, position, published_at)
         values ($1, $2, $3, $4, $5, $6, now())
         on conflict (slug) do update
            set label = excluded.label,
                kind = excluded.kind,
                base = excluded.base,
                accent = excluded.accent,
                position = excluded.position,
                published_at = frame_textures.published_at`,
        [
          texture.id,
          texture.label,
          texture.kind,
          texture.base,
          texture.accent,
          position,
        ],
      );
    }

    /*
     * Help categories come from the same catalogue as the articles that sit in
     * them. Migration 0030 seeded the four that existed when it was written;
     * seeding them here as well is what lets a fifth be added in a diff instead
     * of a migration, and keeps the labels and the curated order in one place.
     */
    for (const [position, category] of catalogue.HELP_CATEGORIES.entries()) {
      await client.query(
        `insert into help_categories (slug, label, position)
         values ($1, $2, $3)
         on conflict (slug) do update
            set label = excluded.label,
                position = excluded.position`,
        [category.id, category.label, position],
      );
    }

    /*
     * Help articles. The catalogue in src/lib/help/articles.ts stays the
     * authored source — it is where somebody writes an answer, in a diff a
     * reviewer can read — and the table is where the app reads it from, so a
     * support person can add or amend one later without a deploy. Existing rows
     * are updated rather than replaced, and `published_at` is preserved: an
     * article an admin unpublished must not come back published on the next
     * seed.
     */
    for (const [position, article] of catalogue.HELP_ARTICLES.entries()) {
      await client.query(
        `insert into help_articles
           (slug, title, summary, body, category_id, position, published_at)
         values ($1, $2, $3, $4,
                 (select id from help_categories where slug = $5), $6, now())
         on conflict (slug) do update
            set title = excluded.title,
                summary = excluded.summary,
                body = excluded.body,
                category_id = excluded.category_id,
                position = excluded.position,
                published_at = help_articles.published_at`,
        [
          article.slug,
          article.title,
          article.summary,
          article.body,
          article.category,
          position,
        ],
      );
    }

    await client.query("commit");

    console.log(
      `Seeded ${catalogue.TEMPLATES.length} templates, ` +
        `${catalogue.STICKERS.length} stickers, ` +
        `${catalogue.BACKGROUNDS.length} backgrounds, ` +
        `${catalogue.TEXT_STYLES.length} text styles, ` +
        `${catalogue.PHOTO_FILTERS.length} filters, ` +
        `${catalogue.VISUAL_EFFECTS.length} effects, ` +
        `${catalogue.FRAME_TEXTURES.length} textures, ` +
        `${catalogue.HELP_ARTICLES.length} help articles ` +
        `in ${catalogue.HELP_CATEGORIES.length} categories.`,
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
