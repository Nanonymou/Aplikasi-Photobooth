"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  RectangleHorizontal,
  RectangleVertical,
  Settings2,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSelectedObjects } from "@/hooks/use-selected-objects";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import { pageOrientation } from "@/types/editor";
import type {
  CanvasObject,
  PageOrientation,
  TextObject,
} from "@/types/editor";

function Field({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        {label}
        {suffix ? ` (${suffix})` : ""}
      </span>
      <Input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onCommit(next);
        }}
        className="h-8"
      />
    </label>
  );
}

/** Type controls, shown when the selection is a single text object. */
function TextProperties({ object }: { object: TextObject }) {
  const updateObject = useEditorStore((state) => state.updateObject);
  const patch = (next: Partial<TextObject>) => updateObject(object.id, next);

  const curve = object.curve ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Isi teks
        </span>
        <textarea
          value={object.text}
          onChange={(event) => patch({ text: event.target.value })}
          rows={2}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Ukuran"
          value={object.fontSize}
          min={4}
          onCommit={(fontSize) => patch({ fontSize })}
        />
        <Field
          label="Spasi huruf"
          value={object.letterSpacing}
          onCommit={(letterSpacing) => patch({ letterSpacing })}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Perataan
        </span>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={object.align}
          onValueChange={(value) =>
            value && patch({ align: value as TextObject["align"] })
          }
          aria-label="Perataan teks"
        >
          <ToggleGroupItem value="left" aria-label="Rata kiri">
            <AlignLeft />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Rata tengah">
            <AlignCenter />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Rata kanan">
            <AlignRight />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <label className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          Warna
        </span>
        <input
          type="color"
          value={object.fill}
          onChange={(event) =>
            // A picked colour replaces any gradient, otherwise the change would
            // appear to do nothing — the gradient paints over `fill`.
            patch({ fill: event.target.value, gradient: null })
          }
          aria-label="Warna teks"
          className="border-input size-8 cursor-pointer rounded border bg-transparent"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            Lengkung
          </span>
          <span className="text-muted-foreground text-xs tabular-nums">
            {Math.round(curve)}°
          </span>
        </div>
        <Slider
          value={[curve]}
          min={-180}
          max={180}
          step={5}
          onValueChange={([value]) => patch({ curve: value })}
          aria-label="Lengkung teks"
        />
      </div>
    </div>
  );
}

function ObjectInspector({ object }: { object: CanvasObject }) {
  const updateObject = useEditorStore((state) => state.updateObject);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="truncate text-sm font-semibold">{object.name}</h3>
        <p className="text-muted-foreground text-xs capitalize">{object.kind}</p>
      </div>

      <Separator />

      {object.kind === "text" && <TextProperties object={object} />}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="X"
          value={object.x}
          onCommit={(x) => updateObject(object.id, { x })}
        />
        <Field
          label="Y"
          value={object.y}
          onCommit={(y) => updateObject(object.id, { y })}
        />
        <Field
          label="Lebar"
          value={object.width}
          min={1}
          onCommit={(width) => updateObject(object.id, { width })}
        />
        <Field
          label="Tinggi"
          value={object.height}
          min={1}
          onCommit={(height) => updateObject(object.id, { height })}
        />
        <Field
          label="Rotasi"
          value={object.rotation}
          step={1}
          suffix="°"
          onCommit={(rotation) => updateObject(object.id, { rotation })}
        />
        <Field
          label="Opasitas"
          value={Math.round(object.opacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onCommit={(value) =>
            updateObject(object.id, {
              opacity: Math.min(1, Math.max(0, value / 100)),
            })
          }
        />
      </div>
    </div>
  );
}

function PageInspector() {
  const page = useActivePage();
  const setPageOrientation = useEditorStore(
    (state) => state.setPageOrientation,
  );

  // A square is neither, and saying "Horizontal" about one would be a claim the
  // button cannot honour — turning a square gives the same square back.
  const square = page.width === page.height;
  const orientation = square ? "" : pageOrientation(page);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold">{page.name}</h3>
        <p className="text-muted-foreground text-xs">Properti halaman</p>
      </div>

      <Separator />

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <dt className="text-muted-foreground">Ukuran</dt>
        <dd className="text-right tabular-nums">
          {page.width} × {page.height}
        </dd>
        <dt className="text-muted-foreground">Objek</dt>
        <dd className="text-right tabular-nums">{page.objects.length}</dd>
      </dl>

      {/* Per page, not per project: a strip and the card that goes with it are
          different shapes, and the control sits with the rest of this page's
          properties so it is obvious which one it turns. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">Orientasi</span>
        <ToggleGroup
          type="single"
          variant="outline"
          value={orientation}
          onValueChange={(value) =>
            value && setPageOrientation(value as PageOrientation)
          }
          className="w-full"
        >
          <ToggleGroupItem value="portrait" className="flex-1">
            <RectangleVertical />
            Vertikal
          </ToggleGroupItem>
          <ToggleGroupItem value="landscape" className="flex-1">
            <RectangleHorizontal />
            Horizontal
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {square
            ? "Halaman ini persegi, jadi memutarnya tidak mengubah apa pun. Ubah ukurannya dulu lewat template."
            : "Memutar halaman menukar ukurannya dan mengecilkan isinya agar tetap muat — tanpa mengubah perbandingan sisi foto mana pun."}
        </p>
      </div>

      <div className="border-editor-border text-muted-foreground flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs leading-relaxed">
        <Settings2 className="mt-0.5 size-3.5 shrink-0" />
        Pilih objek di kanvas untuk menyunting posisi, ukuran, rotasi, dan
        opasitasnya.
      </div>
    </div>
  );
}

/** Right-hand properties panel: the selected object, or the page when idle. */
export function InspectorPanel() {
  const selected = useSelectedObjects();

  return (
    <aside
      aria-label="Properti"
      className="bg-editor-chrome border-editor-border hidden w-72 shrink-0 border-l md:flex md:min-h-0 md:flex-col"
    >
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {selected.length === 1 ? (
            <ObjectInspector object={selected[0]} />
          ) : selected.length > 1 ? (
            <div className="text-muted-foreground text-xs">
              {selected.length} objek terpilih. Pilih satu objek untuk menyunting
              propertinya.
            </div>
          ) : (
            <PageInspector />
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
