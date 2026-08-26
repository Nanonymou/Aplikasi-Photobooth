import Link from "next/link";
import { Check } from "lucide-react";

import {
  CATEGORIES,
  SORTS,
  type CategoryId,
  type SortId,
} from "@/lib/showcase/feed";
import { cn } from "@/lib/utils";

/**
 * Builds the href for one change, keeping the other choice.
 *
 * The state lives in the URL, so a filtered wall is a link somebody can send —
 * "lihat yang wisuda" is a URL, not an instruction to tap two things. The
 * defaults are left out of the query entirely, so the plain `/jelajah` a visitor
 * arrives on stays the address of the plain wall.
 */
function hrefFor(
  category: CategoryId | null,
  sort: SortId,
  patch: { category?: CategoryId | null; sort?: SortId },
): string {
  const next = {
    category: patch.category === undefined ? category : patch.category,
    sort: patch.sort ?? sort,
  };

  const query = new URLSearchParams();
  if (next.category) query.set("kategori", next.category);
  if (next.sort !== "populer") query.set("urut", next.sort);

  const search = query.toString();
  return search ? `/jelajah?${search}` : "/jelajah";
}

const chip =
  "focus-visible:ring-ring/50 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-[3px]";
const chipOn = "border-primary bg-primary/10 text-primary";
const chipOff = "border-border text-muted-foreground hover:bg-accent hover:text-foreground";

/**
 * Category chips and the sort control.
 *
 * Plain links rather than a client component with state: every choice here is a
 * different view of the same public page, which is exactly what a URL is for.
 * It also means the back button undoes a filter, the wall works before any
 * JavaScript arrives, and there is no third copy of "what does terpopuler mean"
 * living in the browser.
 */
export function ShowcaseFilters({
  category,
  sort,
  counts,
  total,
}: {
  category: CategoryId | null;
  sort: SortId;
  counts: Record<CategoryId, number>;
  total: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Kategori" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1.5">
          <li>
            <Link
              href={hrefFor(category, sort, { category: null })}
              aria-current={category === null ? "true" : undefined}
              className={cn(chip, category === null ? chipOn : chipOff)}
            >
              Semua
              <span className="ml-1.5 tabular-nums opacity-60">{total}</span>
            </Link>
          </li>
          {CATEGORIES.map((option) => {
            const active = category === option.id;
            return (
              <li key={option.id}>
                <Link
                  href={hrefFor(category, sort, { category: option.id })}
                  aria-current={active ? "true" : undefined}
                  className={cn(chip, active ? chipOn : chipOff)}
                >
                  {option.label}
                  <span className="ml-1.5 tabular-nums opacity-60">
                    {counts[option.id]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <nav
        aria-label="Urutkan"
        className="flex flex-wrap items-center gap-1.5 text-xs"
      >
        <span className="text-muted-foreground mr-1">Urutkan:</span>
        {SORTS.map((option) => {
          const active = sort === option.id;
          return (
            <Link
              key={option.id}
              href={hrefFor(category, sort, { sort: option.id })}
              aria-current={active ? "true" : undefined}
              className={cn(
                "focus-visible:ring-ring/50 flex items-center gap-1 rounded-md px-2 py-1 outline-none transition-colors focus-visible:ring-2",
                active
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {active && <Check className="size-3" />}
              {option.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
