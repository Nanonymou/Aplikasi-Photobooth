/**
 * A creator's sales history.
 *
 * Stand-in for what a maker earns when somebody buys one of their published
 * templates. The real thing reads the ledger; the shape here is what the screen
 * needs from it, and no more — a dashboard that also happens to be the source of
 * truth for money is how two places start disagreeing about a payout.
 *
 * Amounts are whole rupiah, as integers. Money in floats is a rounding error
 * waiting for somebody to notice it in a payout.
 */

import { PLATFORM_CUT } from "@/lib/marketplace/cut";

export interface SaleRow {
  id: string;
  /** The template that sold. */
  title: string;
  /** Its list price at the time of sale. */
  price: number;
  /** ISO date, so the list can be ordered and grouped without parsing prose. */
  at: string;
  /** What the creator keeps after the platform's cut. */
  net: number;
  buyer: string;
}

export interface TemplateSales {
  id: string;
  title: string;
  price: number;
  sold: number;
  gross: number;
}

export type PayoutStatus = "menunggu" | "diproses" | "dibayar";

export interface Payout {
  id: string;
  period: string;
  amount: number;
  status: PayoutStatus;
  /** ISO date the money moved, or is expected to. */
  at: string;
}

/**
 * The platform's share, re-exported rather than restated.
 *
 * The endpoint that splits a real payment reads the same constant; two copies of
 * a rate is how a dashboard starts quoting a percentage the ledger does not use.
 */
export { PLATFORM_CUT };

export const MONTHLY_REVENUE: { label: string; value: number }[] = [
  { label: "Mar", value: 420_000 },
  { label: "Apr", value: 685_000 },
  { label: "Mei", value: 512_000 },
  { label: "Jun", value: 1_240_000 },
  { label: "Jul", value: 1_875_000 },
  { label: "Agu", value: 2_310_000 },
];

export const TEMPLATE_SALES: TemplateSales[] = [
  { id: "sc_strip_ultah", title: "Strip ulang tahun neon", price: 25_000, sold: 84, gross: 2_100_000 },
  { id: "sc_kartu_lebaran", title: "Kartu Lebaran keluarga", price: 20_000, sold: 76, gross: 1_520_000 },
  { id: "sc_strip_wisuda", title: "Photostrip wisuda klasik", price: 15_000, sold: 61, gross: 915_000 },
  { id: "sc_hati_valentine", title: "Frame hati valentine", price: 18_000, sold: 39, gross: 702_000 },
  { id: "sc_kartu_natal", title: "Kartu Natal hangat", price: 20_000, sold: 22, gross: 440_000 },
];

export const RECENT_SALES: SaleRow[] = [
  { id: "trx_1042", title: "Strip ulang tahun neon", price: 25_000, net: 21_250, at: "2026-08-26", buyer: "Dina R." },
  { id: "trx_1041", title: "Kartu Lebaran keluarga", price: 20_000, net: 17_000, at: "2026-08-25", buyer: "Studio Hana" },
  { id: "trx_1040", title: "Strip ulang tahun neon", price: 25_000, net: 21_250, at: "2026-08-25", buyer: "Yoga P." },
  { id: "trx_1039", title: "Photostrip wisuda klasik", price: 15_000, net: 12_750, at: "2026-08-24", buyer: "Kampus Kreatif" },
  { id: "trx_1038", title: "Frame hati valentine", price: 18_000, net: 15_300, at: "2026-08-23", buyer: "Mira S." },
  { id: "trx_1037", title: "Kartu Natal hangat", price: 20_000, net: 17_000, at: "2026-08-22", buyer: "Bayu A." },
  { id: "trx_1036", title: "Kartu Lebaran keluarga", price: 20_000, net: 17_000, at: "2026-08-22", buyer: "Keluarga Tanu" },
  { id: "trx_1035", title: "Strip ulang tahun neon", price: 25_000, net: 21_250, at: "2026-08-21", buyer: "Nadia A." },
];

export const PAYOUTS: Payout[] = [
  { id: "po_2608", period: "Agustus 2026", amount: 1_963_500, status: "menunggu", at: "2026-09-05" },
  { id: "po_2607", period: "Juli 2026", amount: 1_593_750, status: "dibayar", at: "2026-08-05" },
  { id: "po_2606", period: "Juni 2026", amount: 1_054_000, status: "dibayar", at: "2026-07-05" },
];

/** Rupiah, without the decimals nobody quotes prices in. */
export function rupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** A date as a person writes it, from an ISO string. */
export function tanggal(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface SalesSummary {
  grossAllTime: number;
  netAllTime: number;
  soldAllTime: number;
  thisMonth: number;
  /** Change against the month before, as a share; null when there is no before. */
  monthOverMonth: number | null;
  pendingPayout: number;
}

/**
 * The headline numbers, derived rather than stored.
 *
 * Every one of them is computable from the rows on this page, so storing them
 * separately would only create a second answer to the same question — and the
 * one people quote back at you is always the one that is wrong.
 */
export function summarise(): SalesSummary {
  const grossAllTime = TEMPLATE_SALES.reduce((total, row) => total + row.gross, 0);
  const soldAllTime = TEMPLATE_SALES.reduce((total, row) => total + row.sold, 0);

  const months = MONTHLY_REVENUE;
  const thisMonth = months[months.length - 1]?.value ?? 0;
  const previous = months[months.length - 2]?.value ?? 0;

  return {
    grossAllTime,
    netAllTime: Math.round(grossAllTime * (1 - PLATFORM_CUT)),
    soldAllTime,
    thisMonth,
    monthOverMonth: previous > 0 ? (thisMonth - previous) / previous : null,
    pendingPayout: PAYOUTS.filter((payout) => payout.status !== "dibayar").reduce(
      (total, payout) => total + payout.amount,
      0,
    ),
  };
}

export function percent(share: number): string {
  return `${share > 0 ? "+" : ""}${Math.round(share * 100)}%`;
}
