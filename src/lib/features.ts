import type { AppPermission } from "@/lib/db/role-permissions";
import type { PlanId } from "@/lib/billing/plans";

/**
 * What the app can do, and what it takes to do it.
 *
 * Two different gates already exist and neither is the whole answer. A role says
 * what a person is *allowed* to do — an operator runs booths, a guest does not.
 * A plan says what an account has *paid* for — kiosk mode is a Studio feature,
 * HD export is Pro. Ask only the first and a free account walks into a paid
 * feature; ask only the second and any paying guest walks into the admin
 * console.
 *
 * So a feature names both, once, here. The alternative is each call site
 * remembering to ask twice, which works right up until the one that forgets.
 *
 * Plain data, shared by both sides: the server decides, and the client reads the
 * same table to know which buttons to dim rather than inventing its own rules.
 */

export type FeatureId =
  | "design.edit"
  | "design.export"
  | "design.export.hd"
  | "design.share"
  | "design.ai"
  | "booth.kiosk"
  | "booth.slideshow"
  | "event.branding"
  | "admin.console";

export interface Feature {
  id: FeatureId;
  label: string;
  /** The role permission it needs, if any. */
  permission?: AppPermission;
  /** The lowest plan that includes it. Absent means every plan has it. */
  minPlan?: Exclude<PlanId, "gratis">;
}

export const FEATURES: Feature[] = [
  { id: "design.edit", label: "Editor desain", permission: "design.edit" },
  { id: "design.export", label: "Ekspor desain", permission: "design.export" },
  {
    id: "design.export.hd",
    label: "Ekspor HD tanpa watermark",
    permission: "design.export",
    minPlan: "pro",
  },
  { id: "design.share", label: "Bagikan tautan", permission: "design.share" },
  {
    id: "design.ai",
    label: "Alat AI",
    permission: "design.edit",
    minPlan: "pro",
  },
  {
    id: "booth.kiosk",
    label: "Mode kiosk",
    permission: "booth.kiosk",
    minPlan: "studio",
  },
  {
    id: "booth.slideshow",
    label: "Live slideshow",
    permission: "booth.slideshow",
    minPlan: "studio",
  },
  {
    id: "event.branding",
    label: "Branding event",
    permission: "admin.branding.manage",
    minPlan: "studio",
  },
  { id: "admin.console", label: "Konsol admin", permission: "admin.console" },
];

export function featureById(id: FeatureId): Feature | undefined {
  return FEATURES.find((feature) => feature.id === id);
}

/** Plans in order, cheapest first — the order the pricing page lists them in. */
const PLAN_ORDER: PlanId[] = ["gratis", "pro", "studio"];

/**
 * Whether one plan includes another's tier.
 *
 * A straight rank comparison, because the tiers are cumulative by design: every
 * Studio feature list starts with "Semua fitur Pro". If that ever stops being
 * true the comparison stops being the right question, and this is the one place
 * that would need to know.
 */
export function planIncludes(held: PlanId, required: PlanId): boolean {
  return PLAN_ORDER.indexOf(held) >= PLAN_ORDER.indexOf(required);
}
