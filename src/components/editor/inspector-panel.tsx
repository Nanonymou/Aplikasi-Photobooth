"use client";

import { Settings2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useSelectedObjects } from "@/hooks/use-selected-objects";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { CanvasObject } from "@/types/editor";

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

function ObjectInspector({ object }: { object: CanvasObject }) {
  const updateObject = useEditorStore((state) => state.updateObject);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="truncate text-sm font-semibold">{object.name}</h3>
        <p className="text-muted-foreground text-xs capitalize">{object.kind}</p>
      </div>

      <Separator />

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
        <dt className="text-muted-foreground">Orientasi</dt>
        <dd className="text-right">
          {page.width >= page.height ? "Horizontal" : "Vertikal"}
        </dd>
        <dt className="text-muted-foreground">Objek</dt>
        <dd className="text-right tabular-nums">{page.objects.length}</dd>
      </dl>

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
      className="bg-editor-chrome border-editor-border hidden w-72 shrink-0 border-l md:flex md:flex-col"
    >
      <ScrollArea className="flex-1">
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
