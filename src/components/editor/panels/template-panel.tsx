"use client";

import { useMemo, useState } from "react";
import { Check, Sparkles, TriangleAlert } from "lucide-react";

import {
  ALL_CATEGORY,
  LibraryPanel,
} from "@/components/editor/panels/library-panel";
import { Button } from "@/components/ui/button";
import { matchesSearch } from "@/lib/editor/decorations";
import { slotPathData } from "@/lib/editor/slot-shape";
import {
  instantiateTemplate,
  TEMPLATE_CATEGORIES,
  TEMPLATES,
  type DesignTemplate,
} from "@/lib/editor/templates";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";

/** SVG thumbnail drawn straight from the template definition. */
function TemplatePreview({ template }: { template: DesignTemplate }) {
  const backgroundId = `bg-${template.id}`;
  const { background } = template;

  return (
    <svg
      viewBox={`0 0 ${template.width} ${template.height}`}
      className="size-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {background.type === "gradient" && (
        <defs>
          <linearGradient
            id={backgroundId}
            gradientTransform={`rotate(${background.angle - 90}, 0.5, 0.5)`}
          >
            <stop offset="0%" stopColor={background.from} />
            <stop offset="100%" stopColor={background.to} />
          </linearGradient>
        </defs>
      )}

      <rect
        width={template.width}
        height={template.height}
        fill={
          background.type === "gradient"
            ? `url(#${backgroundId})`
            : background.type === "solid"
              ? background.color
              : "#ffffff"
        }
      />

      {template.slots.map((slot, index) => (
        <path
          key={index}
          d={slotPathData(
            slot.shape ?? "rect",
            slot.width,
            slot.height,
            slot.cornerRadius ?? 24,
          )}
          transform={`translate(${slot.x} ${slot.y})`}
          fill="#cbd5e1"
          stroke={slot.borderColor ?? "#ffffff"}
          strokeWidth={slot.borderWidth ?? 8}
        />
      ))}

      {/* Text is suggested with a bar rather than rendered: at thumbnail scale
          real glyphs are unreadable and just add noise. */}
      {template.texts?.map((text, index) => (
        <rect
          key={index}
          x={text.x + text.width * 0.2}
          y={text.y}
          width={text.width * 0.6}
          height={text.fontSize}
          rx={text.fontSize / 3}
          fill={text.fill}
          opacity={0.75}
        />
      ))}
    </svg>
  );
}

/**
 * Ready-made designs.
 *
 * Picking is deliberately two steps — click to select, then confirm — because
 * applying rewrites the whole page. A double click skips straight to applying
 * for anyone who already knows what they want.
 */
export function TemplatePanel() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const page = useActivePage();
  const applyPageContent = useEditorStore((state) => state.applyPageContent);

  const results = useMemo(
    () =>
      TEMPLATES.filter(
        (template) =>
          (category === ALL_CATEGORY.id || template.category === category) &&
          matchesSearch(template, search),
      ),
    [category, search],
  );

  const selected = TEMPLATES.find((template) => template.id === selectedId);

  /** Objects a template would discard — photos are carried over, these are not. */
  const decorationsAtRisk = page.objects.filter(
    (object) => object.kind !== "slot",
  ).length;

  function apply(template: DesignTemplate) {
    const existingPhotos = page.objects
      .filter((object) => object.kind === "slot")
      .map((slot) => slot.photo);

    applyPageContent(instantiateTemplate(template, existingPhotos));
    setSelectedId(null);
  }

  return (
    <LibraryPanel
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Cari template…"
      categories={[ALL_CATEGORY, ...TEMPLATE_CATEGORIES]}
      activeCategory={category}
      onCategoryChange={setCategory}
      resultCount={results.length}
      footer={
        selected ? (
          <div className="border-editor-border bg-editor-surface flex flex-col gap-2 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{selected.label}</p>
              <p className="text-muted-foreground text-[11px] tabular-nums">
                {selected.slots.length} slot · {selected.width}×
                {selected.height} px
              </p>
            </div>

            {decorationsAtRisk > 0 && (
              <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
                <TriangleAlert className="mt-0.5 size-3 shrink-0" />
                {decorationsAtRisk} teks/stiker di halaman ini akan diganti. Foto
                tetap dipindahkan ke slot baru.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => apply(selected)}
              >
                <Sparkles />
                Terapkan
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedId(null)}
              >
                Batal
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs leading-relaxed">
            Klik template untuk melihat detailnya, lalu tekan Terapkan. Klik dua
            kali untuk langsung menerapkan.
          </p>
        )
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {results.map((template) => {
          const isSelected = template.id === selectedId;
          const isApplied = page.templateId === template.id;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() =>
                setSelectedId(isSelected ? null : template.id)
              }
              onDoubleClick={() => apply(template)}
              title={template.label}
              aria-pressed={isSelected}
              className={cn(
                // min-w-0 lets the card shrink: a grid item's automatic minimum
                // size is its content, and the size line below would otherwise
                // push both columns wider than the panel.
                "group relative flex min-w-0 flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors",
                "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-editor-border hover:border-primary/60 hover:bg-accent",
              )}
            >
              <span className="bg-editor-surface flex h-24 items-center justify-center overflow-hidden rounded">
                <TemplatePreview template={template} />
              </span>

              {isApplied && (
                <span
                  className="bg-primary text-primary-foreground absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full"
                  title="Sedang dipakai di halaman ini"
                >
                  <Check className="size-3" />
                </span>
              )}

              <span className="truncate px-0.5 text-[11px] font-medium">
                {template.label}
              </span>
              <span className="text-muted-foreground truncate px-0.5 text-[10px] tabular-nums">
                {template.slots.length} slot · {template.width}×
                {template.height}
              </span>
            </button>
          );
        })}
      </div>
    </LibraryPanel>
  );
}
