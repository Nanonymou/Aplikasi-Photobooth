"use client";

import { useMemo, useState } from "react";

import {
  ALL_CATEGORY,
  LibraryPanel,
} from "@/components/editor/panels/library-panel";
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

/** Ready-made designs. Picking one replaces the active page. */
export function TemplatePanel() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL_CATEGORY.id);

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

  function apply(template: DesignTemplate) {
    // Carry photos across so trying templates never costs the user their shots.
    const existingPhotos = page.objects
      .filter((object) => object.kind === "slot")
      .map((slot) => slot.photo);

    applyPageContent(instantiateTemplate(template, existingPhotos));
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
        <p className="text-muted-foreground text-xs leading-relaxed">
          Memilih template mengganti isi halaman aktif beserta ukurannya. Foto
          yang sudah diambil dipindahkan ke slot baru sesuai urutan.
        </p>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {results.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => apply(template)}
            title={template.label}
            className={cn(
              // min-w-0 lets the card shrink: a grid item's automatic minimum
              // size is its content, and the size line below would otherwise
              // push both columns wider than the panel.
              "border-editor-border group flex min-w-0 flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-colors",
              "hover:border-primary/60 hover:bg-accent",
              "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
            )}
          >
            <span className="bg-editor-surface flex h-24 items-center justify-center overflow-hidden rounded">
              <TemplatePreview template={template} />
            </span>
            <span className="truncate px-0.5 text-[11px] font-medium">
              {template.label}
            </span>
            <span className="text-muted-foreground truncate px-0.5 text-[10px] tabular-nums">
              {template.slots.length} slot · {template.width}×{template.height}
            </span>
          </button>
        ))}
      </div>
    </LibraryPanel>
  );
}
