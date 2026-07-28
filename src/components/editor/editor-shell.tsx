"use client";

import { useState, type ReactNode } from "react";

import { CanvasViewport } from "@/components/editor/canvas/canvas-viewport";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { EditorTopbar } from "@/components/editor/editor-topbar";
import { InspectorPanel } from "@/components/editor/inspector-panel";
import { SidePanel } from "@/components/editor/side-panel";
import { StatusBar } from "@/components/editor/status-bar";
import { ToolRail } from "@/components/editor/tool-rail";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAutosave } from "@/hooks/use-autosave";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";

/**
 * Editor chrome.
 *
 * Desktop: top bar → [tool rail | side panel | stage | inspector] → status bar.
 * Mobile: the rail drops to the bottom, the side panel becomes a full-height
 * overlay above it, and the inspector is hidden (properties move into the panel).
 *
 * `sessionBanner` is an optional strip between the top bar and the workspace,
 * so a session-scoped entry (the anonymous guest page) can frame the editor
 * without the plain `/editor` route carrying anything it does not need.
 */
export function EditorShell({ sessionBanner }: { sessionBanner?: ReactNode }) {
  const [inspectorOpen, setInspectorOpen] = useState(true);
  useEditorShortcuts();
  useAutosave();

  return (
    <TooltipProvider>
      <div className="bg-background flex h-dvh flex-col overflow-hidden">
        <EditorTopbar
          inspectorOpen={inspectorOpen}
          onToggleInspector={() => setInspectorOpen((open) => !open)}
        />

        {sessionBanner}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <ToolRail />
          <SidePanel />

          <main className="order-1 flex min-h-0 min-w-0 flex-1 flex-col md:order-none">
            <EditorToolbar />
            <div className="bg-editor-stage min-h-0 flex-1">
              <CanvasViewport />
            </div>
            <StatusBar />
          </main>

          {inspectorOpen && <InspectorPanel />}
        </div>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}
