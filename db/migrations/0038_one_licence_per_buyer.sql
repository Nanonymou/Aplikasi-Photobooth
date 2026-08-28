-- Satu lisensi per pembeli per template, dan satu checkout pada satu waktu.
--
-- Sebelum ini, `startTemplatePurchase` memeriksa "sudah dibeli?" lalu menulis
-- barisnya — baca-lalu-tulis tanpa kunci dan tanpa constraint di belakangnya.
-- Klik ganda pada tombol Beli menghasilkan dua baris `pending`; kalau dua-duanya
-- lunas, pembeli membayar dua kali untuk satu template dan dasbor penjual
-- menghitung dua penjualan. Diukur langsung: tiga klik serentak → tiga baris,
-- dua diselesaikan → Rp40.000 untuk template Rp20.000.
--
-- Dua indeks parsial, karena ada dua momen yang harus dijaga dan keduanya
-- berbeda. Yang pertama mencegah biayanya terjadi; yang kedua memastikan lisensi
-- tidak pernah terbit dua kali walau uangnya entah bagaimana masuk dua kali.

-- Satu checkout berjalan per pembeli per template. Klik kedua menemukan baris
-- yang sama, bukan membuat tagihan kedua.
create unique index template_purchases_one_pending
  on template_purchases (published_id, buyer_owner_id)
  where status = 'pending';

-- Dan satu lisensi, selamanya. Ini garis terakhir: kalaupun dua pembayaran
-- lolos, hanya satu yang boleh menjadi lisensi, dan yang kedua akan menabrak
-- constraint ini alih-alih diam-diam menjadi penjualan kedua.
create unique index template_purchases_one_licence
  on template_purchases (published_id, buyer_owner_id)
  where status = 'paid';
