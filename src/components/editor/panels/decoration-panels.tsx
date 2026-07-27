"use client";

import { useMemo, useState } from "react";

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
} from "@/lib/editor/decorations";
import { createId } from "@/lib/editor/id";
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
      <LibraryGrid columns={4}>
        {results.map((sticker) => (
          <LibraryTile
            key={sticker.id}
            label={sticker.label}
            onClick={() => {
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
            }}
          >
            <span className="text-2xl">{sticker.glyph}</span>
          </LibraryTile>
        ))}
      </LibraryGrid>
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
        {results.map((style) => (
          <button
            key={style.id}
            type="button"
            onClick={() => {
              const width = Math.round(page.width * 0.8);
              const height = Math.round(style.fontSize * 1.4);

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
              });
            }}
            className="bg-editor-surface border-editor-border hover:border-primary/60 hover:bg-accent focus-visible:ring-ring/50 flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-[3px]"
          >
            <span
              className="max-w-full truncate"
              style={{
                fontSize: Math.min(20, style.fontSize / 3),
                fontWeight: style.fontWeight,
                letterSpacing: style.letterSpacing / 8,
                color: style.fill,
              }}
            >
              {style.text}
            </span>
            <span className="text-muted-foreground text-[11px]">
              {style.label}
            </span>
          </button>
        ))}
      </div>
    </LibraryPanel>
  );
}
