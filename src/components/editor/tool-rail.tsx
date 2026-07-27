"use client";

import { EDITOR_PANELS } from "@/lib/editor/panels";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";

/**
 * The panel switcher: a vertical icon rail on desktop, a horizontal bar pinned to
 * the bottom on phones (where the canvas needs the full width).
 */
export function ToolRail() {
  const activePanel = useEditorStore((state) => state.activePanel);
  const togglePanel = useEditorStore((state) => state.togglePanel);

  return (
    <nav
      aria-label="Panel editor"
      className={cn(
        "bg-editor-chrome border-editor-border flex shrink-0 gap-1",
        "order-last h-18 w-full items-center overflow-x-auto border-t px-2",
        "md:order-none md:h-auto md:w-20 md:flex-col md:overflow-visible md:border-t-0 md:border-r md:px-2 md:py-3",
      )}
    >
      {EDITOR_PANELS.map((panel) => {
        const Icon = panel.icon;
        const active = activePanel === panel.id;

        return (
          <button
            key={panel.id}
            type="button"
            onClick={() => togglePanel(panel.id)}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium transition-colors",
              "h-14 w-16 md:h-16 md:w-full",
              "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-5" />
            {panel.label}
          </button>
        );
      })}
    </nav>
  );
}
