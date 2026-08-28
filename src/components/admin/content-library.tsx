"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sticker,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";

import {
  ContentForm,
  type EditDraft,
  type UploadDraft,
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
  deleteContent,
  editContent,
  listContent,
  relativeTime,
  setContentStatus,
  uploadContent,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  type ContentItem,
  type ContentStatus,
  type ContentType,
} from "@/lib/admin/content";
import { toast } from "@/store/toast-store";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<ContentType, LucideIcon> = {
  template: LayoutTemplate,
  sticker: Sticker,
  background: ImageIcon,
  textstyle: Type,
  filter: SlidersHorizontal,
  effect: Sparkles,
  texture: Layers,
};

/** Preview gradient per type, so the grid reads by kind at a glance. */
const TYPE_GRADIENT: Record<ContentType, string> = {
  template: "from-primary/25 to-primary/5",
  sticker: "from-pink-500/25 to-amber-500/10",
  background: "from-sky-500/25 to-emerald-500/10",
  textstyle: "from-violet-500/25 to-fuchsia-500/10",
  filter: "from-orange-500/25 to-rose-500/10",
  effect: "from-teal-500/25 to-cyan-500/10",
  texture: "from-stone-500/25 to-amber-500/10",
};

const TYPE_BADGE: Record<ContentType, string> = {
  template: "bg-primary/10 text-primary",
  sticker: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  background: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  textstyle: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  filter: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  effect: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  texture: "bg-stone-500/10 text-stone-600 dark:text-stone-400",
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
  "filter",
  "effect",
  "texture",
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
/** How long to sit on a keystroke before asking the server again. */
const SEARCH_DEBOUNCE_MS = 250;

export function ContentLibrary() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [counts, setCounts] = useState<
    Record<ContentType, { total: number; published: number; draft: number }>
  >(() =>
    Object.fromEntries(
      (Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((kind) => [
        kind,
        { total: 0, published: 0, draft: 0 },
      ]),
    ) as Record<ContentType, { total: number; published: number; draft: number }>,
  );
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ContentType | "all">("all");
  const [deleting, setDeleting] = useState<ContentItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContentItem | null>(null);

  const load = useCallback(
    async (alive: () => boolean = () => true) => {
      try {
        const page = await listContent({ search, type });
        if (!alive()) return;
        setItems(page.items);
        setCounts(page.counts);
        setFailed(null);
      } catch (cause) {
        if (!alive()) return;
        setFailed(cause instanceof Error ? cause.message : "Pustaka gagal dimuat.");
      } finally {
        if (alive()) setLoading(false);
      }
    },
    [search, type],
  );

  useEffect(() => {
    let current = true;
    void (async () => {
      await load(() => current);
    })();
    return () => {
      current = false;
    };
  }, [load]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  /** Runs a write, says what went wrong, and refetches either way. */
  async function run(action: () => Promise<void>, failure: string) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await load();
    } catch (cause) {
      toast({
        variant: "error",
        title: failure,
        description: cause instanceof Error ? cause.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  /**
   * The categories each kind actually has, taken from the library already on
   * screen rather than from a second endpoint — the console has just listed
   * every asset, and every asset names its category.
   */
  const categories = useMemo(() => {
    const byType: Record<string, Map<string, string>> = {};
    for (const item of items) {
      (byType[item.type] ??= new Map()).set(item.categorySlug, item.category);
    }
    return Object.fromEntries(
      Object.entries(byType).map(([kind, map]) => [
        kind,
        [...map].map(([slug, label]) => ({ slug, label })).sort((a, b) =>
          a.label.localeCompare(b.label, "id"),
        ),
      ]),
    );
  }, [items]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditing(item);
    setFormOpen(true);
  }

  function togglePublish(target: ContentItem) {
    void run(
      () =>
        setContentStatus(
          target,
          target.status === "published" ? "draft" : "published",
        ),
      "Status gagal diubah",
    );
  }

  function confirmDelete() {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    void run(() => deleteContent(target), "Aset gagal dihapus");
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
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
                <p className="text-sm font-semibold tabular-nums">{counts[t].total}</p>
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

      {failed ? (
        <div className="border-destructive/40 text-destructive rounded-xl border border-dashed px-4 py-16 text-center text-sm">
          {failed}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border-border text-muted-foreground rounded-xl border px-4 py-16 text-center text-sm">
          {loading ? "Memuat pustaka…" : "Tidak ada konten yang cocok."}
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
                  {false ? null : (
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
                    {item.category} · {relativeTime(item.updatedAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Menampilkan {filtered.length} konten.
      </p>

      {/* Upload / edit modal */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <ContentForm
            key={editing?.id ?? "new"}
            initial={editing}
            categories={categories}
            busy={busy}
            onUpload={(draft: UploadDraft) => {
              setFormOpen(false);
              void run(() => uploadContent(draft), "Aset gagal diunggah");
            }}
            onEdit={(draft: EditDraft) => {
              const target = editing;
              setFormOpen(false);
              if (!target) return;
              void run(async () => {
                await editContent(target, {
                  label: draft.label,
                  categorySlug: draft.categorySlug,
                });
                if (draft.status !== target.status) {
                  await setContentStatus(target, draft.status);
                }
              }, "Perubahan gagal disimpan");
            }}
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
