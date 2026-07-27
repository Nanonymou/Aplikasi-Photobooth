# FrameStudio AI

Aplikasi web photobooth: potret lewat webcam, susun frame dengan slot foto
sebebas mungkin, percantik dengan stiker dan AI, lalu ekspor siap cetak — semua
dalam satu layar.

## Tech stack

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives) |
| Mesin kanvas | Konva.js via react-konva |
| State editor | Zustand |
| Ikon | lucide-react |

## Menjalankan secara lokal

```bash
npm install
npm run dev     # http://localhost:3000
```

Perintah lain: `npm run build`, `npm run start`, `npm run lint`.

## Struktur

```
src/
  app/
    editor/page.tsx        # halaman editor
    page.tsx               # landing
  components/
    editor/                # chrome editor (topbar, toolbar, rail, panel, inspector)
      canvas/              # stage Konva + renderer objek
    ui/                    # primitif shadcn/ui
  hooks/                   # use-image, use-selected-objects, use-editor-shortcuts
  lib/editor/              # data tiruan, bentuk slot, registry panel
  store/editor-store.ts    # state editor (Zustand)
  types/editor.ts          # model domain kanvas
```

### Model domain

Sebuah `EditorProject` berisi beberapa `CanvasPage` (multi-halaman /
photostrip), dan tiap halaman berisi daftar `CanvasObject` yang **terurut** —
urutan array adalah urutan lapisan: indeks 0 di paling belakang, elemen terakhir
di paling depan.

### Catatan pengembangan

- Editor dibangun **frontend-first**: data masih berasal dari
  `src/lib/editor/mock-project.ts`. Backend (Supabase) menyusul dan menggantikan
  sumber data itu tanpa mengubah bentuk modelnya.
- Komponen `src/components/ui/` mengikuti konvensi shadcn/ui (`components.json`,
  `cn`, CSS variables) tetapi ditulis manual karena registry `ui.shadcn.com`
  tidak dapat diakses dari lingkungan build ini.
- Konva memerlukan `<canvas>` sungguhan, jadi stage dimuat khusus di klien
  (`ssr: false`) lewat `canvas-viewport.tsx`.
