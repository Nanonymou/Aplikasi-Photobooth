"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToastStore, type ToastVariant } from "@/store/toast-store";

const ICONS = {
  success: Check,
  error: TriangleAlert,
  info: Info,
} as const;

const ACCENT: Record<ToastVariant, string> = {
  success: "text-primary",
  error: "text-destructive",
  info: "text-muted-foreground",
};

/** Stack of transient notifications, bottom-right, above every panel. */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed right-3 bottom-3 z-50 flex w-72 flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((item) => {
          const Icon = ICONS[item.variant];

          return (
            <motion.div
              key={item.id}
              layout
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
              className="bg-editor-chrome border-editor-border pointer-events-auto flex items-start gap-2 rounded-lg border p-3 shadow-lg"
            >
              <Icon className={cn("mt-0.5 size-3.5 shrink-0", ACCENT[item.variant])} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed break-words">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Tutup notifikasi"
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mt-0.5 rounded outline-none focus-visible:ring-[3px]"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
