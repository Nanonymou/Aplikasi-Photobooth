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
| Database | PostgreSQL (kompatibel Supabase) via `pg` |

## Menjalankan secara lokal

```bash
npm install
npm run dev     # http://localhost:3000
```

Perintah lain: `npm run build`, `npm run start`, `npm run lint`.

### Database

Desain kanvas disimpan di PostgreSQL. Salin `.env.example` menjadi `.env.local`,
arahkan `DATABASE_URL` ke server PostgreSQL mana pun (cluster lokal, instance
terkelola, atau Supabase — string koneksinya ada di Project Settings → Database),
lalu jalankan migrasinya:

```bash
npm run db:migrate    # terapkan migrasi yang belum jalan
npm run db:status     # lihat mana yang sudah/belum
```

Migrasi berupa berkas SQL biasa di `db/migrations/`, dijalankan berurutan sesuai
nama berkas, masing-masing dalam satu transaksi, dan dicatat di tabel
`schema_migrations`.

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
  lib/db/                  # pool koneksi, tipe baris, pemetaan baris ↔ model
db/migrations/             # migrasi SQL
scripts/migrate.mjs        # penjalan migrasi
  store/editor-store.ts    # state editor (Zustand)
  types/editor.ts          # model domain kanvas
```

### Model domain

Sebuah `EditorProject` berisi beberapa `CanvasPage` (multi-halaman /
photostrip), dan tiap halaman berisi daftar `CanvasObject` yang **terurut** —
urutan array adalah urutan lapisan: indeks 0 di paling belakang, elemen terakhir
di paling depan.

### Catatan pengembangan

- Editor dibangun **frontend-first**: data awal masih berasal dari
  `src/lib/editor/mock-project.ts`, dan skema database sengaja mengikuti bentuk
  model itu, bukan sebaliknya.
- Halaman disimpan sebagai baris, objek di dalamnya sebagai JSONB: urutan array
  objek *adalah* urutan lapisan dan hampir tiap suntingan menulis ulang seluruh
  array, jadi halaman adalah unit terkecil yang pernah disimpan editor.
- Komponen `src/components/ui/` mengikuti konvensi shadcn/ui (`components.json`,
  `cn`, CSS variables) tetapi ditulis manual karena registry `ui.shadcn.com`
  tidak dapat diakses dari lingkungan build ini.
- Konva memerlukan `<canvas>` sungguhan, jadi stage dimuat khusus di klien
  (`ssr: false`) lewat `canvas-viewport.tsx`.
