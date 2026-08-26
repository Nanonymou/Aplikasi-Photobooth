"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A tab's content, arriving.
 *
 * Keyed by the path so React remounts the subtree on every navigation and the
 * animation runs again — without the key it would play once, on the first tab
 * somebody opened, and never again.
 *
 * The animation itself is one CSS class, which is what lets a single
 * `prefers-reduced-motion` rule switch it off; a JavaScript spring would have to
 * be asked, in every component, whether it was welcome.
 */
export function SectionTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="settings-enter flex flex-1 flex-col gap-6">
      {children}
    </div>
  );
}
