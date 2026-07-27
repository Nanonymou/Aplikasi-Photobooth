"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface LibraryCategory {
  id: string;
  label: string;
}

/** Category shown when nothing is filtered. */
export const ALL_CATEGORY: LibraryCategory = { id: "all", label: "Semua" };

/**
 * Shared shell for every decoration library — stickers, backgrounds, text
 * styles, templates.
 *
 * Each library differs only in its catalogue and how a tile renders, so the
 * search field, category chips, scrolling grid and empty state live here once.
 */
export function LibraryPanel({
  search,
  onSearchChange,
  searchPlaceholder,
  categories,
  activeCategory,
  onCategoryChange,
  resultCount,
  children,
  footer,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  categories: LibraryCategory[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  resultCount: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-9 pl-8 pr-8"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onSearchChange("")}
            aria-label="Hapus pencarian"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {categories.length > 1 && (
        <div
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="Kategori"
        >
          {categories.map((category) => {
            const active = category.id === activeCategory;

            return (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-editor-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      )}

      {resultCount === 0 ? (
        <p className="border-editor-border text-muted-foreground rounded-lg border border-dashed p-4 text-xs leading-relaxed">
          Tidak ada hasil{search ? ` untuk “${search}”` : ""}. Coba kata kunci
          atau kategori lain.
        </p>
      ) : (
        children
      )}

      {footer}
    </div>
  );
}

/** Uniform tile grid for library items. */
export function LibraryGrid({
  columns = 3,
  children,
}: {
  columns?: 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

/** A single library item: a square preview with an accessible label. */
export function LibraryTile({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "bg-editor-surface border-editor-border flex aspect-square items-center justify-center overflow-hidden rounded-lg border transition-colors",
        "hover:border-primary/60 hover:bg-accent",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        className,
      )}
    >
      {children}
    </button>
  );
}
