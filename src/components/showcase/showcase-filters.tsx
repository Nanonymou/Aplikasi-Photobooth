import Link from "next/link";
import { Bookmark, Check } from "lucide-react";

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
  state: { category: CategoryId | null; sort: SortId; savedOnly: boolean },
  patch: { category?: CategoryId | null; sort?: SortId; savedOnly?: boolean },
): string {
  const next = { ...state, ...patch };

  const query = new URLSearchParams();
  if (next.category) query.set("kategori", next.category);
  if (next.sort !== "populer") query.set("urut", next.sort);
  if (next.savedOnly) query.set("simpan", "1");

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
  savedOnly,
  counts,
  total,
}: {
  category: CategoryId | null;
  sort: SortId;
  savedOnly: boolean;
  counts: Record<CategoryId, number>;
  total: number;
}) {
  const state = { category, sort, savedOnly };

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Kategori" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex w-max gap-1.5">
          <li>
            <Link
              href={hrefFor(state, { category: null })}
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
                  href={hrefFor(state, { category: option.id })}
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

          {/* A different axis to the categories, so it is set apart rather than
              standing in the row as if it were another occasion. The count is
              missing on purpose: only this browser knows it, and a number
              rendered on the server would be a guess. */}
          <li className="ml-1.5 flex items-center border-l pl-3">
            <Link
              href={hrefFor(state, { savedOnly: !savedOnly })}
              aria-current={savedOnly ? "true" : undefined}
              className={cn(
                chip,
                "flex items-center gap-1.5",
                savedOnly ? chipOn : chipOff,
              )}
            >
              <Bookmark className={cn("size-3.5", savedOnly && "fill-current")} />
              Tersimpan
            </Link>
          </li>
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
              href={hrefFor(state, { sort: option.id })}
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
