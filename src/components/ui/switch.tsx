"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A toggle switch.
 *
 * Hand-rolled on a native button with `role="switch"` rather than a Radix
 * dependency — it is a single boolean control and the accessible pattern is one
 * attribute. Controlled: pass `checked` and `onCheckedChange`.
 */
function Switch({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<"button">, "onChange" | "type"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "bg-background pointer-events-none block size-4 rounded-full shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export { Switch };
