"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  CONTENT_TYPE_LABELS,
  type ContentItem,
  type ContentStatus,
} from "@/lib/admin/content";

/** A category as the picker offers it: a slug to send, a label to read. */
export interface CategoryOption {
  slug: string;
  label: string;
}

/** What a new asset is made of. Only the two kinds that are actually files. */
export interface UploadDraft {
  type: "sticker" | "background";
  label: string;
  categorySlug: string;
  file: File;
  publish: boolean;
}

/** What an edit changes about an existing one. */
export interface EditDraft {
  label: string;
  categorySlug: string;
  status: ContentStatus;
}

const UPLOADABLE = ["sticker", "background"] as const;

/**
 * Create or edit a library asset.
 *
 * Two jobs and, unlike before, two shapes — because the endpoints have two.
 *
 * Editing changes a name, a category and whether it is live, for any of the four
 * kinds. Creating uploads a file, and only a sticker or a background can be one:
 * a template is a composition and a text style is a set of font fields, neither
 * of which anybody uploads. Offering all four on the create form was offering
 * two that could not work.
 *
 * The file is the real file, not an object URL. The preview is drawn from it, so
 * what is on screen is what gets sent — the previous version previewed the
 * picture and saved nothing.
 */
export function ContentForm({
  initial,
  categories,
  busy,
  onUpload,
  onEdit,
  onCancel,
}: {
  initial: ContentItem | null;
  /** Categories per kind, taken from the library that is already loaded. */
  categories: Record<string, CategoryOption[]>;
  busy: boolean;
  onUpload: (draft: UploadDraft) => void;
  onEdit: (draft: EditDraft) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<(typeof UPLOADABLE)[number]>("sticker");
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? "");
  const [status, setStatus] = useState<ContentStatus>(
    initial?.status ?? "draft",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editing = initial !== null;
  const options = categories[editing ? initial.type : type] ?? [];

  const valid = editing
    ? name.trim().length > 0 && categorySlug.length > 0
    : name.trim().length > 0 && categorySlug.length > 0 && file !== null;

  function pickFile(picked: File | undefined) {
    if (!picked || !picked.type.startsWith("image/")) return;
    setFile(picked);
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(picked);
    });
  }

  function submit() {
    if (!valid || busy) return;

    if (editing) {
      onEdit({ label: name.trim(), categorySlug, status });
      return;
    }

    onUpload({
      type,
      label: name.trim(),
      categorySlug,
      file: file!,
      publish: status === "published",
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? "Sunting konten" : "Unggah konten"}</DialogTitle>
        <DialogDescription>
          {editing
            ? "Perbarui detail konten ini."
            : "Tambahkan stiker atau latar baru ke pustaka."}
        </DialogDescription>
      </DialogHeader>

      {/* No upload when editing: the artwork of an existing asset is not
          something this form replaces, and a picker that looked like it could
          would be a promise the endpoint does not keep. */}
      {!editing && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              pickFile(event.dataTransfer.files[0]);
            }}
            className="border-editor-border hover:border-primary/50 relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors"
          >
            {preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Hapus gambar"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFile(null);
                    setPreview(null);
                  }}
                  className="bg-background/80 hover:bg-background absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full backdrop-blur"
                >
                  <X className="size-3.5" />
                </span>
              </>
            ) : (
              <span className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
                <ImagePlus className="size-5" />
                Seret berkas atau klik untuk pilih
              </span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            hidden
            onChange={(event) => {
              pickFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="content-name">
          Nama
        </label>
        <Input
          id="content-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="mis. Bingkai Lebaran"
        />
      </div>

      {editing ? (
        <p className="text-muted-foreground text-xs">
          Jenis: {CONTENT_TYPE_LABELS[initial.type]}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium">Jenis</span>
          <ToggleGroup
            type="single"
            variant="outline"
            value={type}
            onValueChange={(value) => {
              if (!value) return;
              setType(value as (typeof UPLOADABLE)[number]);
              // The categories differ per kind, so a slug chosen for the other
              // one would be sent and refused.
              setCategorySlug("");
            }}
          >
            {UPLOADABLE.map((id) => (
              <ToggleGroupItem key={id} value={id} className="whitespace-nowrap">
                {CONTENT_TYPE_LABELS[id]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="content-category">
          Kategori
        </label>
        {/* A picker, not a free-text field: the endpoint takes a slug that has
            to exist, and a typed label would be refused every time. */}
        <select
          id="content-category"
          value={categorySlug}
          onChange={(event) => setCategorySlug(event.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="">Pilih kategori…</option>
          {options.map((option) => (
            <option key={option.slug} value={option.slug}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium">Status</span>
        <ToggleGroup
          type="single"
          variant="outline"
          value={status}
          onValueChange={(value) => value && setStatus(value as ContentStatus)}
        >
          <ToggleGroupItem value="draft">Draf</ToggleGroupItem>
          <ToggleGroupItem value="published">Terbit</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <DialogFooter>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
        <Button size="sm" onClick={submit} disabled={!valid || busy}>
          {busy && <Loader2 className="animate-spin" />}
          Simpan
        </Button>
      </DialogFooter>
    </>
  );
}
