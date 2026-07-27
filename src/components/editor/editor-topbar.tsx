"use client";

import { useState } from "react";
import {
  Aperture,
  Download,
  PanelRightClose,
  PanelRightOpen,
  QrCode,
  Redo2,
  Share2,
  Undo2,
} from "lucide-react";

import { SaveIndicator } from "@/components/editor/save-indicator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCanRedo, useCanUndo, useEditorStore } from "@/store/editor-store";

function ProjectTitle() {
  const title = useEditorStore((state) => state.project.title);
  const renameProject = useEditorStore((state) => state.renameProject);
  const [draft, setDraft] = useState(title);
  const [syncedTitle, setSyncedTitle] = useState(title);

  // Undo/redo can rewrite the title behind our back; re-sync the field during
  // render rather than in an effect, so no extra paint shows the stale value.
  if (title !== syncedTitle) {
    setSyncedTitle(title);
    setDraft(title);
  }

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const next = draft.trim();
        if (next && next !== title) renameProject(next);
        else setDraft(title);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(title);
          event.currentTarget.blur();
        }
      }}
      aria-label="Nama proyek"
      className="h-8 w-40 border-transparent bg-transparent px-2 text-sm font-medium shadow-none hover:border-input focus-visible:bg-background sm:w-56"
    />
  );
}

export function EditorTopbar({
  inspectorOpen,
  onToggleInspector,
}: {
  inspectorOpen: boolean;
  onToggleInspector: () => void;
}) {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return (
    <header className="bg-editor-chrome border-editor-border flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <div className="flex items-center gap-2">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <Aperture className="size-4.5" />
        </span>
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">
          FrameStudio
        </span>
      </div>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ProjectTitle />

      <div className="ml-1 flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Urungkan"
            >
              <Undo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Urungkan (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Ulangi"
            >
              <Redo2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ulangi (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <SaveIndicator className="ml-2 hidden lg:flex" />

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleInspector}
              aria-label={
                inspectorOpen ? "Sembunyikan properti" : "Tampilkan properti"
              }
              aria-pressed={inspectorOpen}
              className="hidden md:inline-flex"
            >
              {inspectorOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Panel properti</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <Share2 />
              Bagikan
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Bagikan hasil</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <QrCode />
              Buat QR Code
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Share2 />
              Kirim ke media sosial
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm">
          <Download />
          <span className="hidden sm:inline">Ekspor</span>
        </Button>
      </div>
    </header>
  );
}
