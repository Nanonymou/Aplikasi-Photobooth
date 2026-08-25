import type { LucideIcon } from "lucide-react";

/**
 * A tab that exists but is not built yet.
 *
 * Deliberately explicit rather than an empty panel or a spinner that never
 * resolves: the section's frame lands before its contents, and somebody clicking
 * a tab deserves to know they have arrived somewhere real that has nothing in it
 * yet — not to wonder whether it failed to load.
 *
 * Every use of this is a promise to remove it.
 */
export function SectionPlaceholder({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: string;
}) {
  return (
    <div className="border-border text-muted-foreground flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center">
      <Icon className="size-6 opacity-60" />
      <p className="max-w-sm text-sm leading-relaxed text-pretty">{children}</p>
    </div>
  );
}
