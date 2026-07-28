/**
 * The training material, modelled from the JSA & HIRADC source document.
 *
 * The DOCX the QHSE team used to hand around is split here into ordered chapters
 * (`bab`), each a list of sections. Every section carries a `variant` that says
 * how it should be presented — as a callout, a card grid, an accordion, a
 * timeline, or plain prose — so the same content reads as an interactive lesson
 * rather than a flat document. This is mock/seed data for now; the backend phase
 * will serve the same shape from Postgres, so components should depend on these
 * types, not the array.
 */

/** How a section renders. Drives which block component the reader picks. */
export type MateriVariant =
  | "prose"
  | "callout"
  | "cards"
  | "accordion"
  | "timeline";

/** Tint of a callout ("ilustrasi") box. */
export type CalloutTone = "info" | "tip" | "warning";

/** A structured entry inside a cards / accordion / timeline section. */
export interface MateriItem {
  id: string;
  /** Card title, accordion trigger, or timeline step title. */
  label: string;
  /** Supporting sentence shown under the label. */
  detail?: string;
  /** Bullet examples inside the item. */
  points?: string[];
}

/** One heading-and-body block inside a chapter. */
export interface MateriSection {
  id: string;
  heading: string;
  variant: MateriVariant;
  /** Lead line shown under the heading, before the body. */
  intro?: string;
  /** Prose / callout paragraphs. */
  paragraphs?: string[];
  /** Simple bullets — used by `prose`, or as plain cards by `cards`. */
  bullets?: string[];
  /** Structured items — used by `cards`, `accordion`, and `timeline`. */
  items?: MateriItem[];
  /** Callout tint; only read by the `callout` variant. */
  tone?: CalloutTone;
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
        variant: "callout",
        tone: "info",
        paragraphs: [
          "Training Penyusunan dan Pengisian JSA (Job Safety Analysis) dan HIRADC (Hazard Identification, Risk Assessment and Determining Control) merupakan pelatihan teknis yang bertujuan meningkatkan kompetensi Tim QHSE dalam mengidentifikasi bahaya, menilai tingkat risiko, serta menentukan tindakan pengendalian yang efektif sebelum suatu pekerjaan dilaksanakan.",
          "Setiap personel QHSE diharapkan mampu menyusun dokumen JSA dan HIRADC secara benar, konsisten, dan sesuai standar perusahaan sebagai dasar pengendalian risiko di seluruh aktivitas operasional.",
        ],
      },
      {
        id: "tujuan-training",
        heading: "Tujuan Training",
        variant: "cards",
        intro: "Setelah mengikuti pelatihan, peserta mampu:",
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
        variant: "cards",
        intro: "Setelah training peserta mampu membuat sendiri:",
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
        variant: "prose",
        intro: "Job Safety Analysis adalah metode yang digunakan untuk:",
        bullets: [
          "Menguraikan suatu pekerjaan menjadi beberapa langkah kerja.",
          "Mengidentifikasi bahaya pada setiap langkah.",
          "Menentukan tindakan pengendalian.",
        ],
        paragraphs: ["JSA digunakan sebelum pekerjaan dilakukan."],
      },
      {
        id: "tujuan-jsa",
        heading: "Tujuan JSA",
        variant: "cards",
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
        id: "tahap-hiradc",
        heading: "Apa itu HIRADC?",
        variant: "timeline",
        intro: "HIRADC berjalan dalam tiga tahap berurutan:",
        items: [
          {
            id: "hazard-identification",
            label: "Hazard Identification",
            detail: "Mengenali potensi bahaya pada setiap aktivitas.",
          },
          {
            id: "risk-assessment",
            label: "Risk Assessment",
            detail: "Menilai besarnya risiko dari bahaya yang teridentifikasi.",
          },
          {
            id: "determining-control",
            label: "Determining Control",
            detail: "Menentukan pengendalian yang tepat untuk menekan risiko.",
          },
        ],
      },
      {
        id: "penilaian-hiradc",
        heading: "Yang Dinilai HIRADC",
        variant: "cards",
        intro: "HIRADC digunakan untuk menilai:",
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
        id: "perbandingan",
        heading: "JSA vs HIRADC",
        variant: "cards",
        intro: "Keduanya saling melengkapi, tetapi berbeda fokus dan pemakaian:",
        items: [
          {
            id: "jsa",
            label: "JSA",
            detail: "Panduan kerja yang rinci per langkah pekerjaan.",
            points: [
              "Berfokus pada langkah pekerjaan.",
              "Lebih rinci per langkah kerja.",
              "Digunakan saat pekerjaan dilakukan.",
              "Cocok untuk pekerjaan non-routine.",
            ],
          },
          {
            id: "hiradc",
            label: "HIRADC",
            detail: "Dasar penilaian risiko untuk seluruh aktivitas.",
            points: [
              "Berfokus pada seluruh aktivitas.",
              "Lebih ringkas per aktivitas.",
              "Digunakan untuk penilaian risiko.",
              "Cocok untuk pekerjaan routine.",
            ],
          },
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
        variant: "prose",
        intro:
          "Mengacu pada template perusahaan, bagian yang harus diisi meliputi:",
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
        id: "kolom-utama",
        heading: "Tiga Kolom Utama",
        variant: "accordion",
        intro: "Kemudian isi tiga kolom utama berikut:",
        items: [
          {
            id: "kolom-1",
            label: "Kolom 1 — Urutan Langkah Pekerjaan",
            detail: "Satu aktivitas = satu langkah kerja. Contoh:",
            points: [
              "Menyiapkan APD",
              "Menyiapkan alat",
              "Mengisi minyak",
              "Menggoreng",
            ],
          },
          {
            id: "kolom-2",
            label: "Kolom 2 — Bahaya / Risiko Setiap Langkah",
            detail:
              "Tuliskan bahaya yang benar-benar mungkin terjadi pada langkah tersebut. Contoh:",
            points: [
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
            label: "Kolom 3 — Pengendalian",
            detail: "Gunakan Hirarki Pengendalian Risiko. Misalnya:",
            points: [
              "SOP",
              "APD",
              "Housekeeping",
              "Pemeriksaan alat",
              "Safety Sign",
              "Inspeksi",
              "Pelatihan",
            ],
          },
        ],
      },
      {
        id: "catatan-pengendalian",
        heading: "Catatan Penting",
        variant: "callout",
        tone: "warning",
        paragraphs: [
          "Jangan langsung menulis \"gunakan APD\" apabila masih ada pengendalian yang lebih efektif. APD adalah pengendalian terakhir dalam hirarki.",
        ],
      },
      {
        id: "latihan-jsa",
        heading: "Latihan JSA",
        variant: "cards",
        intro: "Peserta diminta membuat JSA untuk:",
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
        variant: "cards",
        intro: "HIRADC terdiri dari komponen berikut:",
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
        id: "langkah-hiradc",
        heading: "Enam Langkah Pengisian",
        variant: "timeline",
        intro: "Isi HIRADC mengikuti urutan langkah berikut:",
        items: [
          {
            id: "langkah-1",
            label: "Sub Activity",
            detail: "Tuliskan aktivitasnya. Contoh:",
            points: [
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
            label: "Condition",
            detail: "Pilih kondisi sesuai ketentuan perusahaan:",
            points: ["Routine", "Non Routine", "Emergency"],
          },
          {
            id: "langkah-3",
            label: "Source of Hazard",
            detail: "Identifikasi sumber bahaya. Contoh:",
            points: [
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
            label: "Consequences",
            detail: "Apa akibatnya? Contoh:",
            points: [
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
            label: "Risk Assessment",
            detail:
              "Gunakan matriks perusahaan: Risk = Severity × Likelihood. Contoh: S = 4, L = 3 → Risk = 12 → kategori HIGH.",
            points: [
              "Severity 1–5: Sangat ringan, Ringan, Sedang, Berat, Fatal.",
              "Likelihood 1–5: Sangat jarang, Jarang, Kadang, Sering, Sangat sering.",
            ],
          },
          {
            id: "langkah-6",
            label: "Determining Control",
            detail: "Gunakan urutan Hirarki Pengendalian Risiko:",
            points: [
              "Eliminasi — menghilangkan bahaya.",
              "Substitusi — mengganti alat.",
              "Engineering — guarding, ventilasi, pelindung mesin.",
              "Administrative — SOP, training, inspection, safety sign, permit.",
              "APD — sarung tangan, masker, safety shoes, hairnet.",
            ],
          },
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
