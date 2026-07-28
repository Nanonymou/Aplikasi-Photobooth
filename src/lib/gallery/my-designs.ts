/**
 * A user's own designs.
 *
 * Stand-in for `GET /api/designs` scoped to the signed-in account — the frames a
 * regular user has made and saved, newest first. The fields the gallery renders:
 * a title, when it last changed, how many pages, whether it has been shared, and
 * a hue for its thumbnail so the wall reads at a glance. The real endpoint drops
 * in without moving the grid.
 */

export interface MyDesign {
  id: string;
  title: string;
  /** Pre-formatted relative time, so there is no clock to hydrate. */
  updated: string;
  pages: number;
  shared: boolean;
  /** Thumbnail hue (0–360), for a per-design gradient. */
  hue: number;
}

export const MY_DESIGNS: MyDesign[] = [
  { id: "d1", title: "Frame Ulang Tahun Sinta", updated: "2 jam lalu", pages: 1, shared: true, hue: 275 },
  { id: "d2", title: "Undangan Digital Reuni", updated: "kemarin", pages: 2, shared: false, hue: 210 },
  { id: "d3", title: "Photobooth Kantor", updated: "3 hari lalu", pages: 4, shared: true, hue: 160 },
  { id: "d4", title: "Kartu Lebaran Keluarga", updated: "1 minggu lalu", pages: 1, shared: false, hue: 130 },
  { id: "d5", title: "Wisuda 2026", updated: "2 minggu lalu", pages: 3, shared: false, hue: 35 },
  { id: "d6", title: "Frame Prewedding", updated: "3 minggu lalu", pages: 2, shared: true, hue: 340 },
  { id: "d7", title: "Album Mini Bali", updated: "1 bulan lalu", pages: 6, shared: false, hue: 190 },
  { id: "d8", title: "Frame Natal", updated: "2 bulan lalu", pages: 1, shared: true, hue: 5 },
];
