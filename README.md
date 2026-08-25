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
npm run db:seed       # isi perpustakaan dekorasi dari katalog di src/lib/editor/
npm run db:seed:roles # buat tiga akun staf: admin, editor, operator
npm run db:purge      # buang render kedaluwarsa, foto terhapus, tautan lama
```

Semua yang mendaftar berperan `tamu`, jadi admin pertama tidak bisa dibuat dari
dalam aplikasi — konsolnya dijaga izin yang hanya dipunyai admin. `db:seed:roles`
adalah pintu masuknya: ia menulis satu profil per peran staf dengan id yang
diturunkan aplikasi dari alamat email, sehingga masuk dengan alamat itu mendarat
di profil yang sama. Tidak ada kata sandi yang dibuat — masuk lewat tautan ajaib
atau penyedia sosial — jadi menyemai alamat yang bukan milikmu tidak memberi
akses apa pun. Alamat default memakai `example.com`; ganti untuk deployment
sungguhan:

```bash
SEED_ADMIN_EMAIL=kamu@studio.id \
SEED_EDITOR_EMAIL=editor@studio.id \
SEED_OPERATOR_EMAIL=operator@studio.id \
npm run db:seed:roles
```

Menjalankannya berkali-kali aman: nama tampilan yang sudah ada dipertahankan, dan
peran seseorang hanya dinaikkan kalau masih `tamu` — perintah ini tidak akan
menurunkan orang yang sengaja dipromosikan. Tambahkan `-- --force` kalau memang
ingin menimpanya.

Berkas disimpan di tiga bucket dengan umur berbeda: `.storage/photos` (foto
tamu), `.storage/renders` (hasil ekspor, beberapa jam), dan `.storage/shares`
(berkas di balik tautan berbagi, seumur tautannya). Yang menegakkan umur itu
adalah barisnya di database, dan `db:purge` yang menyapunya — cocok dijalankan
lewat cron.

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
scripts/seed-library.mjs   # pengisi perpustakaan dekorasi
scripts/purge.mjs          # penyapu berkas kedaluwarsa
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
