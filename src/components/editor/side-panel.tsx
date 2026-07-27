"use client";

import Link from "next/link";
import { Camera, X } from "lucide-react";

import {
  BackgroundPanel,
  StickerPanel,
  TextPanel,
} from "@/components/editor/panels/decoration-panels";
import { AiPanel } from "@/components/editor/panels/ai-panel";
import { FramePanel } from "@/components/editor/panels/frame-panel";
import { LayersPanel } from "@/components/editor/panels/layers-panel";
import { TemplatePanel } from "@/components/editor/panels/template-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPanel } from "@/lib/editor/panels";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import type { PanelId } from "@/types/editor";

/**
 * Placeholder used by panels whose contents belong to a feature that has not been
 * built yet. It keeps the editor navigable end to end without pretending the
 * feature works.
 */
function PanelPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-editor-border text-muted-foreground rounded-lg border border-dashed p-4 text-xs leading-relaxed">
      {children}
    </div>
  );
}

function PanelBody({ panel }: { panel: PanelId }) {
  switch (panel) {
    case "template":
      return <TemplatePanel />;

    case "frame":
      return <FramePanel />;

    case "photo":
      return (
        <>
          <Button asChild className="w-full">
            <Link href="/kamera">
              <Camera />
              Buka sesi foto
            </Link>
          </Button>
          <PanelPlaceholder>
            Countdown, mirror, flash, retake, dan unggah dari perangkat menyusul
            di halaman <em>Kamera &amp; Unggah Live</em>.
          </PanelPlaceholder>
        </>
      );

    case "text":
      return <TextPanel />;

    case "sticker":
      return <StickerPanel />;

    case "background":
      return <BackgroundPanel />;

    case "ai":
      return <AiPanel />;

    case "layers":
      return <LayersPanel />;
  }
}

export function SidePanel() {
  const activePanel = useEditorStore((state) => state.activePanel);
  const setPanel = useEditorStore((state) => state.setPanel);

  if (!activePanel) return null;

  const panel = getPanel(activePanel);

  return (
    <aside
      aria-label={panel.label}
      className={cn(
        "bg-editor-chrome border-editor-border flex min-h-0 shrink-0 flex-col",
        // Phones: a sheet docked between the stage and the rail. It takes real
        // layout space rather than overlaying, so zoom-to-fit sees the smaller
        // stage and keeps the page fully visible.
        "order-2 h-[42dvh] border-t",
        // Desktop: a column between the rail and the stage.
        "md:order-none md:h-auto md:w-72 md:border-t-0 md:border-r",
      )}
    >
      <div className="border-editor-border flex items-start gap-2 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{panel.label}</h2>
          <p className="text-muted-foreground truncate text-xs">{panel.hint}</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPanel(null)}
          aria-label="Tutup panel"
        >
          <X />
        </Button>
      </div>

      {/* min-h-0 is what lets this actually scroll: without it the flex child's
          automatic minimum size grows the whole column past the viewport. */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-3 p-4">
          <PanelBody panel={activePanel} />
        </div>
      </ScrollArea>
    </aside>
  );
}
