"use client";

import { useCallback, useMemo, useState } from "react";
import { Spline } from "lucide-react";

import {
  ALL_CATEGORY,
  LibraryGrid,
  LibraryPanel,
  LibraryTile,
} from "@/components/editor/panels/library-panel";
import {
  BACKGROUND_CATEGORIES,
  BACKGROUNDS,
  matchesSearch,
  STICKER_CATEGORIES,
  STICKERS,
  TEXT_STYLE_CATEGORIES,
  TEXT_STYLES,
  type LibraryItem,
  type StickerItem,
  type TextStyleItem,
} from "@/lib/editor/decorations";
import { useRecentStickers } from "@/hooks/use-recent-stickers";
import { createId } from "@/lib/editor/id";
import { arcHeight } from "@/lib/editor/text-path";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PageBackground } from "@/types/editor";

/** Shared search + category filtering for every library panel. */
function useLibrary<T extends LibraryItem>(items: T[]) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY.id);

  const results = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === ALL_CATEGORY.id || item.category === category) &&
          matchesSearch(item, search),
      ),
    [items, category, search],
  );

  return { search, setSearch, category, setCategory, results };
}

/** CSS preview of a page background, for the background tiles. */
function backgroundStyle(background: PageBackground): React.CSSProperties {
  if (background.type === "gradient") {
    return {
      backgroundImage: `linear-gradient(${background.angle}deg, ${background.from}, ${background.to})`,
    };
  }
  if (background.type === "solid") return { backgroundColor: background.color };
  return { backgroundImage: `url(${background.src})`, backgroundSize: "cover" };
}

export function StickerPanel() {
  const { search, setSearch, category, setCategory, results } =
    useLibrary(STICKERS);
  const page = useActivePage();
  const addObject = useEditorStore((state) => state.addObject);
  const { recent, remember } = useRecentStickers();

  const place = useCallback(
    (sticker: StickerItem) => {
      const size = Math.round(Math.min(page.width, page.height) * 0.16);

      addObject({
        id: createId("sticker"),
        kind: "sticker",
        name: sticker.label,
        x: (page.width - size) / 2,
        y: (page.height - size) / 2,
        width: size,
        height: size,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        content: sticker.glyph,
      });
      remember(sticker.id);
    },
    [page.width, page.height, addObject, remember],
  );

  // Resolved from ids so a sticker dropped from the catalogue simply disappears
  // from the recents rather than rendering as a hole.
  const recentStickers = recent
    .map((id) => STICKERS.find((sticker) => sticker.id === id))
    .filter((sticker): sticker is StickerItem => !!sticker);

  return (
    <LibraryPanel
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari stiker…"
      categories={[ALL_CATEGORY, ...STICKER_CATEGORIES]}
      activeCategory={category}
      onCategoryChange={setCategory}
      resultCount={results.length}
    >
      <div className="flex flex-col gap-3">
        {recentStickers.length > 0 && !search && (
          <section className="flex flex-col gap-1.5">
            <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              Baru dipakai
            </h3>
            <LibraryGrid columns={4}>
              {recentStickers.map((sticker) => (
                <LibraryTile
                  key={`recent-${sticker.id}`}
                  label={sticker.label}
                  onClick={() => place(sticker)}
                >
                  <span className="text-2xl">{sticker.glyph}</span>
                </LibraryTile>
              ))}
            </LibraryGrid>
          </section>
        )}

        <section className="flex flex-col gap-1.5">
          {recentStickers.length > 0 && !search && (
            <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {results.length} stiker
            </h3>
          )}
          <LibraryGrid columns={4}>
            {results.map((sticker) => (
              <LibraryTile
                key={sticker.id}
                label={sticker.label}
                onClick={() => place(sticker)}
              >
                <span className="text-2xl">{sticker.glyph}</span>
              </LibraryTile>
            ))}
          </LibraryGrid>
        </section>
      </div>
    </LibraryPanel>
  );
}

