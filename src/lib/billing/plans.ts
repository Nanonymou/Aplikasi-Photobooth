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
  /**
   * Rupiah per month, billed monthly. 0 for the free tier.
   *
   * @deprecated Prices live in `plan_prices` (migration 0028) and arrive with
   * `GET /api/billing/subscription` as `prices`. These two fields remain only
   * until the screens that read them are moved across; a constant cannot express
   * a price that changed last month, and it is not what anybody is charged.
   */
  priceMonthly: number;
  /** @deprecated See `priceMonthly`. */
  priceYearly: number;
  features: string[];
  /**
   * The parts of the feature list a machine can check.
   *
   * The strings above are copy — they change with a marketing decision and read
   * differently in every language. These are the same promises in a form an
   * endpoint can answer with, so "5 desain tersimpan" and the number the status
   * card fills its bar from cannot drift apart. `null` means no limit.
   */
  limits: { designs: number | null };
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
    limits: { designs: 5 },
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
    limits: { designs: null },
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
    limits: { designs: null },
  },
];

/** The account's current plan; a free user with room to upgrade. */
export const CURRENT_PLAN: PlanId = "gratis";

/** Usage against the current plan's limits, for the status card. */
export const CURRENT_USAGE = {
  designsUsed: 3,
  designsLimit: 5,
};

/** The plan by id, falling back to the free tier for anything unrecognised. */
export function planById(id: PlanId): Plan {
  return PLANS.find((plan) => plan.id === id) ?? PLANS[0];
}

export function planRank(id: PlanId): number {
  return PLANS.findIndex((plan) => plan.id === id);
}

/**
 * The tier directly above this one, or null at the top.
 *
 * One step, not the most expensive one: somebody on Gratis is being asked to
 * try Pro, and a free account shown the Studio price is being shown a number
 * that has nothing to do with them.
 */
export function nextPlan(id: PlanId): Plan | null {
  return PLANS[planRank(id) + 1] ?? null;
}

/**
 * What a year on this plan saves if it is billed yearly.
 *
 * Stated as the total rather than the monthly difference, because that is the
 * number the choice is actually about — "Rp10.000 lebih murah per bulan" is the
 * same fact made to sound smaller.
 */
export function yearlySaving(plan: Plan): number {
  return (plan.priceMonthly - plan.priceYearly) * 12;
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

/**
 * The plans, side by side.
 *
 * The feature lists above are sales copy — one plan says "Semua fitur Pro" and
 * means nine things — which reads well on a pricing card and cannot be compared
 * row by row. This is the same promises arranged so they can be: one row per
 * capability, one cell per plan, every cell traceable to a line in the lists
 * above rather than invented here.
 *
 * Storage is deliberately absent. Two plans state a figure and the free tier
 * states none, so a row for it would be two facts and a guess — it stays in the
 * feature lists, where a plan speaks only for itself.
 */
export interface ComparisonRow {
  label: string;
  /** One cell per plan, in `PLANS` order. `true`/`false` render as a tick or a dash. */
  cells: Record<PlanId, string | boolean>;
}

export const PLAN_COMPARISON: ComparisonRow[] = [
  {
    label: "Desain tersimpan",
    cells: { gratis: "5", pro: "Tak terbatas", studio: "Tak terbatas" },
  },
  {
    label: "Kualitas ekspor",
    cells: { gratis: "Standar", pro: "HD", studio: "HD" },
  },
  {
    label: "Tanpa watermark",
    cells: { gratis: false, pro: true, studio: true },
  },
  {
    label: "Template & stiker",
    cells: { gratis: "Dasar", pro: "Semua", studio: "Semua" },
  },
  {
    label: "Alat AI",
    cells: { gratis: false, pro: true, studio: true },
  },
  {
    label: "Mode kiosk & slideshow",
    cells: { gratis: false, pro: false, studio: true },
  },
  {
    label: "Branding acara",
    cells: { gratis: false, pro: false, studio: true },
  },
  {
    label: "Anggota tim",
    cells: { gratis: "1", pro: "1", studio: "5" },
  },
];
