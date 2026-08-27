# Skema: pengguna, sesi, dan desain

Tiga hal yang saling menopang di FrameStudio: **siapa** yang memakai booth,
**sesi** apa yang sedang berjalan, dan **desain** yang dihasilkannya. Dokumen ini
menjelaskan bentuk akhirnya beserta alasannya — bukan daftar kolom (itu ada di
`db/migrations/`, masing-masing dengan komentarnya sendiri), melainkan model yang
membuat kolom-kolom itu masuk akal.

## Satu hal yang harus dipahami lebih dulu: kepemilikan bukan akun

Photobooth dipakai orang yang tidak punya akun dan tidak akan membuatnya. Maka
kepemilikan di sini **tidak** berawal dari akun:

- Tulisan pertama dari sebuah peramban mencetak **owner id** dan menaruhnya di
  cookie `framestudio_owner`. Itu identitas penuh seorang tamu.
- Kalau tamu itu kemudian **masuk**, sesi tamunya **diklaim**: semua barisnya
  (desain, foto, sesi foto, berkas render, tautan bagikan) dicap ulang ke id
  akun, dan `guest_sessions.claimed_by` mencatat siapa yang mengklaim.
- Karya yang dibuat **setelah** masuk tetap memakai cookie yang sama, karena
  cookie itu juga identitas untuk apa pun yang disimpan setelah keluar.

Akibatnya, satu orang bisa memiliki beberapa owner id sekaligus, dan pertanyaan
"apakah ini milik saya" tidak pernah punya satu jawaban. Itulah yang diselesaikan
`ownerScope()` (`src/lib/db/owners.ts`): akun + semua sesi tamu yang pernah
diklaimnya + cookie peramban saat ini. Endpoint galeri, editor, dan langganan
semuanya bertanya lewat sana.

## Pengguna

| Tabel | Isi |
| --- | --- |
| `user_profiles` (0012, 0027) | Satu baris per akun: email, nama tampilan, avatar, `role`, penyedia login. |
| `role_permissions` (0014) | Kebijakan akses: peran mana boleh melakukan apa. |
| `role_changes` (0023) | Riwayat: siapa mengubah peran siapa, dan kapan. |
| `subscriptions` (0020) | Paket akun, siklus tagihan, status, dan periode berjalan. |

Beberapa keputusan yang disengaja:

- **`role` adalah enum, `permission` adalah tabel.** Peran jarang bertambah dan
  dirujuk kolom lain; izin sering bergeser dan harus bisa diubah tanpa migrasi
  pada tipe. Tidak ada tabel `roles` terpisah — enum `user_role` sudah jadi satu
  sumber kebenaran, dan daftar nama peran kedua adalah bug keamanan menunggu
  waktu.
- **Id akun diturunkan dari email**, bukan acak (`accountIdForEmail`). Baris yang
  disemai `db:seed:roles` dan baris yang dicari saat masuk harus baris yang sama,
  dan satu-satunya hal yang dimiliki kedua sisi adalah alamatnya.
- **`role_changes` hanya bisa ditambah.** Sebuah kolom yang ditimpa cuma ingat
  nilai terakhirnya, padahal pertanyaan yang menyusul setiap kejutan adalah
  "sejak kapan akun ini admin, dan atas tangan siapa". Tidak ada jalur update,
  dan tidak ada foreign key — catatan promosi harus hidup lebih lama daripada
  akun penerimanya maupun admin yang memberikannya.
- **Semua pendaftar berperan `tamu`.** Admin pertama datang dari
  `npm run db:seed:roles`, karena konsolnya dijaga izin yang hanya dipunyai
  admin.
- **Avatar punya dua kolom, dan itu disengaja.** `avatar_url` berarti satu hal
  saja: gambar yang diberikan penyedia login. `avatar_key` (0027) adalah kunci
  di blob store untuk gambar yang diunggah sendiri oleh pemiliknya, dan ia
  menang atas yang pertama. Satu kolom untuk keduanya akan menghapus gambar dari
  penyedia begitu seseorang mengunggah miliknya — tanpa apa pun untuk dijadikan
  cadangan kalau ia menghapusnya lagi. Byte-nya tidak masuk ke baris ini:
  `describeMe()` membaca baris ini di tiap permintaan, dan data URL base64 30 KB
  akan ikut terseret hanya untuk menggambar lingkaran 28 piksel.
- **`subscriptions.plan` tidak pernah dinaikkan oleh permintaan.** Pilihan
  berbayar mendarat di `pending_plan`; hanya pembayaran terkonfirmasi yang boleh
  memindahkannya. Harga dan daftar fiturnya sendiri hidup di aplikasi, bukan di
  sini — itu copy yang berubah karena keputusan pemasaran.

## Sesi

Tiga hal berbeda memakai kata yang sama, jadi ketiganya tabel terpisah:

| Tabel | Sesi apa | Umur |
| --- | --- | --- |
| `auth_sessions` (0013) | Sesi login sebuah perangkat. | Geser 30 hari, plafon mutlak 180 hari. |
| `magic_links` (0022) | Bukti kepemilikan kotak surat: tautan masuk sekali pakai. | 15 menit, sekali pakai. |
| `guest_sessions` (0011) | Identitas tamu di booth, punya kode pendek. | 30 hari sejak dibuat, disegarkan tiap autosave. |
| `photo_sessions` (0002) | Satu sesi pemotretan: sederet jepretan. | Selamanya; fotonya yang kedaluwarsa. |