export function BackgroundPanel() {
  const { search, setSearch, category, setCategory, results } =
    useLibrary(BACKGROUNDS);
  const setPageBackground = useEditorStore((state) => state.setPageBackground);

  return (
    <LibraryPanel
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari latar…"
      categories={[ALL_CATEGORY, ...BACKGROUND_CATEGORIES]}
      activeCategory={category}
      onCategoryChange={setCategory}
      resultCount={results.length}
    >
      <LibraryGrid columns={3}>
        {results.map((item) => (
          <LibraryTile
            key={item.id}
            label={item.label}
            onClick={() => setPageBackground(item.background)}
            className="p-0"
          >
            <span
              className="size-full"
              style={backgroundStyle(item.background)}
            />
          </LibraryTile>
        ))}
      </LibraryGrid>
    </LibraryPanel>
  );
}

/** CSS approximation of a text preset, for the panel preview. */
function previewStyle(style: TextStyleItem): React.CSSProperties {
  const base: React.CSSProperties = {
    fontSize: Math.min(20, Math.max(13, style.fontSize / 3.5)),
    fontWeight: style.fontWeight,
    fontStyle: style.italic ? "italic" : "normal",
    letterSpacing: style.letterSpacing / 8,
    color: style.fill,
  };

  if (style.gradient) {
    // background-clip:text is how the browser paints a gradient into glyphs.
    return {
      ...base,
      backgroundImage: `linear-gradient(${style.gradient.angle}deg, ${style.gradient.from}, ${style.gradient.to})`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    };
  }

  if (style.stroke && style.strokeWidth) {
    return {
      ...base,
      WebkitTextStrokeWidth: Math.max(1, style.strokeWidth / 4),
      WebkitTextStrokeColor: style.stroke,
    };
  }

  if (style.shadow) {
    const { offsetX, offsetY, blur, color } = style.shadow;
    return {
      ...base,
      textShadow: `${offsetX / 3}px ${offsetY / 3}px ${blur / 3}px ${color}`,
    };
  }

  return base;
}

export function TextPanel() {
  const { search, setSearch, category, setCategory, results } =
    useLibrary(TEXT_STYLES);
  const page = useActivePage();
  const addObject = useEditorStore((state) => state.addObject);

  return (
    <LibraryPanel
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari gaya teks…"
      categories={[ALL_CATEGORY, ...TEXT_STYLE_CATEGORIES]}
      activeCategory={category}
      onCategoryChange={setCategory}
      resultCount={results.length}
    >
      <div className="flex flex-col gap-2">
        {results.map((style) => {
          const curve = style.curve ?? 0;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => {
                const width = Math.round(page.width * 0.8);
                // Curved text needs room for the arc on top of the line box.
                const height = Math.round(
                  style.fontSize * 1.4 + arcHeight(width, curve),
                );

                addObject({
                  id: createId("text"),
                  kind: "text",
                  name: style.label,
                  x: (page.width - width) / 2,
                  y: (page.height - height) / 2,
                  width,
                  height,
                  rotation: 0,
                  opacity: 1,
                  locked: false,
                  visible: true,
                  text: style.text,
                  fontFamily: "var(--font-geist-sans)",
                  fontSize: style.fontSize,
                  fontWeight: style.fontWeight,
                  letterSpacing: style.letterSpacing,
                  lineHeight: 1.2,
                  align: "center",
                  fill: style.fill,
                  gradient: style.gradient ?? null,
                  stroke: style.stroke ?? null,
                  strokeWidth: style.strokeWidth ?? 0,
                  shadow: style.shadow ?? null,
                  curve,
                  italic: style.italic ?? false,
                });
              }}
              className="bg-editor-surface border-editor-border hover:border-primary/60 hover:bg-accent focus-visible:ring-ring/50 flex min-w-0 flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-[3px]"
            >
              <span className="max-w-full truncate" style={previewStyle(style)}>
                {style.text}
              </span>
              <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                {curve !== 0 && <Spline className="size-3" />}
                {style.label}
              </span>
            </button>
          );
        })}
      </div>
    </LibraryPanel>
  );
}
