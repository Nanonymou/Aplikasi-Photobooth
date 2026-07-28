/**
 * Subscription plans.
 *
 * Stand-in for `GET /api/billing/plans` plus the account's current plan — the
 * tiers a regular user chooses between and where they sit today. Prices are in
 * rupiah per month; the yearly figure is the effective monthly price when billed
 * for a year. `startCheckout` imitates the upgrade call so the flow is real
 * before payments exist.
 */

export type PlanId = "gratis" | "pro" | "studio";

export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  /** Rupiah per month, billed monthly. 0 for the free tier. */
  priceMonthly: number;
  /** Rupiah per month, billed yearly (the discounted rate). */
  priceYearly: number;
  features: string[];
  /** The tier to nudge people toward. */
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "gratis",
    name: "Gratis",
    tagline: "Untuk mulai berkarya.",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "5 desain tersimpan",
      "Ekspor resolusi standar",
      "Watermark FrameStudio",
      "Template dasar",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Untuk yang sering berkreasi.",
    priceMonthly: 49000,
    priceYearly: 39000,
    features: [
      "Desain tak terbatas",
      "Ekspor HD tanpa watermark",
      "Semua template & stiker",
      "Alat AI (enhance, hapus latar)",
      "Penyimpanan 10 GB",
    ],
    highlighted: true,
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Untuk penyelenggara acara.",
    priceMonthly: 149000,
    priceYearly: 119000,
    features: [
      "Semua fitur Pro",
      "Mode kiosk & live slideshow",
      "Branding event",
      "5 anggota tim",
      "Penyimpanan 100 GB",
      "Dukungan prioritas",
    ],
  },
];

/** The account's current plan; a free user with room to upgrade. */
export const CURRENT_PLAN: PlanId = "gratis";

/** Usage against the current plan's limits, for the status card. */
export const CURRENT_USAGE = {
  designsUsed: 3,
  designsLimit: 5,
};

export function planRank(id: PlanId): number {
  return PLANS.findIndex((plan) => plan.id === id);
}

export function priceFor(plan: Plan, cycle: BillingCycle): number {
  return cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
}

const rupiah = new Intl.NumberFormat("id-ID");

/** "Rp0" / "Rp49.000" — whole rupiah, no decimals. */
export function formatRupiah(amount: number): string {
  return `Rp${rupiah.format(amount)}`;
}

const CHECKOUT_LATENCY_MS = 700;

export async function startCheckout(
  plan: PlanId,
  cycle: BillingCycle,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, CHECKOUT_LATENCY_MS));
  void plan;
  void cycle;
}
