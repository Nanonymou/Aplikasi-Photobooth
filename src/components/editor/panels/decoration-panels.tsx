"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Grid2x2, Plus, Spline } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useRecentStickers } from "@/hooks/use-recent-stickers";
import { useSelectedObjects } from "@/hooks/use-selected-objects";
import { STICKER_DRAG_TYPE } from "@/lib/editor/drag-payload";
import { createId } from "@/lib/editor/id";
import {
  getPattern,
  patternDataUri,
  transparencyCheckerDataUri,
  TRANSPARENCY_TILE_SIZE,
  type PatternId,
} from "@/lib/editor/patterns";
import { arcHeight } from "@/lib/editor/text-path";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PageBackground, TextObject } from "@/types/editor";

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

  if (background.type === "pattern") {
    const pattern = getPattern(background.pattern as PatternId);
    // Same SVG the canvas tiles, so the swatch cannot drift from the result.
    return {
      backgroundColor: background.background,
      backgroundImage: `url("${patternDataUri(background.pattern as PatternId, background.foreground, background.background)}")`,
      backgroundSize: `${pattern.tile * background.scale}px ${pattern.tile * background.scale}px`,
    };
  }

  if (background.type === "transparent") {
    return {
      backgroundImage: `url("${transparencyCheckerDataUri()}")`,
      backgroundSize: `${TRANSPARENCY_TILE_SIZE / 2}px ${TRANSPARENCY_TILE_SIZE / 2}px`,
    };
  }

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
                  onDragStart={(event) =>
                    event.dataTransfer.setData(STICKER_DRAG_TYPE, sticker.id)
                  }
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
                onDragStart={(event) =>
                  event.dataTransfer.setData(STICKER_DRAG_TYPE, sticker.id)
                }
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

/** Structural equality, so the applied preset can be highlighted. */
function sameBackground(a: PageBackground, b: PageBackground): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case "transparent":
      return true;
    case "solid":
      return a.color === (b as typeof a).color;
    case "gradient": {
      const other = b as typeof a;
      return (
        a.from === other.from && a.to === other.to && a.angle === other.angle
      );
    }
    case "pattern": {
      const other = b as typeof a;
      return (
        a.pattern === other.pattern &&
        a.foreground === other.foreground &&
        a.background === other.background &&
        a.scale === other.scale
      );
    }
    case "image":
      return a.src === (b as typeof a).src;
  }
}

/** Fine-tuning for whatever background the page currently has. */
function BackgroundControls() {
  const page = useActivePage();
  const setPageBackground = useEditorStore((state) => state.setPageBackground);
  const background = page.background;

  if (background.type === "gradient") {
    return (
      <div className="border-editor-border flex flex-col gap-2.5 rounded-lg border p-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Atur gradasi
        </p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={background.from}
            onChange={(event) =>
              setPageBackground({ ...background, from: event.target.value })
            }
            aria-label="Warna awal gradasi"
            className="border-input size-8 cursor-pointer rounded border bg-transparent"
          />
          <input
            type="color"
            value={background.to}
            onChange={(event) =>
              setPageBackground({ ...background, to: event.target.value })
            }
            aria-label="Warna akhir gradasi"
            className="border-input size-8 cursor-pointer rounded border bg-transparent"
          />
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {Math.round(background.angle)}°
          </span>
        </div>
        <Slider
          value={[background.angle]}
          min={0}
          max={360}
          step={5}
          onValueChange={([angle]) => setPageBackground({ ...background, angle })}
          aria-label="Sudut gradasi"
        />
      </div>
    );
  }

  if (background.type === "pattern") {
    return (
      <div className="border-editor-border flex flex-col gap-2.5 rounded-lg border p-3">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          Atur pola
        </p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={background.foreground}
            onChange={(event) =>
              setPageBackground({
                ...background,
                foreground: event.target.value,
              })
            }
            aria-label="Warna motif"
            className="border-input size-8 cursor-pointer rounded border bg-transparent"
          />
          <input
            type="color"
            value={background.background}
            onChange={(event) =>
              setPageBackground({
                ...background,
                background: event.target.value,
              })
            }
            aria-label="Warna dasar pola"
            className="border-input size-8 cursor-pointer rounded border bg-transparent"
          />
          <span className="text-muted-foreground ml-auto text-xs tabular-nums">
            {background.scale.toFixed(1)}×
          </span>
        </div>
        <Slider
          value={[background.scale]}
          min={0.5}
          max={4}
          step={0.1}
          onValueChange={([scale]) => setPageBackground({ ...background, scale })}
          aria-label="Ukuran pola"
        />
      </div>
    );
  }

  return null;
}

