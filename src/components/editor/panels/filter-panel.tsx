"use client";

import { useState } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { demoShotSource } from "@/lib/camera/demo-shots";
import {
  EFFECT_CATEGORIES,
  effectsByCategory,
  FILTER_CATEGORIES,
  filtersByCategory,
  PHOTO_FILTERS,
  VISUAL_EFFECTS,
  type EffectCategory,
  type FilterCategory,
  type PhotoFilter,
  type VisualEffect,
} from "@/lib/editor/filters";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PhotoSlotObject } from "@/types/editor";

type Tab = "filter" | "effect";

/**
 * Which photos the panel is aiming at, and what to preview on.
 *
 * Selecting a slot narrows the target to it; with nothing selected the panel
 * treats the page as one strip and filters every filled slot, which is what a
 * photostrip almost always wants. A filter shown on a grey square tells you
 * nothing, so the swatches preview the first photo actually being targeted (a
 * sample only when the page has none).
 */
function useFilterTarget() {
  const page = useActivePage();
  const selectedIds = useEditorStore((state) => state.selectedIds);

  const filled = page.objects.filter(
    (object): object is PhotoSlotObject =>
      object.kind === "slot" && object.photo !== null,
  );
  const selected = filled.filter((slot) => selectedIds.includes(slot.id));
  const targets = selected.length > 0 ? selected : filled;

  return {
    targets,
    /** True when the aim came from a selection rather than the whole page. */
    fromSelection: selected.length > 0,
    previewSrc: targets[0]?.photo?.src ?? demoShotSource(0),
    /** The filter already on the target, so the grid opens on what is applied. */
    appliedFilterId: targets[0]?.photo?.filter ?? "none",
  };
}

/**
 * The family selector both tabs share: a scrolling row of chips, so a look is
 * found by intent rather than by scanning every name in one long wall.
 */
function CategoryChips<T extends string>({
  options,
  value,
  onPick,
}: {
  options: { id: T; label: string }[];
  value: T;
  onPick: (id: T) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
      {options.map(({ id, label }) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
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
  );
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
  const { targets, fromSelection, previewSrc, appliedFilterId } =
    useFilterTarget();
  const setSlotFilter = useEditorStore((state) => state.setSlotFilter);

  const [tab, setTab] = useState<Tab>("filter");
  const [category, setCategory] = useState<FilterCategory>("dasar");
  // Weather opens first: it is the group people come to this tab looking for.
  const [effectCategory, setEffectCategory] =
    useState<EffectCategory>("partikel");
  const [effectIds, setEffectIds] = useState<string[]>([]);

  // The canvas is the source of truth for which filter is on: the grid marks
  // what the targeted photo actually carries, not a copy kept beside it.
  const filterId = appliedFilterId;
  const shownFilters = filtersByCategory(category);
  const shownEffects = effectsByCategory(effectCategory);
  const activeFilter = PHOTO_FILTERS.find((filter) => filter.id === filterId);

  function applyFilter(id: string) {
    if (targets.length === 0) return;
    setSlotFilter(
      targets.map((slot) => slot.id),
      id,
    );
  }

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
          <CategoryChips
            options={FILTER_CATEGORIES}
            value={category}
            onPick={setCategory}
          />

          <div className="grid grid-cols-3 gap-2">
            {shownFilters.map((filter) => (
              <FilterSwatch
                key={filter.id}
                filter={filter}
                src={previewSrc}
                active={filterId === filter.id}
                onPick={() => applyFilter(filter.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <CategoryChips
            options={EFFECT_CATEGORIES}
            value={effectCategory}
            onPick={setEffectCategory}
          />

          <div className="grid grid-cols-3 gap-2">
            {shownEffects.map((effect) => (
              <EffectSwatch
                key={effect.id}
                effect={effect}
                src={previewSrc}
                active={effectIds.includes(effect.id)}
                onPick={() => toggleEffect(effect.id)}
              />
            ))}
          </div>
        </>
      )}

      <p className="text-muted-foreground text-[11px] leading-relaxed">
        {tab === "filter"
          ? `${shownFilters.length} filter di kategori ini. Satu filter aktif sekaligus — memilih yang lain menggantikannya.`
          : effectCategory === "partikel"
            ? `${shownEffects.length} efek cuaca — dari gerimis sampai salju lebat. Bisa ditumpuk; ketuk lagi untuk mematikan.`
            : `${shownEffects.length} efek di kategori ini. Bisa ditumpuk; ketuk lagi untuk mematikan.`}
      </p>

      <div className="border-editor-border text-muted-foreground rounded-lg border border-dashed p-3 text-[11px] leading-relaxed">
        {targets.length === 0 ? (
          "Belum ada foto di halaman ini. Isi slot dulu, lalu pilih filternya."
        ) : (
          <>
            Filter:{" "}
            <span className="text-foreground font-medium">
              {activeFilter?.label}
            </span>
            {effectIds.length > 0 && (
              <>
                {" "}
                + efek{" "}
                <span className="text-foreground font-medium">
                  {effectIds
                    .map((id) => VISUAL_EFFECTS.find((e) => e.id === id)?.label)
                    .join(", ")}
                </span>
              </>
            )}
            .{" "}
            {fromSelection
              ? `Diterapkan ke ${targets.length} slot terpilih.`
              : `Diterapkan ke ${targets.length} foto di halaman ini — pilih satu slot untuk menyasar satu foto saja.`}
            {effectIds.length > 0 &&
              " Efek visual di kanvas menyusul di tugas berikutnya."}
          </>
        )}
      </div>
    </>
  );
}
