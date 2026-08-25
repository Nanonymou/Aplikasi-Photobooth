import type { LucideIcon } from "lucide-react";
import { Camera, Palette, Share2, Sparkles } from "lucide-react";

/**
 * The quick guides.
 *
 * Four things somebody does in their first ten minutes, in the order they do
 * them: take a photo, arrange it, dress it up, get it out. Not a manual —
 * a manual is what the article list is for — but the shape of the app, said
 * once, so a first-timer knows what the four screens are before they start
 * opening them.
 *
 * Every step names the screen it happens on, and links to it where the link
 * would work from here. A tutorial you have to translate into clicks yourself is
 * a tutorial that gets read once.
 */

export interface GuideStep {
  title: string;
  detail: string;
}

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  /** Where this guide starts, when it starts somewhere the reader can go now. */
  href?: string;
  hrefLabel?: string;
  steps: GuideStep[];
}

export const QUICK_GUIDES: Guide[] = [
  {
    slug: "foto-pertama",
    title: "Ambil foto pertamamu",
    summary: "Dari membuka kamera sampai punya jepretan yang kamu suka.",
    icon: Camera,
    href: "/kamera",
    hrefLabel: "Buka kamera",
    steps: [
      {
        title: "Izinkan kamera",
        detail:
          "Peramban akan bertanya sekali. Kalau kamu menolaknya dan berubah pikiran, izinnya diatur ulang lewat ikon gembok di bilah alamat.",
      },
      {
        title: "Atur hitung mundur",
        detail:
          "Tiga detik cukup untuk satu orang; naikkan kalau kamu perlu waktu berlari masuk ke bingkai.",
      },
      {
        title: "Jepret, lihat, ulangi",
        detail:
          "Setiap jepretan langsung tampil. Yang tidak kamu suka bisa diambil ulang di tempat — tidak ada yang tersimpan sampai kamu memasukkannya ke sebuah slot.",
      },
      {
        title: "Tidak punya kamera?",
        detail:
          "Unggah gambar dari perangkatmu. Semua yang berikutnya berlaku sama.",
      },
    ],
  },
  {
    slug: "susun-photostrip",
    title: "Susun photostripmu",
    summary: "Pilih bentuknya, isi slotnya, atur ukurannya.",
    icon: Palette,
    href: "/editor",
    hrefLabel: "Buka editor",
    steps: [
      {
        title: "Mulai dari template",
        detail:
          "Template menentukan ukuran halaman sekaligus tata letak slotnya — memilih photostrip memberimu halaman berbentuk photostrip, bukan photostrip yang dipaksa masuk ke halaman yang sedang terbuka.",
      },
      {
        title: "Isi slotnya",
        detail:
          "Ketuk sebuah slot lalu pilih foto. Slot menyimpan potongannya sendiri, jadi mengganti fotonya tidak mengacaukan tata letak.",
      },
      {
        title: "Geser dan ubah ukuran",
        detail:
          "Seret untuk memindahkan, tarik sudutnya untuk mengubah ukuran. Undo mengembalikan satu gerakan penuh, bukan setengah jalan di tengah seretan.",
      },
    ],
  },
  {
    slug: "percantik",
    title: "Percantik hasilnya",
    summary: "Filter, efek, teks, dan stiker — secukupnya.",
    icon: Sparkles,
    steps: [
      {
        title: "Pilih satu filter",
        detail:
          "Filter adalah perlakuan warna dan hanya satu yang aktif; memilih yang lain menggantikannya.",
      },
      {
        title: "Tumpuk efeknya",
        detail:
          "Efek dilukis di atas foto — grain, kebocoran cahaya, hujan, salju — dan boleh dinyalakan beberapa sekaligus.",
      },
      {
        title: "Tambahkan teks yang perlu saja",
        detail:
          "Nama acara dan tanggalnya biasanya sudah cukup. Photostrip dibaca dari jarak setengah meter, bukan dibaca seperti poster.",
      },
    ],
  },
  {
    slug: "bagikan",
    title: "Bagikan atau cetak",
    summary: "Tautan yang bisa dicabut, atau berkas siap cetak.",
    icon: Share2,
    href: "/galeri",
    hrefLabel: "Buka galeri",
    steps: [
      {
        title: "Ekspor untuk disimpan",
        detail:
          "PNG paling tajam, JPEG paling kecil, PDF untuk percetakan yang memintanya. Untuk dicetak, pakai ekspor resolusi tinggi supaya hasilnya digambar ulang, bukan diperbesar.",
      },
      {
        title: "Bagikan lewat tautan",
        detail:
          "Setiap tautan punya kode acak dan tanggal kedaluwarsa — bawaannya tujuh hari — dan bisa kamu nonaktifkan kapan saja.",
      },
      {
        title: "Tempel QR-nya di booth",
        detail:
          "Tautan bagikan datang dengan QR beresolusi cukup untuk dicetak di kartu, supaya tamu memindainya sendiri.",
      },
    ],
  },
];
