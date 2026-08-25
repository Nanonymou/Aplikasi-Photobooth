/**
 * The help centre's articles.
 *
 * Written about what this app actually does — guest sessions, the editor's
 * autosave, share links that expire, what a plan limits — rather than the
 * generic set every help centre ships with. An article that answers a question
 * nobody has is worse than no article: it makes the list longer and the real
 * answer harder to find.
 *
 * Plain data, so the list, the search that follows it, and the article pages
 * after that all read one catalogue instead of three.
 */

export type HelpCategory = "memulai" | "editor" | "berbagi" | "akun";

export const HELP_CATEGORIES: { id: HelpCategory; label: string }[] = [
  { id: "memulai", label: "Memulai" },
  { id: "editor", label: "Editor" },
  { id: "berbagi", label: "Berbagi & cetak" },
  { id: "akun", label: "Akun & paket" },
];

export interface HelpArticle {
  slug: string;
  title: string;
  category: HelpCategory;
  /** One sentence, shown in the list — the answer in miniature, not a teaser. */
  summary: string;
  /** The answer itself, as paragraphs. */
  body: string[];
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "mulai-tanpa-akun",
    title: "Memakai booth tanpa membuat akun",
    category: "memulai",
    summary:
      "Bisa. Peramban ini diberi identitas sendiri, dan karyamu tersimpan di situ sampai kamu memutuskan mau menyimpannya ke akun.",
    body: [
      "Ketuk mulai, berpose, dan hasilnya langsung tersimpan — tanpa formulir pendaftaran. Di balik layar, peramban yang kamu pakai diberi identitas tamu berikut kode pendek enam huruf, dan semua yang kamu buat menempel pada identitas itu.",
      "Kode itu ada di halaman tamu. Catat kalau kamu ingin mengambil karyamu dari perangkat lain nanti — begitu kamu masuk dengan email, kode itu yang dipakai untuk memindahkan semuanya ke akunmu.",
      "Sesi tamu bertahan 30 hari sejak terakhir dipakai. Menyunting desain memperpanjangnya, jadi selama kamu masih berkarya, tidak ada yang hilang di tengah jalan.",
    ],
  },
  {
    slug: "kode-sesi-tamu",
    title: "Memindahkan karya tamu ke akun",
    category: "memulai",
    summary:
      "Masuk dari peramban yang sama dan karyamu ikut sendiri; dari perangkat lain, masukkan kode sesi enam huruf itu.",
    body: [
      "Kalau kamu masuk dari peramban yang dipakai berkarya, tidak ada yang perlu dilakukan: desain, foto, dan tautan bagikan langsung berpindah ke akunmu saat itu juga.",
      "Dari perangkat lain, buka halaman tamu di perangkat lama untuk melihat kodenya, lalu masukkan kode itu setelah masuk. Satu sesi hanya bisa diklaim sekali — kalau kodenya sudah dipakai, berarti karyanya sudah ada di sebuah akun.",
      "Booth yang dipakai bergantian sebaiknya diserahkan lewat tombol selesai, supaya tamu berikutnya mulai sebagai dirinya sendiri dan tidak mewarisi galeri orang sebelumnya.",
    ],
  },
  {
    slug: "autosave-editor",
    title: "Apakah desain saya tersimpan otomatis?",
    category: "editor",
    summary:
      "Ya. Editor menyimpan sendiri beberapa saat setelah kamu berhenti mengubah sesuatu, dan menyimpan lagi sebelum halamannya ditutup.",
    body: [
      "Tidak ada tombol simpan di editor karena tidak seharusnya ada: setiap perubahan ditulis otomatis setelah jeda singkat, dan sekali lagi saat kamu meninggalkan halaman.",
      "Kalau dua tab terbuka pada desain yang sama, yang terbaru menang dan tab satunya mengikuti — tab yang punya suntingan belum tersimpan tidak akan ditimpa begitu saja.",
      "Menyimpan ke akun memakai nomor versi. Kalau desain yang sama berubah di tempat lain sejak tab ini membukanya, penyimpanannya ditolak dan kamu diberi tahu — bukan diam-diam menimpa pekerjaan yang lebih baru.",
    ],
  },
  {
    slug: "filter-dan-efek",
    title: "Beda filter dan efek visual",
    category: "editor",
    summary:
      "Filter mengubah warna fotonya; efek menambahkan lapisan di atasnya. Satu filter aktif sekaligus, efek boleh ditumpuk.",
    body: [
      "Filter adalah perlakuan warna — hangat, sinematik, monokrom — dan menggantinya mengganti yang sebelumnya. Efek adalah sesuatu yang dilukis di atas foto: butiran film, kebocoran cahaya, hujan, salju. Efek boleh dinyalakan beberapa sekaligus.",
      "Kalau ada slot foto yang dipilih, keduanya berlaku untuk slot itu saja. Kalau tidak ada yang dipilih, berlaku untuk seluruh foto di halaman — photostrip biasanya memang dimaksudkan seragam.",
      "Efek cuaca bergerak di kanvas. Kalau perangkatmu diatur mengurangi animasi, gerakannya dihormati dan bidangnya tetap diam.",
    ],
  },
  {
    slug: "ekspor-resolusi",
    title: "Mengekspor untuk dicetak",
    category: "berbagi",
    summary:
      "Ekspor dari server digambar ulang dari modelnya, bukan diperbesar dari layar, jadi 300 DPI benar-benar 300 DPI.",
    body: [
      "Ekspor cepat memotong kanvas yang sedang terbuka — pas untuk dibagikan ke chat. Untuk dicetak, pakai ekspor resolusi tinggi: halamannya dibangun ulang dari modelnya lalu dirender pada skala penuh, sehingga hasilnya tajam, bukan hasil pembesaran gambar seukuran layar.",
      "PNG paling tajam dan mendukung latar transparan; JPEG jauh lebih kecil; PDF untuk percetakan yang memintanya. Format yang tersedia sama di semua paket — yang berbeda adalah watermark dan resolusi maksimumnya.",
    ],
  },
  {
    slug: "tautan-bagikan",
    title: "Berapa lama tautan bagikan berlaku?",
    category: "berbagi",
    summary:
      "Tujuh hari secara bawaan, dan bisa kamu nonaktifkan kapan saja sebelum itu.",
    body: [
      "Setiap tautan bagikan punya kode acak yang tidak bisa ditebak dan tanggal kedaluwarsa — bawaannya tujuh hari, bisa diatur 1 sampai 30 hari saat dibuat.",
      "Tautan yang kedaluwarsa atau kamu nonaktifkan akan menjawab bahwa tautannya sudah berakhir, bukan bahwa tautannya tidak pernah ada. Bedanya penting buat orang yang memegang kodenya: satu itu penjelasan, satunya lagi cuma angkat bahu.",
      "Kalau acaramu memakai live slideshow, foto yang kamu bagikan itulah yang tampil di layar besar. Menonaktifkan tautannya juga menurunkannya dari sana.",
    ],
  },
  {
    slug: "masuk-tanpa-sandi",
    title: "Masuk tanpa kata sandi",
    category: "akun",
    summary:
      "Kami mengirim tautan sekali pakai ke emailmu; membukanya sudah cukup jadi bukti.",
    body: [
      "Tidak ada kata sandi untuk dilupakan. Masukkan alamat email, lalu buka tautan yang kami kirim — tautan itu berlaku 15 menit dan hanya bisa dipakai sekali.",
      "Kalau tautannya sudah dipakai atau kedaluwarsa, minta yang baru; permintaan berikutnya bisa dilakukan setelah satu menit, supaya kotak surat tidak dibanjiri.",
      "Masuk dengan Google atau Apple juga tersedia, dan mendarat di akun yang sama selama alamat emailnya sama.",
    ],
  },
  {
    slug: "batas-paket-gratis",
    title: "Apa saja batas paket gratis?",
    category: "akun",
    summary:
      "Lima desain tersimpan, ekspor resolusi standar dengan watermark, dan template dasar.",
    body: [
      "Paket gratis membatasi jumlah desain yang tersimpan, bukan berapa kali kamu memakai booth. Sudah penuh? Hapus salah satu desain lama, atau naikkan paket.",
      "Ekspor tetap bisa dilakukan di paket gratis, dengan watermark FrameStudio dan resolusi standar. Paket berbayar menghilangkan watermark, membuka seluruh template dan stiker, serta alat AI.",
      "Mode kiosk, live slideshow, dan branding acara ada di paket Studio — ketiganya untuk penyelenggara acara, bukan untuk satu orang yang sedang berkarya sendiri.",
    ],
  },
];

/** Articles in one category, in catalogue order. */
export function articlesIn(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.category === category);
}
