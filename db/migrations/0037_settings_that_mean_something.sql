-- Setelan yang benar-benar mengendalikan sesuatu.
--
-- `app_settings` menyimpan delapan sakelar; enam di antaranya tidak pernah
-- dibaca oleh apa pun. Migrasi ini menutup dua lubang yang tidak bisa ditutup
-- oleh kode saja.
--
-- `updated_by` menyimpan uuid akun tanpa foreign key, jadi menghapus seorang
-- admin meninggalkan penunjuk menggantung dan layar "terakhir diubah oleh"
-- kosong tanpa penjelasan. `on delete set null` mengatakan hal yang sebenarnya:
-- perubahannya tetap terjadi, orangnya yang sudah tidak ada.
alter table app_settings
  add constraint app_settings_updated_by_fkey
  foreign key (updated_by) references user_profiles (id) on delete set null;

-- Dua kolom dibuang, bukan diberi arti.
--
-- `require_email_verification`: masuk lewat tautan email SUDAH verifikasi email
-- — tidak ada yang bisa masuk tanpa menerima tautannya. Sisi sosial belum
-- menukar token sendiri (Supabase yang melakukannya), jadi tidak ada sinyal
-- "email terverifikasi" untuk digerbangi. Sakelar ini tidak punya arti yang
-- bisa dijalankan hari ini.
--
-- `admin_two_factor`: 2FA butuh pendaftaran TOTP, penyimpanan rahasia, dan kode
-- pemulihan. Tidak ada satu pun yang ada.
--
-- Keduanya dihapus daripada dibiarkan. Sakelar keamanan yang tidak melakukan
-- apa-apa lebih berbahaya daripada tidak ada sakelarnya: admin yang menyalakan
-- "2FA untuk admin" lalu melihatnya tersimpan percaya akunnya terlindungi.
alter table app_settings
  drop column require_email_verification,
  drop column admin_two_factor;
