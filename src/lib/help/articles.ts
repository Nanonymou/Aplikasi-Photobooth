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

export type HelpCategory =
  | "memulai"
  | "editor"
  | "berbagi"
  | "booth"
  | "akun";

export const HELP_CATEGORIES: { id: HelpCategory; label: string }[] = [
  { id: "memulai", label: "Memulai" },
  { id: "editor", label: "Editor" },
  { id: "berbagi", label: "Berbagi & cetak" },
  { id: "booth", label: "Booth & acara" },
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
    slug: "halaman-dan-orientasi",
    title: "Menambah halaman dan memutar orientasinya",
    category: "editor",
    summary:
      "Satu proyek bisa berisi beberapa halaman dengan bentuk berbeda, dan tiap halaman diputar sendiri-sendiri.",
    body: [
      "Baris di bawah kanvas adalah halaman-halaman proyekmu. Tombol di ujung kirinya menambah halaman kosong, menggandakan halaman yang sedang terbuka, atau menghapusnya — semuanya bekerja pada halaman yang sedang kamu lihat, dan Ctrl+Z mengembalikan yang terhapus.",
      "Alt+panah kiri dan kanan berpindah halaman tanpa melepas tangan dari keyboard. Tiap chip menampilkan bentuk dan ukuran halamannya, karena \"Halaman 2\" dan \"Halaman 3\" mustahil dibedakan dari namanya saja.",
      "Orientasi diatur per halaman lewat panel properti di kanan, bukan sekali untuk seluruh proyek: photostrip yang tegak dan kartu ucapan yang menyertainya memang beda bentuk. Memutar halaman menukar ukurannya dan mengecilkan isinya agar tetap muat, tanpa mengubah perbandingan sisi foto mana pun.",
    ],
  },
  {
    slug: "ekspor-vertikal-horizontal",
    title: "Mencetak photostrip memanjang",
    category: "berbagi",
    summary:
      "Pilih orientasi di panel ekspor; hasilnya diputar saat disimpan tanpa mengubah desainmu.",
    body: [
      "Photostrip digambar tegak, tapi banyak pencetak foto memuat kertasnya memanjang. Panel ekspor punya pilihan Vertikal dan Horizontal untuk itu.",
      "Yang diputar hanya berkasnya, seperempat putaran saat disimpan — tata letak halamanmu tidak ikut berubah, dan kamu bisa mengekspor keduanya dari desain yang sama tanpa menyunting apa pun.",
      "Semua angka di panel mengikuti arah yang dipilih: ukuran keluaran, pilihan resolusi, perkiraan ukuran berkas, dan ukuran cetaknya dalam sentimeter. Halaman yang persegi tidak diberi pilihan ini, karena diputar atau tidak berkasnya sama persis.",
    ],
  },
  {
    slug: "mode-kiosk",
    title: "Menjalankan booth dengan mode kiosk",
    category: "booth",
    summary:
      "Satu layar untuk seluruh sesi tamu, terkunci layar penuh, dan hanya bisa ditutup dengan PIN penyelenggara.",
    body: [
      "Mode kiosk membuat perangkat booth bisa ditinggal: tamu melihat layar sambutan bernama acaramu, mengetuknya, berpose mengikuti hitungan mundur, melihat hasilnya, lalu layarnya kembali sendiri untuk tamu berikutnya. Tidak ada tautan ke bagian lain aplikasi yang bisa dijelajahi.",
      "Layar penuh dinyalakan saat sesi dimulai. Tamu yang keluar dari layar penuh — lewat Escape, F11, atau sapuan — akan melihat tirai yang hanya menawarkan satu hal: kembali ke layar penuh. Halaman web tidak bisa menolak tombol-tombol itu, jadi yang bisa dilakukan booth adalah menyadarinya dan memintanya kembali.",
      "Keluar dari mode kiosk butuh PIN penyelenggara, yang diperiksa di server dan tidak pernah dikirim ke peramban. Lima tebakan salah mengunci pad-nya selama lima belas menit. Atur PIN-nya di Branding event sebelum meninggalkan booth — sampai itu dilakukan, siapa pun yang menemukan tombolnya bisa keluar.",
    ],
  },
  {
    slug: "slideshow-acara",
    title: "Menayangkan foto tamu di layar besar",
    category: "booth",
    summary:
      "Live slideshow memutar foto yang dibagikan tamu, dengan kecepatan yang kamu atur sendiri.",
    body: [
      "Slideshow menampilkan foto yang tamu bagikan, satu per satu dengan silang-pudar, di atas latar buram supaya bentuk foto apa pun terlihat disengaja di layar lebar.",
      "Kecepatannya diatur di bilah bawah: 3, 5, 8, atau 15 detik per foto. Panah atas dan bawah melakukan hal yang sama dari jarak jauh, dan garis tipis di atas layar menghabiskan durasi tahannya supaya kecepatannya terlihat, bukan cuma tertulis. Pilihanmu diingat kalau layarnya dimuat ulang tengah acara.",
      "Kendali penyelenggara memudar sendiri saat tidak ada gerakan, jadi dinding tetap bersih. Spasi menjeda, panah kiri dan kanan melangkah satu foto.",
    ],
  },
  {
    slug: "branding-acara",
    title: "Mengganti nama acara di layar booth",
    category: "booth",
    summary:
      "Nama, kalimat sambutan, warna aksen, dan PIN keluar diatur di satu halaman dan langsung dipakai kiosk maupun slideshow.",
    body: [
      "Halaman Branding event di konsol mengatur wajah booth: nama acara, satu kalimat sambutan, warna aksen, dan PIN untuk keluar dari mode kiosk. Pratinjau di sebelahnya menampilkan layar sambutan seperti yang akan dilihat tamu.",
      "Kiosk dan slideshow membaca baris yang sama, jadi tidak ada dua tempat yang perlu disamakan. Halaman ini juga menyebut siapa yang terakhir mengubahnya — booth punya layar setup sendiri, dan dua orang yang menyunting hal yang sama sebaiknya bisa saling melihat.",
      "PIN keluar tidak bisa dibaca kembali, hanya diganti atau dihapus. Membetulkan salah ketik pada nama acara tidak akan menghapus PIN yang sudah diatur.",
    ],
  },
  {
    slug: "remix-karya-komunitas",
    title: "Memakai desain orang lain sebagai titik awal",
    category: "memulai",
    summary:
      "Jelajah karya berisi desain yang dibagikan komunitas; me-remix salah satunya membuka salinannya di editor dengan kredit pembuatnya.",
    body: [
      "Halaman Jelajah karya bisa dibuka tanpa akun. Isinya desain yang dipublikasikan orang lain, dengan bentuk aslinya tetap terjaga — photostrip tegak, kartu persegi, sampul melebar — karena bentuk itulah yang biasanya sedang dicari.",
      "Tombol Remix membuka desain itu sebagai titik awal milikmu. Editornya menyebutkan asalnya di sebuah strip tipis, dan kredit itu ikut tersimpan bersama sesimu. Kamu bisa menghapusnya kalau hasilmu sudah menyimpang jauh dari sumbernya.",
      "Suka dan simpan diingat di peramban ini. Chip Tersimpan menyaring dinding jadi hanya yang kamu tandai, dan itu tetap ada setelah halamannya dimuat ulang.",
    ],
  },
  {
    slug: "foto-profil",
    title: "Mengganti foto profil",
    category: "akun",
    summary:
      "Unggah gambar dari perangkatmu; kalau dihapus, foto dari akun Google atau Apple-mu yang dipakai lagi.",
    body: [
      "Di Pengaturan → Profil, ketuk fotonya untuk memilih berkas dari perangkatmu. Gambarnya dipotong persegi dan dikecilkan di peramban sebelum dikirim, jadi yang naik ke server sudah kecil.",
      "Foto dari penyedia login tetap disimpan terpisah dan tidak tertimpa. Menghapus foto yang kamu unggah mengembalikan foto dari Google atau Apple, bukan lingkaran kosong.",
      "Alamat email tidak bisa diubah dari sini. Alamat itu yang menentukan akunmu, dan menggantinya sama saja dengan pindah akun.",
    ],
  },
  {
    slug: "membayar-paket",
    title: "Bagaimana pembayaran paket bekerja?",
    category: "akun",
    summary:
      "Paketmu baru naik setelah pembayarannya dikonfirmasi, bukan saat kamu memilihnya.",
    body: [
      "Memilih paket berbayar mencatat pilihanmu dan mengarahkanmu ke halaman pembayaran. Sampai gateway memastikan uangnya masuk, akunmu tetap di paket yang sekarang — tidak ada paket yang naik hanya karena tombolnya ditekan.",
      "Harga yang kamu setujui saat berlangganan itulah yang tercatat di akunmu. Kalau daftar harga kami berubah kemudian, tagihanmu tidak ikut berubah dengan sendirinya.",
      "Memperpanjang lebih awal menambah bulan ke periode yang sudah kamu bayar, bukan mengulanginya dari hari ini. Membatalkan pun tidak langsung mematikan fitur: sisa periode yang sudah dibayar tetap berjalan sampai habis.",
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

/** One article by its slug, or undefined — the detail page turns that into a 404. */
export function articleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((article) => article.slug === slug);
}

/** The label a category id reads as. */
export function categoryLabel(id: HelpCategory): string {
  return HELP_CATEGORIES.find((entry) => entry.id === id)?.label ?? id;
}

/** Articles in one category, in catalogue order. */
export function articlesIn(category: HelpCategory): HelpArticle[] {
  return HELP_ARTICLES.filter((article) => article.category === category);
}

/**
 * Everything an article can be found by.
 *
 * The body is included, not just the title and summary. Somebody searching
 * "kode" is looking for the paragraph that explains the six-letter session code,
 * and a search that only reads headings would tell them nothing is here — which
 * is the one answer a help centre must never give wrongly.
 */
function haystack(article: HelpArticle): string {
  return [article.title, article.summary, ...article.body]
    .join(" ")
    .toLowerCase();
}

export interface HelpFilter {
  /** Free text; blank matches everything. */
  query?: string;
  /** A single category, or undefined for all of them. */
  category?: HelpCategory;
}

/**
 * The articles matching a filter, in catalogue order.
 *
 * Every word of the query has to appear somewhere in the article, in any order —
 * "tautan kedaluwarsa" finds the sharing article whose text says "tautan" in one
 * sentence and "kedaluwarsa" in the next. Matching the phrase as typed would
 * find nothing, and people do not type sentences the way documents are written.
 */
export function searchArticles(filter: HelpFilter = {}): HelpArticle[] {
  const words = (filter.query ?? "").toLowerCase().trim().split(/\s+/).filter(Boolean);

  return HELP_ARTICLES.filter((article) => {
    if (filter.category && article.category !== filter.category) return false;
    if (words.length === 0) return true;

    const text = haystack(article);
    return words.every((word) => text.includes(word));
  });
}

/** How many articles each category holds, for the chips. */
export function categoryCounts(): Record<HelpCategory, number> {
  const counts = Object.fromEntries(
    HELP_CATEGORIES.map((category) => [category.id, 0]),
  ) as Record<HelpCategory, number>;

  for (const article of HELP_ARTICLES) counts[article.category] += 1;
  return counts;
}
