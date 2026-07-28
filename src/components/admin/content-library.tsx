"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Image as ImageIcon,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sticker,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";

import {
  ContentForm,
  type ContentDraft,
} from "@/components/admin/content-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ADMIN_CONTENT,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  type ContentItem,
  type ContentStatus,
  type ContentType,
} from "@/lib/admin/content";
import { createId } from "@/lib/editor/id";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<ContentType, LucideIcon> = {
  template: LayoutTemplate,
  sticker: Sticker,
  background: ImageIcon,
  textstyle: Type,
};

/** Preview gradient per type, so the grid reads by kind at a glance. */
const TYPE_GRADIENT: Record<ContentType, string> = {
  template: "from-primary/25 to-primary/5",
  sticker: "from-pink-500/25 to-amber-500/10",
  background: "from-sky-500/25 to-emerald-500/10",
  textstyle: "from-violet-500/25 to-fuchsia-500/10",
};

const TYPE_BADGE: Record<ContentType, string> = {
  template: "bg-primary/10 text-primary",
  sticker: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  background: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  textstyle: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const STATUS_BADGE: Record<ContentStatus, string> = {
  published: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  draft: "bg-muted text-muted-foreground",
};

const TYPE_FILTERS: (ContentType | "all")[] = [
  "all",
  "template",
  "sticker",
  "background",
  "textstyle",
];

function Badge({ className, children }: { className: string; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * The content pustaka, searchable and filterable by kind.
 *
 * Templates and the assets that dress them, shown as a preview grid because
 * content is looked at, not read: each card leads with a kind-tinted swatch, then
 * its name, category, and whether it is live. Search and the type filter combine
 * on the client over the library. The per-card menu acts on it — open in the
 * editor, publish or pull, delete — mutating the list in place ahead of the API.
 */
export function ContentLibrary() {
  const [items, setItems] = useState<ContentItem[]>(ADMIN_CONTENT);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ContentType | "all">("all");
  const [deleting, setDeleting] = useState<ContentItem | null>(null);
  // The upload/edit modal: open flag, and the item being edited (null = create).
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function submitForm(draft: ContentDraft) {
    if (editing) {
      setItems((current) =>
        current.map((item) =>
          item.id === editing.id
            ? { ...item, ...draft, updated: "baru saja" }
            : item,
        ),
      );
    } else {
      setItems((current) => [
        { id: createId("content"), updated: "baru saja", ...draft },
        ...current,
      ]);
    }
    setFormOpen(false);
    setEditing(null);
  }

  const counts = useMemo(() => {
    const tally: Record<ContentType, number> = {
      template: 0,
      sticker: 0,
      background: 0,
      textstyle: 0,
    };
    for (const item of items) tally[item.type] += 1;
    return tally;
  }, [items]);

  function togglePublish(target: ContentItem) {
    setItems((current) =>
      current.map((item) =>
        item.id === target.id
          ? {
              ...item,
              status: item.status === "published" ? "draft" : "published",
            }
          : item,
      ),
    );
  }

  function confirmDelete() {
    if (deleting) {
      setItems((current) => current.filter((item) => item.id !== deleting.id));
    }
    setDeleting(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (type !== "all" && item.type !== type) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, query, type]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TYPE_FILTERS.filter((t): t is ContentType => t !== "all").map((t) => {
          const Icon = TYPE_ICON[t];
          return (
            <div
              key={t}
              className="bg-card border-border flex items-center gap-2.5 rounded-lg border px-3 py-2"
            >
              <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold tabular-nums">{counts[t]}</p>
                <p className="text-muted-foreground text-xs">
                  {CONTENT_TYPE_LABELS[t]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau kategori…"
            aria-label="Cari konten"
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="min-w-0 overflow-x-auto">
            <ToggleGroup
              type="single"
              variant="outline"
              value={type}
              onValueChange={(value) =>
                setType((value as ContentType | "all") || "all")
              }
            >
              {TYPE_FILTERS.map((id) => (
                <ToggleGroupItem
                  key={id}
                  value={id}
                  className="whitespace-nowrap"
                >
                  {id === "all" ? "Semua" : CONTENT_TYPE_LABELS[id]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button size="sm" onClick={openCreate} className="shrink-0">
            <Plus />
            <span className="hidden sm:inline">Unggah</span>
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border-border text-muted-foreground rounded-xl border px-4 py-16 text-center text-sm">
          Tidak ada konten yang cocok.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => {
            const Icon = TYPE_ICON[item.type];
            return (
              <div
                key={item.id}
                className="bg-card border-border flex flex-col overflow-hidden rounded-xl border"
              >
                <div
                  className={cn(
                    "relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br",
                    TYPE_GRADIENT[item.type],
                  )}
                >
                  {item.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.src}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <Icon className="text-foreground/40 size-8" />
                  )}
                  <span className="absolute top-2 left-2">
                    <Badge className={STATUS_BADGE[item.status]}>
                      {CONTENT_STATUS_LABELS[item.status]}
                    </Badge>
                  </span>
                  <div className="absolute top-1.5 right-1.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Tindakan untuk ${item.name}`}
                          className="bg-background/70 hover:bg-background size-7 backdrop-blur"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => openEdit(item)}>
                          <Pencil />
                          Sunting
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/editor">Buka di editor</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => togglePublish(item)}>
                          {item.status === "published" ? (
                            <>
                              <ArrowDownToLine />
                              Tarik jadi draf
                            </>
                          ) : (
                            <>
                              <ArrowUpFromLine />
                              Terbitkan
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleting(item)}
                        >
                          <Trash2 />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex min-w-0 flex-col gap-1 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">
                      {item.name}
                    </p>
                    <Badge className={TYPE_BADGE[item.type]}>
                      {CONTENT_TYPE_LABELS[item.type]}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {item.category} · {item.updated}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Menampilkan {filtered.length} dari {items.length} konten.
      </p>

      {/* Upload / edit modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <ContentForm
            key={editing?.id ?? "new"}
            initial={editing ?? undefined}
            onSubmit={submitForm}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus konten?</DialogTitle>
            <DialogDescription>
              <span className="text-foreground font-medium">
                {deleting?.name}
              </span>{" "}
              akan dihapus dari pustaka. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete}>
              <Trash2 />
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
