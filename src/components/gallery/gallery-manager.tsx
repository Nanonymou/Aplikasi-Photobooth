"use client";

import { useMemo, useState } from "react";
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
import { MY_DESIGNS, type MyDesign } from "@/lib/gallery/my-designs";
import { createId } from "@/lib/editor/id";

type Sort = "recent" | "name";
type Scope = "all" | "shared";

function thumbStyle(hue: number) {
  return {
    background: `linear-gradient(135deg, hsl(${hue} 70% 55% / 0.35), hsl(${(hue + 50) % 360} 70% 50% / 0.12))`,
  };
}

/**
 * A user's design gallery.
 *
 * The regular user's home for what they have made: find a design, then act on the
 * card — open it, rename, duplicate, or delete. Search and the sort run on the
 * client over the account's designs, and rename/duplicate/delete mutate the list
 * in place so the management is real ahead of the API. Opening a design hands off
 * to the editor.
 */
export function GalleryManager() {
  const [designs, setDesigns] = useState<MyDesign[]>(MY_DESIGNS);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [sort, setSort] = useState<Sort>("recent");

  const [renaming, setRenaming] = useState<MyDesign | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleting, setDeleting] = useState<MyDesign | null>(null);

  const sharedCount = useMemo(
    () => designs.filter((design) => design.shared).length,
    [designs],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = designs.filter(
      (design) =>
        design.title.toLowerCase().includes(q) &&
        (scope === "all" || design.shared),
    );
    if (sort === "name") {
      return [...list].sort((a, b) => a.title.localeCompare(b.title, "id"));
    }
    return list; // Already newest-first.
  }, [designs, query, scope, sort]);

  function duplicate(design: MyDesign) {
    const copy: MyDesign = {
      ...design,
      id: createId("design"),
      title: `${design.title} (salinan)`,
      updated: "baru saja",
      shared: false,
    };
    setDesigns((current) => [copy, ...current]);
  }

  function openRename(design: MyDesign) {
    setRenaming(design);
    setRenameDraft(design.title);
  }

  function commitRename() {
    const next = renameDraft.trim();
    if (renaming && next) {
      setDesigns((current) =>
        current.map((design) =>
          design.id === renaming.id ? { ...design, title: next } : design,
        ),
      );
    }
    setRenaming(null);
  }

  function confirmDelete() {
    if (deleting) {
      setDesigns((current) =>
        current.filter((design) => design.id !== deleting.id),
      );
    }
    setDeleting(null);
  }

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

      {shown.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed px-4 py-16 text-center text-sm">
          {designs.length === 0
            ? "Galerimu masih kosong. Buat desain pertamamu."
            : "Tidak ada desain yang cocok."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((design) => (
            <div
              key={design.id}
              className="bg-card border-border group flex flex-col overflow-hidden rounded-xl border"
            >
              <Link
                href="/editor"
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
                    {design.pages} halaman · {design.updated}
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
                      <Link href="/editor">Buka di editor</Link>
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
        {designs.length} desain · {sharedCount} dibagikan.
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
              akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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
