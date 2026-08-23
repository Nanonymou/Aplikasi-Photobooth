"use client";

import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { demoShotSource } from "@/lib/camera/demo-shots";
import {
  FILTER_CATEGORIES,
  filtersByCategory,
  PHOTO_FILTERS,
  VISUAL_EFFECTS,
  type FilterCategory,
  type PhotoFilter,
  type VisualEffect,
} from "@/lib/editor/filters";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PhotoSlotObject } from "@/types/editor";

type Tab = "filter" | "effect";

/**
 * The image a swatch is previewed on.
 *
 * A filter shown on a grey square tells you nothing, so the swatches preview a
 * real photo: the one in the selected slot when there is one, else the first
 * filled slot on the page, else a sample. That way what the grid shows is what
 * the picked photo will look like.
 */
function usePreviewSource(): string {
  const page = useActivePage();
  const selectedIds = useEditorStore((state) => state.selectedIds);

  const slots = page.objects.filter(
    (object): object is PhotoSlotObject => object.kind === "slot",
  );
  const selected = slots.find((slot) => selectedIds.includes(slot.id));
  const filled = selected?.photo ? selected : slots.find((slot) => slot.photo);

  return filled?.photo?.src ?? demoShotSource(0);
}

function FilterSwatch({
  filter,
  src,
  active,
  onPick,
}: {
  filter: PhotoFilter;
  src: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring/50 group flex flex-col gap-1 rounded-lg outline-none focus-visible:ring-[3px]",
      )}
    >
      <span
        className={cn(
          "relative block aspect-square overflow-hidden rounded-lg border-2 transition-colors",
          active
            ? "border-primary"
            : "border-editor-border group-hover:border-primary/50",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: filter.css || undefined }}
        />
      </span>
      <span
        className={cn(
          "truncate text-[11px]",
          active ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {filter.label}
      </span>
    </button>
  );
}

function EffectSwatch({
  effect,
  src,
  active,
  onPick,
}: {
  effect: VisualEffect;
  src: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      title={effect.hint}
      className="focus-visible:ring-ring/50 group flex flex-col gap-1 rounded-lg outline-none focus-visible:ring-[3px]"
    >
      <span
        className={cn(
          "relative block aspect-square overflow-hidden rounded-lg border-2 transition-colors",
          active
            ? "border-primary"
            : "border-editor-border group-hover:border-primary/50",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="h-full w-full object-cover" />
        {/* The overlay layer is the effect: same background and blend the
            renderer will use, so the swatch is not a hand-drawn imitation. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: effect.overlay,
            mixBlendMode: effect.blend,
            opacity: effect.opacity,
          }}
        />
      </span>
      <span
        className={cn(
          "truncate text-[11px]",
          active ? "text-foreground font-medium" : "text-muted-foreground",
        )}
      >
        {effect.label}
      </span>
    </button>
  );
}

/**
 * Filters and visual effects, browsable.
 *
 * The panel is a chooser first: every option is previewed on the actual photo, so
 * picking is done by eye rather than by reading names. Filters and effects sit
 * behind one switch because they answer the same question but stack differently —
 * one filter at a time (they replace each other), any number of effects (they
 * layer). Selection lives here; applying the picked look to the canvas is the
 * next task in this feature, so the panel says so plainly instead of pretending.
 */
export function FilterPanel() {
  const src = usePreviewSource();
  const [tab, setTab] = useState<Tab>("filter");
  const [category, setCategory] = useState<FilterCategory>("dasar");
  const [filterId, setFilterId] = useState("none");
  const [effectIds, setEffectIds] = useState<string[]>([]);

  const shownFilters = filtersByCategory(category);
  const activeFilter = PHOTO_FILTERS.find((filter) => filter.id === filterId);

  function toggleEffect(id: string) {
    setEffectIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  return (
    <>
      <ToggleGroup
        type="single"
        variant="outline"
        value={tab}
        onValueChange={(value) => value && setTab(value as Tab)}
        className="w-full"
      >
        <ToggleGroupItem value="filter" className="flex-1">
          Filter
        </ToggleGroupItem>
        <ToggleGroupItem value="effect" className="flex-1">
          Efek
        </ToggleGroupItem>
      </ToggleGroup>

      {tab === "filter" ? (
        <>
          {/* Families, so a look is found by intent rather than by scanning
              every name in one long wall. */}
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
            {FILTER_CATEGORIES.map(({ id, label }) => {
              const on = category === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  aria-pressed={on}
                  className={cn(
                    "focus-visible:ring-ring/50 shrink-0 rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px]",
                    on
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-editor-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {shownFilters.map((filter) => (
              <FilterSwatch
                key={filter.id}
                filter={filter}
                src={src}
                active={filterId === filter.id}
                onPick={() => setFilterId(filter.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {VISUAL_EFFECTS.map((effect) => (
            <EffectSwatch
              key={effect.id}
              effect={effect}
              src={src}
              active={effectIds.includes(effect.id)}
              onPick={() => toggleEffect(effect.id)}
            />
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        {tab === "filter"
          ? `${shownFilters.length} filter di kategori ini. Satu filter aktif sekaligus — memilih yang lain menggantikannya.`
          : "Efek bisa ditumpuk. Ketuk lagi untuk mematikannya."}
      </p>

      <div className="border-editor-border text-muted-foreground rounded-lg border border-dashed p-3 text-[11px] leading-relaxed">
        Pilihanmu:{" "}
        <span className="text-foreground font-medium">
          {activeFilter?.label}
        </span>
        {effectIds.length > 0 && (
          <>
            {" "}
            +{" "}
            <span className="text-foreground font-medium">
              {effectIds
                .map((id) => VISUAL_EFFECTS.find((e) => e.id === id)?.label)
                .join(", ")}
            </span>
          </>
        )}
        . Menerapkannya ke foto di kanvas menyusul di tugas berikutnya.
      </div>
    </>
  );
}
