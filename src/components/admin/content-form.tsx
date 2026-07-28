"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

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
  type ContentType,
} from "@/lib/admin/content";

const TYPE_IDS = Object.keys(CONTENT_TYPE_LABELS) as ContentType[];

/** The editable fields the form hands back; the parent stamps id and time. */
export type ContentDraft = Pick<
  ContentItem,
  "name" | "type" | "category" | "status" | "src"
>;

/**
 * Create/edit content, in a modal.
 *
 * One form for both jobs — a new asset or an existing one, told apart by whether
 * it starts with values. The upload is mocked with an object URL so a picked
 * image previews here and rides along as the card's thumbnail, no storage
 * involved. Nothing is saved until "Simpan"; name and category are required
 * because a card with neither is not worth keeping.
 */
export function ContentForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ContentItem;
  onSubmit: (draft: ContentDraft) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ContentType>(initial?.type ?? "template");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [status, setStatus] = useState<ContentStatus>(
    initial?.status ?? "draft",
  );
  const [src, setSrc] = useState<string | undefined>(initial?.src);
  const fileRef = useRef<HTMLInputElement>(null);

  const valid = name.trim().length > 0 && category.trim().length > 0;

  function pickFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setSrc(URL.createObjectURL(file));
  }

  function submit() {
    if (!valid) return;
    onSubmit({
      name: name.trim(),
      type,
      category: category.trim(),
      status,
      src,
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? "Sunting konten" : "Unggah konten"}</DialogTitle>
        <DialogDescription>
          {initial
            ? "Perbarui detail konten ini."
            : "Tambahkan aset baru ke pustaka."}
        </DialogDescription>
      </DialogHeader>

      {/* Upload / preview */}
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
        {src ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            <span
              role="button"
              tabIndex={0}
              aria-label="Hapus gambar"
              onClick={(event) => {
                event.stopPropagation();
                setSrc(undefined);
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
        accept="image/*"
        hidden
        onChange={(event) => {
          pickFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

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

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium">Jenis</span>
        <div className="overflow-x-auto">
          <ToggleGroup
            type="single"
            variant="outline"
            value={type}
            onValueChange={(value) => value && setType(value as ContentType)}
          >
            {TYPE_IDS.map((id) => (
              <ToggleGroupItem key={id} value={id} className="whitespace-nowrap">
                {CONTENT_TYPE_LABELS[id]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" htmlFor="content-category">
          Kategori
        </label>
        <Input
          id="content-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="mis. Hari raya"
        />
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
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Batal
        </Button>
        <Button size="sm" onClick={submit} disabled={!valid}>
          {initial ? "Simpan" : "Unggah"}
        </Button>
      </DialogFooter>
    </>
  );
}
