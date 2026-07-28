/**
 * The training material, modelled from the JSA & HIRADC source document.
 *
 * The DOCX the QHSE team used to hand around is split here into ordered chapters
 * (`bab`), each a list of sections. This is the shape the Materi screen reads
 * from — a chapter sidebar walks the list, the content area renders whichever one
 * is active. It's mock/seed data for now; the backend phase will serve the same
 * shape from Postgres, so components should depend on these types, not the array.
 */

/** One heading-and-body block inside a chapter. */
export interface MateriSection {
  id: string;
  heading: string;
  /** Lead paragraphs shown above any list. */
  paragraphs?: string[];
  /** Bullet points — steps, examples, or a checklist. */
  bullets?: string[];
}

/** A chapter (bab) of the training material. */
export interface MateriChapter {
  id: string;
  /** 1-based order, used for the sidebar numbering and prev/next navigation. */
  order: number;
  title: string;
  /** One-line gist shown under the title in the sidebar and content header. */
  summary: string;
  /** Rough reading time in minutes, for the progress and pacing cues. */
  minutes: number;
  sections: MateriSection[];
}

export const MATERI_CHAPTERS: MateriChapter[] = [
  {
    id: "pendahuluan",
    order: 1,
    title: "Pendahuluan",
    summary: "Makna, tujuan, dan kompetensi yang dituju dari pelatihan ini.",
    minutes: 6,
    sections: [
      {
        id: "makna-training",
        heading: "Makna Training",
        paragraphs: [
          "Training Penyusunan dan Pengisian JSA (Job Safety Analysis) dan HIRADC (Hazard Identification, Risk Assessment and Determining Control) merupakan pelatihan teknis yang bertujuan meningkatkan kompetensi Tim QHSE dalam mengidentifikasi bahaya, menilai tingkat risiko, serta menentukan tindakan pengendalian yang efektif sebelum suatu pekerjaan dilaksanakan.",
          "Pelatihan ini bertujuan agar setiap personel QHSE mampu menyusun dokumen JSA dan HIRADC secara benar, konsisten, dan sesuai dengan standar perusahaan sehingga dapat digunakan sebagai dasar pengendalian risiko di seluruh aktivitas operasional.",
        ],
      },
      {
        id: "tujuan-training",
        heading: "Tujuan Training",
        paragraphs: ["Setelah mengikuti pelatihan, peserta mampu:"],
        bullets: [
          "Memahami fungsi JSA dan HIRADC.",
          "Menjelaskan perbedaan JSA dan HIRADC.",
          "Mengidentifikasi bahaya berdasarkan aktivitas kerja.",
          "Menentukan konsekuensi dari setiap bahaya.",
          "Menilai tingkat risiko menggunakan matriks risiko perusahaan.",
          "Menentukan pengendalian berdasarkan Hirarki Pengendalian Risiko.",
          "Menyusun dokumen JSA dan HIRADC sesuai format PT Tiga Persada Benua.",
          "Melakukan review terhadap dokumen yang telah dibuat.",
        ],
      },
      {
        id: "kompetensi",
        heading: "Kompetensi yang Harus Dikuasai",
        paragraphs: ["Setelah training peserta mampu membuat sendiri:"],
        bullets: [
          "JSA Menggoreng",
          "JSA Pemotongan Ayam",
          "JSA Housekeeping",
          "JSA Laundry",
          "HIRADC Kitchen",
          "HIRADC Gardener",
          "HIRADC Laundry",
          "HIRADC Housekeeping",
        ],
      },
    ],
  },
  {
    id: "konsep-jsa",
    order: 2,
    title: "Konsep JSA",
    summary: "Apa itu Job Safety Analysis dan untuk apa ia digunakan.",
    minutes: 5,
    sections: [
      {
        id: "apa-itu-jsa",
        heading: "Apa itu JSA?",
        paragraphs: ["Job Safety Analysis adalah metode yang digunakan untuk:"],
        bullets: [
          "Menguraikan suatu pekerjaan menjadi beberapa langkah kerja.",
          "Mengidentifikasi bahaya pada setiap langkah.",
          "Menentukan tindakan pengendalian.",
        ],
      },
      {
        id: "tujuan-jsa",
        heading: "Tujuan JSA",
        paragraphs: ["JSA digunakan sebelum pekerjaan dilakukan, dengan tujuan:"],
        bullets: [
          "Mencegah kecelakaan kerja.",
          "Menentukan SOP yang aman.",
          "Menjadi media briefing sebelum bekerja.",
          "Mengurangi Unsafe Action.",
          "Mengurangi Unsafe Condition.",
        ],
      },
    ],
  },
  {
    id: "konsep-hiradc",
    order: 3,
    title: "Konsep HIRADC",
    summary: "Tiga tahap HIRADC dan hal-hal yang dinilainya.",
    minutes: 5,
    sections: [
      {
        id: "apa-itu-hiradc",
        heading: "Apa itu HIRADC?",
        paragraphs: [
          "HIRADC merupakan singkatan dari Hazard Identification → Risk Assessment → Determining Control.",
        ],
        bullets: [
          "Hazard Identification — mengenali potensi bahaya.",
          "Risk Assessment — menilai besarnya risiko.",
          "Determining Control — menentukan pengendalian.",
        ],
      },
      {
        id: "penilaian-hiradc",
        heading: "Yang Dinilai HIRADC",
        paragraphs: ["HIRADC digunakan untuk menilai:"],
        bullets: [
          "Potensi bahaya.",
          "Besarnya risiko.",
          "Tingkat prioritas pengendalian.",
        ],
      },
    ],
  },
  {
    id: "perbedaan",
    order: 4,
    title: "Perbedaan JSA & HIRADC",
    summary: "Kapan memakai JSA, kapan memakai HIRADC.",
    minutes: 4,
    sections: [
      {
        id: "fokus-jsa",
        heading: "JSA",
        bullets: [
          "Berfokus pada langkah pekerjaan.",
          "Lebih rinci per langkah kerja.",
          "Digunakan saat pekerjaan dilakukan.",
          "Digunakan sebagai panduan kerja.",
          "Cocok untuk pekerjaan non-routine.",
        ],
      },
      {
        id: "fokus-hiradc",
        heading: "HIRADC",
        bullets: [
          "Berfokus pada seluruh aktivitas.",
          "Lebih ringkas per aktivitas.",
          "Digunakan untuk penilaian risiko.",
          "Digunakan sebagai dasar pengendalian.",
          "Cocok untuk pekerjaan routine.",
        ],
      },
    ],
  },
  {
    id: "cara-mengisi-jsa",
    order: 5,
    title: "Cara Mengisi JSA",
    summary: "Bagian 1 — kepala dokumen dan tiga kolom utama JSA.",
    minutes: 8,
    sections: [
      {
        id: "kepala-jsa",
        heading: "Bagian yang Harus Diisi",
        paragraphs: [
          "Mengacu pada template perusahaan, bagian yang harus diisi meliputi:",
        ],
        bullets: [
          "Nama pekerjaan",
          "Nomor JSA",
          "Lokasi pekerjaan",
          "Departemen",
          "Jabatan yang terlibat",
          "APD yang dipersyaratkan",
          "Peralatan yang digunakan",
        ],
      },
      {
        id: "kolom-1",
        heading: "Kolom 1 — Urutan Langkah Pekerjaan",
        paragraphs: ["Satu aktivitas = satu langkah kerja. Contoh:"],
        bullets: [
          "Menyiapkan APD",
          "Menyiapkan alat",
          "Mengisi minyak",
          "Menggoreng",
        ],
      },
      {
        id: "kolom-2",
        heading: "Kolom 2 — Bahaya / Risiko Setiap Langkah",
        paragraphs: [
          "Tuliskan bahaya yang benar-benar mungkin terjadi pada langkah tersebut. Contoh:",
        ],
        bullets: [
          "Terpeleset",
          "Terkena panas",
          "Luka sayat",
          "Terkena cipratan minyak",
          "Kebakaran",
          "Kontak dengan peralatan panas",
        ],
      },
      {
        id: "kolom-3",
        heading: "Kolom 3 — Pengendalian",
        paragraphs: [
          "Gunakan Hirarki Pengendalian Risiko. Jangan langsung menulis \"gunakan APD\" apabila masih ada pengendalian yang lebih efektif. Misalnya:",
        ],
        bullets: [
          "SOP",
          "APD",
          "Housekeeping",
          "Pemeriksaan alat",
          "Safety Sign",
          "Inspeksi",
          "Pelatihan",
        ],
      },
      {
        id: "latihan-jsa",
        heading: "Latihan JSA",
        paragraphs: ["Peserta diminta membuat JSA untuk:"],
        bullets: [
          "Penggantian lampu di area kitchen",
          "Pengangkatan chiller",
          "Fogging area Mess",
          "Penggantian selang gas",
        ],
      },
    ],
  },
  {
    id: "cara-mengisi-hiradc",
    order: 6,
    title: "Cara Mengisi HIRADC",
    summary: "Bagian 2 — enam langkah pengisian HIRADC dan matriks risiko.",
    minutes: 10,
    sections: [
      {
        id: "komponen-hiradc",
        heading: "Komponen HIRADC",
        paragraphs: ["HIRADC terdiri dari:"],
        bullets: [
          "Sub Activity",
          "Condition",
          "Source of Hazard",
          "Consequences",
          "Risk Assessment",
          "Determining Control",
          "Residual Risk Assessment",
        ],
      },
      {
        id: "langkah-1",
        heading: "Langkah 1 — Sub Activity",
        paragraphs: ["Tuliskan aktivitas. Contoh:"],
        bullets: [
          "Penerimaan bahan",
          "Butchering",
          "Cooking",
          "Packing",
          "Laundry",
          "Housekeeping",
        ],
      },
      {
        id: "langkah-2",
        heading: "Langkah 2 — Condition",
        paragraphs: ["Pilih kondisi sesuai ketentuan perusahaan:"],
        bullets: ["Routine", "Non Routine", "Emergency"],
      },
      {
        id: "langkah-3",
        heading: "Langkah 3 — Source of Hazard",
        paragraphs: ["Identifikasi sumber bahaya. Contoh:"],
        bullets: [
          "Bahaya fisik",
          "Bahaya kimia",
          "Bahaya biologis",
          "Bahaya ergonomi",
          "Bahaya listrik",
          "Bahaya panas",
          "Bahaya kebakaran",
        ],
      },
      {
        id: "langkah-4",
        heading: "Langkah 4 — Consequences",
        paragraphs: ["Apa akibatnya? Contoh:"],
        bullets: [
          "Luka sayat",
          "Luka bakar",
          "Patah tulang",
          "Terpeleset",
          "Gangguan pernapasan",
          "Kontaminasi makanan",
        ],
      },
      {
        id: "langkah-5",
        heading: "Langkah 5 — Risk Assessment",
        paragraphs: [
          "Gunakan matriks perusahaan. Risk = Severity × Likelihood.",
          "Severity 1–5: Sangat ringan, Ringan, Sedang, Berat, Fatal.",
          "Likelihood 1–5: Sangat jarang, Jarang, Kadang, Sering, Sangat sering.",
          "Contoh: S = 4, L = 3 → Risk = 12 → Kategori HIGH.",
        ],
      },
      {
        id: "langkah-6",
        heading: "Langkah 6 — Menentukan Pengendalian",
        paragraphs: ["Gunakan urutan Hirarki Pengendalian Risiko:"],
        bullets: [
          "Eliminasi — menghilangkan bahaya.",
          "Substitusi — mengganti alat.",
          "Engineering — guarding, ventilasi, pelindung mesin.",
          "Administrative — SOP, training, inspection, safety sign, permit.",
          "APD — sarung tangan, masker, safety shoes, hairnet.",
        ],
      },
    ],
  },
];

/** Total estimated reading time across all chapters, in minutes. */
export const MATERI_TOTAL_MINUTES = MATERI_CHAPTERS.reduce(
  (sum, chapter) => sum + chapter.minutes,
  0,
);

/**
 * Chapter ids in reading order, as a stable reference.
 *
 * Handed to the scroll-spy and used as scroll-into-view targets. Kept at module
 * scope so the observer isn't rebuilt on every render.
 */
export const MATERI_CHAPTER_IDS = MATERI_CHAPTERS.map((chapter) => chapter.id);
