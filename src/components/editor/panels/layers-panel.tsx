"use client";

import { useState } from "react";
import {
  BringToFront,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Lock,
  LockOpen,
  SendToBack,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { slotPathData } from "@/lib/editor/slot-shape";
import { cn } from "@/lib/utils";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { CanvasObject } from "@/types/editor";

/** Miniature of an object, so rows are scannable at a glance. */
function LayerThumbnail({ object }: { object: CanvasObject }) {
  if (object.kind === "slot") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          d={slotPathData(object.shape, 24, 24, object.shape === "rect" ? 5 : 0)}
          fill="currentColor"
        />
      </svg>
    );
  }

  if (object.kind === "sticker") {
    return <span aria-hidden="true">{object.content}</span>;
  }

  if (object.kind === "text") {
    return (
      <span className="text-[13px] font-semibold" aria-hidden="true">
        T
      </span>
    );
  }

  return (
    <span className="text-[13px]" aria-hidden="true">
      ◻
    </span>
  );
}

/** Order controls that act on the current selection. */
function OrderControls({ disabled }: { disabled: boolean }) {
  const reorderSelection = useEditorStore((state) => state.reorderSelection);

  const actions = [
    { mode: "front" as const, label: "Paling depan", icon: BringToFront },
    { mode: "forward" as const, label: "Maju satu", icon: ChevronUp },
    { mode: "backward" as const, label: "Mundur satu", icon: ChevronDown },
    { mode: "back" as const, label: "Paling belakang", icon: SendToBack },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {actions.map(({ mode, label, icon: Icon }) => (
        <Tooltip key={mode}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => reorderSelection(mode)}
              aria-label={label}
            >
              <Icon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/**
 * Layer list for the active page.
 *
 * The list is shown top-layer-first, which is the opposite of `page.objects`
 * (where index 0 renders at the back) — hence the index flipping when a row is
 * dropped.
 */
export function LayersPanel() {
  const page = useActivePage();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const select = useEditorStore((state) => state.select);
  const toggleSelect = useEditorStore((state) => state.toggleSelect);
  const updateObject = useEditorStore((state) => state.updateObject);
  const moveObject = useEditorStore((state) => state.moveObject);

  const [dragRow, setDragRow] = useState<number | null>(null);
  const [dropRow, setDropRow] = useState<number | null>(null);

  const rows = [...page.objects].reverse();
  const toObjectIndex = (row: number) => page.objects.length - 1 - row;

  function handleDrop(row: number) {
    if (dragRow !== null && dragRow !== row) {
      moveObject(rows[dragRow].id, toObjectIndex(row));
    }
    setDragRow(null);
    setDropRow(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          {page.objects.length} objek
        </span>
        <OrderControls disabled={selectedIds.length === 0} />
      </div>

      <Separator />

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          Halaman ini masih kosong. Tambahkan slot foto dari panel Frame.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {rows.map((object, row) => {
            const active = selectedIds.includes(object.id);

            return (
              <li
                key={object.id}
                draggable
                onDragStart={() => setDragRow(row)}
                onDragEnd={() => {
                  setDragRow(null);
                  setDropRow(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDropRow(row);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(row);
                }}
                className={cn(
                  "flex items-center gap-1 rounded-md pr-1 transition-colors",
                  active ? "bg-primary/10 text-primary" : "hover:bg-accent",
                  dragRow === row && "opacity-40",
                  dropRow === row &&
                    dragRow !== null &&
                    dragRow !== row &&
                    "ring-primary/60 ring-2",
                )}
              >
                <span
                  className="text-muted-foreground cursor-grab px-1 active:cursor-grabbing"
                  aria-hidden="true"
                >
                  <GripVertical className="size-3.5" />
                </span>

                <button
                  type="button"
                  onClick={(event) =>
                    event.shiftKey ? toggleSelect(object.id) : select([object.id])
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-xs outline-none"
                >
                  <span className="bg-editor-surface border-editor-border flex size-7 shrink-0 items-center justify-center rounded border">
                    <LayerThumbnail object={object} />
                  </span>
                  <span
                    className={cn(
                      "truncate font-medium",
                      !object.visible && "text-muted-foreground line-through",
                    )}
                  >
                    {object.name}
                  </span>
                </button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7"
                  onClick={() =>
                    updateObject(object.id, { visible: !object.visible })
                  }
                  aria-label={
                    object.visible
                      ? `Sembunyikan ${object.name}`
                      : `Tampilkan ${object.name}`
                  }
                >
                  {object.visible ? (
                    <Eye className="size-3.5" />
                  ) : (
                    <EyeOff className="size-3.5" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="size-7"
                  onClick={() =>
                    updateObject(object.id, { locked: !object.locked })
                  }
                  aria-label={
                    object.locked
                      ? `Buka kunci ${object.name}`
                      : `Kunci ${object.name}`
                  }
                >
                  {object.locked ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <LockOpen className="size-3.5" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-muted-foreground text-xs leading-relaxed">
        Objek teratas di daftar ini tampil paling depan di kanvas. Seret baris
        untuk menukar urutan, atau pakai tombol urutan di atas.
      </p>
    </div>
  );
}
