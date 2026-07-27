"use client";

import {
  BringToFront,
  Eye,
  EyeOff,
  Hand,
  Lock,
  LockOpen,
  MousePointer2,
  SendToBack,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSelectedObjects } from "@/hooks/use-selected-objects";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { ToolId } from "@/types/editor";

function ToolSwitcher() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  return (
    <ToggleGroup
      type="single"
      size="sm"
      variant="outline"
      value={activeTool}
      onValueChange={(value) => value && setActiveTool(value as ToolId)}
      aria-label="Mode kanvas"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="select" aria-label="Mode pilih">
            <MousePointer2 />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Pilih objek (V)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem value="hand" aria-label="Mode geser kanvas">
            <Hand />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent>Geser kanvas (H)</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}

function SelectionActions() {
  const selected = useSelectedObjects();
  const updateObject = useEditorStore((state) => state.updateObject);
  const removeSelected = useEditorStore((state) => state.removeSelected);
  const reorderSelection = useEditorStore((state) => state.reorderSelection);

  if (selected.length === 0) return null;

  const single = selected.length === 1 ? selected[0] : null;
  const allLocked = selected.every((object) => object.locked);
  const allHidden = selected.every((object) => !object.visible);

  return (
    <>
      <Separator orientation="vertical" className="h-6" />

      <span className="max-w-32 truncate text-xs font-medium">
        {single ? single.name : `${selected.length} objek`}
      </span>

      {single && (
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-muted-foreground text-xs">Opasitas</span>
          <Slider
            value={[Math.round(single.opacity * 100)]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) =>
              updateObject(single.id, { opacity: value / 100 })
            }
            aria-label="Opasitas objek"
            className="w-24"
          />
          <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
            {Math.round(single.opacity * 100)}%
          </span>
        </div>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              selected.forEach((object) =>
                updateObject(object.id, { visible: allHidden }),
              )
            }
            aria-label={allHidden ? "Tampilkan objek" : "Sembunyikan objek"}
          >
            {allHidden ? <EyeOff /> : <Eye />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {allHidden ? "Tampilkan" : "Sembunyikan"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() =>
              selected.forEach((object) =>
                updateObject(object.id, { locked: !allLocked }),
              )
            }
            aria-label={allLocked ? "Buka kunci objek" : "Kunci objek"}
          >
            {allLocked ? <Lock /> : <LockOpen />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{allLocked ? "Buka kunci" : "Kunci"}</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => reorderSelection("front")}
            aria-label="Bawa ke paling depan"
          >
            <BringToFront />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Paling depan (Ctrl+Shift+])</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => reorderSelection("back")}
            aria-label="Kirim ke paling belakang"
          >
            <SendToBack />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Paling belakang (Ctrl+Shift+[)</TooltipContent>
      </Tooltip>

      <Separator orientation="vertical" className="h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={removeSelected}
            disabled={allLocked}
            aria-label="Hapus objek"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Hapus (Del)</TooltipContent>
      </Tooltip>
    </>
  );
}

function PageSummary() {
  const page = useActivePage();
  const selectedCount = useEditorStore((state) => state.selectedIds.length);

  if (selectedCount > 0) return null;

  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      <span className="text-muted-foreground text-xs">
        {page.name} · {page.width} × {page.height} px ·{" "}
        {page.width >= page.height ? "Horizontal" : "Vertikal"}
      </span>
    </>
  );
}

/**
 * Contextual toolbar above the stage: canvas mode on the left, then actions for
 * whatever is selected (or a summary of the page when nothing is).
 */
export function EditorToolbar() {
  return (
    <div className="bg-editor-chrome border-editor-border flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b px-3">
      <ToolSwitcher />
      <SelectionActions />
      <PageSummary />
    </div>
  );
}
