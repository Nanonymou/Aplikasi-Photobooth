import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Determinate progress bar.
 *
 * Hand-rolled rather than pulled from `@radix-ui/react-progress`: the only
 * behaviour needed is a width and the ARIA attributes, and this keeps the
 * dependency list where it is.
 */
function Progress({
  value,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & { value: number }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn("bg-muted h-1.5 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full rounded-full transition-[width] duration-200"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export { Progress };