export function BackgroundPanel() {
  const { search, setSearch, category, setCategory, results } =
    useLibrary(BACKGROUNDS);
  const page = useActivePage();
  const setPageBackground = useEditorStore((state) => state.setPageBackground);
  const [customColor, setCustomColor] = useState("#ffffff");

  return (
    <LibraryPanel
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari latar…"
      categories={[ALL_CATEGORY, ...BACKGROUND_CATEGORIES]}
      activeCategory={category}
      onCategoryChange={setCategory}
      resultCount={results.length}
      footer={
        <div className="flex flex-col gap-3">
          <BackgroundControls />

          <label className="border-editor-border flex items-center justify-between gap-2 rounded-lg border p-2.5">
            <span className="text-xs font-medium">Warna kustom</span>
            <input
              type="color"
              value={customColor}
              onChange={(event) => {
                setCustomColor(event.target.value);
                setPageBackground({ type: "solid", color: event.target.value });
              }}
              aria-label="Pilih warna latar kustom"
              className="border-editor-border size-8 cursor-pointer rounded border bg-transparent"
            />
          </label>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() =>
                setPageBackground({ type: "solid", color: "#ffffff" })
              }
            >
              Putih polos
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setPageBackground({ type: "transparent" })}
            >
              <Grid2x2 />
              Transparan
            </Button>
          </div>
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Latar transparan disimpan tanpa warna, jadi ekspor PNG-nya
            mempertahankan alpha — cocok untuk frame yang ditempel di atas
            desain lain.
          </p>
        </div>
      }
    >
      <LibraryGrid columns={3}>
        {results.map((item) => {
          const active = sameBackground(page.background, item.background);

          return (
            <LibraryTile
              key={item.id}
              label={item.label}
              onClick={() => setPageBackground(item.background)}
              className={cn(
                "relative p-0",
                active && "border-primary ring-primary/40 ring-2",
              )}
            >
              <span
                className="size-full"
                style={backgroundStyle(item.background)}
              />
              {active && (
                <span className="bg-primary text-primary-foreground absolute right-1 top-1 flex size-4 items-center justify-center rounded-full">
                  <Check className="size-2.5" />
                </span>
              )}
            </LibraryTile>
          );
        })}
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
  const updateObject = useEditorStore((state) => state.updateObject);
  const [forceAdd, setForceAdd] = useState(false);

  // With a single text object selected, a style restyles it in place — that is
  // what "pick a style" means once something is already on the canvas. Adding a
  // second copy would be the surprising outcome.
  const selectedText = useSelectedObjects().find(
    (object): object is TextObject => object.kind === "text",
  );
  const target = forceAdd ? null : selectedText;

  /** Visual properties a preset carries; content and geometry stay put. */
  function styleOf(style: TextStyleItem): Partial<TextObject> {
    return {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      letterSpacing: style.letterSpacing,
      fill: style.fill,
      gradient: style.gradient ?? null,
      stroke: style.stroke ?? null,
      strokeWidth: style.strokeWidth ?? 0,
      shadow: style.shadow ?? null,
      curve: style.curve ?? 0,
      italic: style.italic ?? false,
    };
  }

  function pick(style: TextStyleItem) {
    const curve = style.curve ?? 0;

    if (target) {
      updateObject(target.id, {
        ...styleOf(style),
        // Keep room for the arc so curved text is not clipped by the old box.
        height: Math.round(
          style.fontSize * 1.4 + arcHeight(target.width, curve),
        ),
      });
      return;
    }

    const width = Math.round(page.width * 0.8);
    const height = Math.round(style.fontSize * 1.4 + arcHeight(width, curve));

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
      lineHeight: 1.2,
      align: "center",
      ...styleOf(style),
    } as TextObject);
    setForceAdd(false);
  }

  return (
    <LibraryPanel
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari gaya teks…"
      categories={[ALL_CATEGORY, ...TEXT_STYLE_CATEGORIES]}
      activeCategory={category}
      onCategoryChange={setCategory}
      resultCount={results.length}
      footer={
        <div className="border-editor-border flex items-center gap-2 rounded-lg border p-2.5">
          <p className="text-muted-foreground min-w-0 flex-1 text-[11px] leading-relaxed">
            {target ? (
              <>
                Gaya diterapkan ke{" "}
                <span className="text-foreground font-medium">
                  {target.name}
                </span>
              </>
            ) : (
              "Gaya menambahkan teks baru di tengah halaman."
            )}
          </p>
          {target ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setForceAdd(true)}
            >
              <Plus />
              Teks baru
            </Button>
          ) : (
            selectedText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setForceAdd(false)}
              >
                Ke objek terpilih
              </Button>
            )
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {results.map((style) => {
          const curve = style.curve ?? 0;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => pick(style)}
              className="bg-editor-surface border-editor-border hover:border-primary/60 hover:bg-accent focus-visible:ring-ring/50 flex min-w-0 flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left outline-none focus-visible:ring-[3px]"
            >
              <span className="max-w-full truncate" style={previewStyle(style)}>
                {target ? target.text : style.text}
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
