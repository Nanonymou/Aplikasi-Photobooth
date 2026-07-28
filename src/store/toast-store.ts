import { create } from "zustand";

import { createId } from "@/lib/editor/id";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const DISMISS_AFTER = { success: 5000, info: 5000, error: 9000 } as const;

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

/**
 * Transient notifications.
 *
 * Downloads are the reason this exists: a file lands in the browser's download
 * tray with no in-app trace, and the dialog it was started from is often closed
 * by then. A toast outlives the dialog, so the confirmation reaches the user
 * wherever they happen to be.
 */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  push: (toast) => {
    const id = createId("toast");
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => get().dismiss(id), DISMISS_AFTER[toast.variant]);
    return id;
  },

  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

/** Non-hook access, for use inside event handlers and async flows. */
export function toast(entry: Omit<Toast, "id">): string {
  return useToastStore.getState().push(entry);
}
