"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Images,
  MoreHorizontal,
  Pencil,
  Search,
  Share2,
  Trash2,
} from "lucide-react";

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
  deleteDesign,
  duplicateDesign,
  listMyDesigns,
  relativeTime,
  renameDesign,
  type MyDesign,
  type Scope,
  type Sort,
} from "@/lib/gallery/my-designs";
import { toast } from "@/store/toast-store";

function thumbStyle(hue: number) {
  return {
    background: `linear-gradient(135deg, hsl(${hue} 70% 55% / 0.35), hsl(${(hue + 50) % 360} 70% 50% / 0.12))`,
  };
}

/** How long to sit on a keystroke before asking the server again. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * A user's design gallery.
 *
 * The regular user's home for what they have made: find a design, then act on
 * the card — open it, rename, duplicate, or delete.
 *
 * Search, scope and sort are the server's, because `GET /api/gallery` already
 * answers all three and only it can see past the page it returned. Filtering the
 * arrived page here instead is how a search box starts missing results that sit
 * one page further down.
 *
 * Every action writes first and then refetches. An optimistic list that renamed
 * a card locally would show a title that exists nowhere else the moment a write
 * fails, and the failure a person needs to see is exactly the one they would
 * then not see.
 */
export function GalleryManager() {
  const [page, setPage] = useState<{
    designs: MyDesign[];
    total: number;
    sharedCount: number;
  }>({ designs: [], total: 0, sharedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const [renaming, setRenaming] = useState<MyDesign | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleting, setDeleting] = useState<MyDesign | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Fetches the current filter's page.
   *
   * Called from the effect below and again after every write. `alive` drops a
   * response whose request has been superseded, which is the difference between
   * a search box that settles on what you typed and one that settles on
   * whatever answered last.
   */
  const load = useCallback(
    async (alive: () => boolean = () => true) => {
      try {
        const next = await listMyDesigns({ search, scope, sort });
        if (!alive()) return;
        setPage(next);
        setFailed(null);
      } catch (cause) {
        if (!alive()) return;
        setFailed(
          cause instanceof Error ? cause.message : "Galeri gagal dimuat.",
        );
      } finally {
        if (alive()) setLoading(false);
      }
    },
    [search, scope, sort],
  );

  // The await is inside the effect so the state updates are visibly after it:
  // nothing here runs synchronously during the render that scheduled it.
  useEffect(() => {
    let current = true;
    void (async () => {
      await load(() => current);
    })();
    return () => {
      current = false;
    };
  }, [load]);

  // A round trip per keystroke would be one per keystroke. setState in the
  // timeout callback is the allowed pattern, not a synchronous one in the body.
  useEffect(() => {
    const id = setTimeout(() => setSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  /** Runs a write, reports what went wrong, and refetches either way. */
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

  function duplicate(design: MyDesign) {
    void run(() => duplicateDesign(design.id), "Salinan gagal dibuat");
  }

  function openRename(design: MyDesign) {
    setRenaming(design);
    setRenameDraft(design.title);
  }

  function commitRename() {
    const next = renameDraft.trim();
    const target = renaming;
    setRenaming(null);
    if (!target || !next || next === target.title) return;
    void run(() => renameDesign(target.id, next), "Nama gagal diganti");
  }

  function confirmDelete() {
    const target = deleting;
    setDeleting(null);
    if (!target) return;
    void run(() => deleteDesign(target.id), "Desain gagal dihapus");
  }

  const designs = page.designs;
  const shown = designs;
  const sharedCount = page.sharedCount;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari desain…"
            aria-label="Cari desain"
            className="pl-8"
          />
        </div>

        <div className="flex min-w-0 gap-2 overflow-x-auto">
          <ToggleGroup
            type="single"
            variant="outline"
            value={scope}
            onValueChange={(value) => value && setScope(value as Scope)}
            aria-label="Saring desain"
          >
            <ToggleGroupItem value="all" className="whitespace-nowrap">
              Semua
            </ToggleGroupItem>
            <ToggleGroupItem value="shared" className="whitespace-nowrap">
              Dibagikan
            </ToggleGroupItem>
          </ToggleGroup>

          <ToggleGroup
            type="single"
            variant="outline"
            value={sort}
            onValueChange={(value) => value && setSort(value as Sort)}
            aria-label="Urutkan desain"
          >
            <ToggleGroupItem value="recent" className="whitespace-nowrap">
              Terbaru
            </ToggleGroupItem>
            <ToggleGroupItem value="name" className="whitespace-nowrap">
              Nama
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {failed ? (
        <div className="border-destructive/40 text-destructive rounded-xl border border-dashed px-4 py-16 text-center text-sm">
          {failed}
        </div>
      ) : loading ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-16 text-center text-sm">
          Memuat galeri…
        </div>
      ) : shown.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-16 text-center text-sm">
          {search || scope === "shared"
            ? "Tidak ada desain yang cocok."
            : "Galerimu masih kosong. Buat desain pertamamu."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((design) => (
            <div
              key={design.id}
              className="bg-card border-border group flex flex-col overflow-hidden rounded-xl border"
            >
              <Link
                href={`/editor?desain=${design.id}`}
                aria-label={`Buka ${design.title}`}
                className="relative flex aspect-[4/3] items-center justify-center"
                style={thumbStyle(design.hue)}
              >
                <Images className="text-foreground/30 size-8" />
                {design.shared && (
                  <span className="bg-background/80 text-foreground absolute top-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                    <Share2 className="size-3" />
                    Dibagikan
                  </span>
                )}
              </Link>

              <div className="flex items-start justify-between gap-1 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{design.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {design.pageCount} halaman · {relativeTime(design.updatedAt)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Tindakan untuk ${design.title}`}
                      className="-mr-1 shrink-0"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem asChild>
                      <Link href={`/editor?desain=${design.id}`}>
                        Buka di editor
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openRename(design)}>
                      <Pencil />
                      Ganti nama
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => duplicate(design)}>
                      <Copy />
                      Duplikat
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setDeleting(design)}
                    >
                      <Trash2 />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        {page.total} desain · {sharedCount} dibagikan.
      </p>

      {/* Rename */}
      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => !open && setRenaming(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ganti nama desain</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            aria-label="Nama desain"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRenaming(null)}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={commitRename}
              disabled={renameDraft.trim().length === 0}
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus desain?</DialogTitle>
            <DialogDescription>
              <span className="text-foreground font-medium">
                {deleting?.title}
              </span>{" "}
              akan dihapus dari galerimu.
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
