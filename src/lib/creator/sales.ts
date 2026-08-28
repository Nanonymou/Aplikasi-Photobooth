"use client";

import { PLATFORM_CUT } from "@/lib/marketplace/cut";

/**
 * A creator's sales history, as the dashboard reads it.
 *
 * One call to `GET /api/creator/sales` for the whole screen, which is how the
 * endpoint was built: the page shows totals directly above the rows they are
 * totals of, and five separate fetches would give it five chances to render a
 * summary that disagrees with the table underneath it.
 *
 * Amounts are whole rupiah, as integers. Money in floats is a rounding error
 * waiting for somebody to notice it in a payout.
 */

export { PLATFORM_CUT };

export interface SaleRow {
  id: string;
  /** The template that sold. */
  title: string;
  /** What the buyer paid for it. */
  price: number;
  /** ISO, so the list can be ordered and grouped without parsing prose. */
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

export type PayoutStatus = "menunggu" | "diproses" | "dibayar" | "gagal";

export interface Payout {
  id: string;
  /** The month it covers, as its first day (ISO date). */
  period: string;
  amount: number;
  status: PayoutStatus;
  /** ISO date the money moved, or is expected to. */
  at: string;
  failureReason: string | null;
}

export interface MonthlyRevenue {
  /** `YYYY-MM`. The label is this module's to render, not the API's. */
  month: string;
  value: number;
}

export interface SalesSummary {
  grossAllTime: number;
  netAllTime: number;
  soldAllTime: number;
  thisMonth: number;
  /** Change against the month before, as a share; null when there is no before. */
  monthOverMonth: number | null;
  pendingPayout: number;
  /** Earned in months no payout covers yet. */
  unscheduled: number;
}

export interface CreatorSales {
  summary: SalesSummary;
  monthly: MonthlyRevenue[];
  templates: TemplateSales[];
  recent: SaleRow[];
  payouts: Payout[];
  platformCut: number;
}

interface ApiResponse {
  summary: {
    grossIdr: number;
    netIdr: number;
    sold: number;
    thisMonthIdr: number;
    lastMonthIdr: number;
    pendingPayoutIdr: number;
    unscheduledIdr: number;
  };
  monthly: { month: string; grossIdr: number }[];
  templates: {
    id: string;
    title: string;
    priceIdr: number;
    sold: number;
    grossIdr: number;
  }[];
  recent: {
    id: string;
    title: string;
    amountIdr: number;
    netIdr: number;
    buyer: string;
    paidAt: string;
  }[];
  payouts: {
    id: string;
    period: string;
    amountIdr: number;
    status: PayoutStatus;
    scheduledFor: string;
    paidAt: string | null;
    failureReason: string | null;
  }[];
  platformCut: number;
}

export async function fetchSales(): Promise<CreatorSales> {
  const response = await fetch("/api/creator/sales", { cache: "no-store" });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const data =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "Riwayat penjualan gagal dimuat.",
    );
  }

  const api = (await response.json()) as ApiResponse;
  const previous = api.summary.lastMonthIdr;

  return {
    summary: {
      grossAllTime: api.summary.grossIdr,
      netAllTime: api.summary.netIdr,
      soldAllTime: api.summary.sold,
      thisMonth: api.summary.thisMonthIdr,
      // Nothing to compare against is not the same as no growth, so it stays
      // null and the card shows no arrow rather than a confident 0%.
      monthOverMonth:
        previous > 0 ? (api.summary.thisMonthIdr - previous) / previous : null,
      pendingPayout: api.summary.pendingPayoutIdr,
      unscheduled: api.summary.unscheduledIdr,
    },
    monthly: api.monthly.map((month) => ({
      month: month.month,
      value: month.grossIdr,
    })),
    templates: api.templates.map((template) => ({
      id: template.id,
      title: template.title,
      price: template.priceIdr,
      sold: template.sold,
      gross: template.grossIdr,
    })),
    recent: api.recent.map((sale) => ({
      id: sale.id,
      title: sale.title,
      price: sale.amountIdr,
      net: sale.netIdr,
      buyer: sale.buyer,
      at: sale.paidAt,
    })),
    payouts: api.payouts.map((payout) => ({
      id: payout.id,
      period: payout.period,
      amount: payout.amountIdr,
      status: payout.status,
      at: payout.paidAt ?? payout.scheduledFor,
      failureReason: payout.failureReason,
    })),
    platformCut: api.platformCut,
  };
}

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

/**
 * "Agu" from "2026-08".
 *
 * The API deliberately sends `YYYY-MM` and no month names — naming a month is a
 * rendering decision, and an endpoint that made it would have picked a language
 * for every screen that reads it. This is that decision, made once, here.
 */
export function bulanPendek(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(year, index - 1, 1).toLocaleDateString("id-ID", {
    month: "short",
  });
}

/** The month a payout covers, spelled out: "Agustus 2026". */
export function periodeLabel(period: string): string {
  return new Date(period).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export function percent(share: number): string {
  return `${share > 0 ? "+" : ""}${Math.round(share * 100)}%`;
}