Yang penting soal `auth_sessions`: **cookie berisi token acak, database hanya
menyimpan sha256-nya**. Tabel yang bocor tidak memberi siapa pun sesi yang bisa
dipakai. Kedaluwarsanya geser — dipakai berarti diperpanjang — tapi dibatasi
`absolute_expires_at`, supaya sesi yang aktif selamanya tetap punya akhir.

`magic_links` menyimpan pola yang sama seperti `auth_sessions`: tokennya ada di
email, yang tersimpan hanya sha256-nya, dan penukarannya satu pernyataan UPDATE
yang sekaligus memutuskan dan menandai — supaya klien email yang memuat URL-nya
lebih dulu tidak bisa menghabiskan tautan itu dari bawah pemiliknya.

`guest_sessions.code` adalah alfabet tanpa huruf yang mirip angka
(`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`): kode itu dibacakan keras-keras di booth
yang berisik.

## Desain

| Tabel | Isi |
| --- | --- |
| `designs` (0001) | Judul, pemilik, `version`, `deleted_at`. |
| `design_pages` (0001) | Halaman: ukuran, latar, dan `objects` sebagai JSONB. |
| `photos` (0002) | Foto tamu: kunci storage, sumber (kamera/unggahan/contoh), kedaluwarsa. |
| `shares` (0008, 0019) | Tautan bagikan: kode, berkas, kedaluwarsa, dan desain asalnya. |
| `render_files` (0009) | Hasil ekspor yang dititipkan sebentar. |
| `photo_filters`, `visual_effects` (0024) | Katalog tampilan: perlakuan warna, dan lapisan di atas foto. |
| `frame_textures` (0026) | Tekstur bingkai: rutinitas penggambar plus dua warnanya. |
| `export_events` (0015) | Catatan bahwa sebuah ekspor terjadi — untuk laporan, bukan untuk berkasnya. |

Keputusan yang membentuknya:

- **`objects` adalah JSONB, bukan tabel objek.** Sebuah halaman selalu dibaca dan
  ditulis utuh, isinya pohon heterogen, dan CHECK-nya (`canvas_objects_are_valid`)
  menjaga bentuknya di pintu. Tabel per objek akan membuat setiap pembukaan
  editor jadi puluhan join untuk data yang tidak pernah ditanya sepotong-sepotong.
- **`version` adalah kunci optimistik.** Dua tab yang menyunting desain sama akan
  saling menimpa diam-diam tanpa itu; ketidakcocokan dilaporkan sebagai 409,
  bukan diselesaikan di server — hanya penggunanya yang tahu versi mana yang
  dimaksud.
- **Menghapus desain bersifat lunak** (`deleted_at`). Isinya foto orang yang
  sudah tidak ada di booth, dan "saya hapus yang salah" adalah kalimat yang
  diucapkan di setiap galeri yang pernah dibuat.
- **`shares.design_id` boleh null dan `on delete set null`.** Foto yang diunggah
  langsung memang bukan share sebuah proyek, dan menghapus desain tidak boleh
  mematikan tautan yang sudah dibagikan ke orang lain.
- **Filter dan efek dua tabel, bukan satu.** Sebuah filter seluruhnya adalah
  string CSS `filter`, sehingga pratinjau dan render akhir sepakat karena
  konstruksinya. Sebuah efek adalah lapisan di atas foto — butuh background,
  blend, opacity, dan untuk cuaca, deskripsi partikel yang dianimasikan kanvas.
  Menyatukannya berarti baris yang separuh kolomnya selalu null plus CHECK yang
  menjelaskan separuh mana.
- **Tekstur menyimpan semuanya kecuali gambarnya.** Kode menyediakan
  rutinitasnya — bagaimana serat kertas, urat kayu, atau kilau logam ditaruh —
  dan barisnya menyediakan rutinitas mana serta dua warnanya. Itu sebabnya
  menambah tekstur baru tidak perlu deploy: "Tembaga" adalah rutinitas kilau
  dengan sepasang warna lain.
- **Kategori filter dan efek berupa enum, bukan baris `library_categories`.**
  Pustaka lain punya daftar kategori yang memang tumbuh; lima keluarga filter dan
  tiga kelompok efek adalah keputusan desain tentang cara panelnya disusun, dan
  keluarga yang muncul karena seseorang menyisipkan baris akan meninggalkan panel
  dengan tab yang tidak tahu harus diberi nama apa.
- **`export_events` tidak punya foreign key ke apa pun.** Justru itu gunanya:
  berkasnya kedaluwarsa dalam jam, desainnya bisa dihapus pemiliknya, dan tidak
  satu pun boleh membuat total bulan lalu berubah.

## Umur data

Dua jam berjalan bersamaan, dan barisnya yang memutuskan — bukan filesystem:

- `render_files` kedaluwarsa dalam hitungan jam, `photos` dalam 30 hari,
  `shares` mengikuti umur tautannya.
- `scripts/purge.mjs` menyapunya. Storage beralamat-konten, jadi sebuah berkas
  baru boleh dihapus ketika tidak ada baris hidup yang menyebut kuncinya.

## Indeks

Setiap indeks dinamai menurut pertanyaan yang dijawabnya, dan ada karena ada
kueri yang sudah ditulis (0021 menambahkan yang tersisa). Dua pola yang berulang:

- **Indeks parsial** untuk baris yang hidup (`where deleted_at is null`,
  `where revoked_at is null`) — yang mati tidak pernah dicari dan tidak perlu
  ikut ditimbang.
- **Awalan `owner_id`** untuk hampir semua bacaan, karena hampir semua pertanyaan
  dimulai dari "punya siapa" — kecuali laporan analitik, yang bertanya per hari
  tanpa peduli pemiliknya dan karena itu punya indeks `created_at` sendiri.
