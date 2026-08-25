import "server-only";

import { getViewer, type Viewer } from "@/lib/api/authorize";
import { jsonError } from "@/lib/api/http";
import { FEATURES, featureById, planIncludes, type FeatureId } from "@/lib/features";
import { getSubscription, FREE_PLAN } from "@/lib/db/subscriptions";
import type { PlanId } from "@/lib/billing/plans";

/**
 * One question, asked once: may this caller use this feature?
 *
 * `authorize.ts` answers half of it — does their role permit this — and the
 * subscription answers the other half — has their account paid for it. Both
 * halves were already reachable, which is exactly the problem: a handler that
 * checks the role and forgets the plan hands a paid feature to a free account,
 * and nothing about the code looks wrong. Here the two are one call, and the
 * answer says which half said no.
 *
 * The distinction matters to the person on the other end. "Sign in", "your
 * account cannot do this", and "your plan does not include this" are three
 * different things to be told, and only the last one is an invitation to
 * upgrade.
 */

export type DenialReason = "unauthenticated" | "role" | "plan";

export interface FeatureAccess {
  feature: FeatureId;
  allowed: boolean;
  reason?: DenialReason;
  /** The plan that would unlock it, when the plan is what is in the way. */
  requiredPlan?: PlanId;
}

/**
 * The caller's plan and role, resolved once.
 *
 * Passed around rather than re-read: a request checking three features would
 * otherwise ask the database six times for two answers that cannot change
 * mid-request.
 */
export interface FeatureContext {
  viewer: Viewer | null;
  plan: PlanId;
}

export async function featureContext(): Promise<FeatureContext> {
  const viewer = await getViewer();

  // A signed-out visitor has no account, so no plan — the free tier, which is
  // also what a booth guest is on. Neither is a missing record to repair.
  if (!viewer) return { viewer: null, plan: FREE_PLAN.plan };

  const subscription = await getSubscription(viewer.profile.id);

  // `pending_plan` is deliberately not consulted: choosing a plan is not paying
  // for one, and a feature check that honoured intent would be the paywall
  // opening for anyone who clicked upgrade and closed the tab.
  return { viewer, plan: subscription.plan };
}

/** Decides one feature against an already-resolved context. */
export function checkFeature(
  context: FeatureContext,
  id: FeatureId,
): FeatureAccess {
  const feature = featureById(id);

  // An unknown id is refused rather than allowed. A typo in a gate should close
  // the door, not open it.
  if (!feature) return { feature: id, allowed: false, reason: "role" };

  if (feature.permission) {
    if (!context.viewer) {
      return { feature: id, allowed: false, reason: "unauthenticated" };
    }
    if (!context.viewer.can(feature.permission)) {
      return { feature: id, allowed: false, reason: "role" };
    }
  }

  if (feature.minPlan && !planIncludes(context.plan, feature.minPlan)) {
    return {
      feature: id,
      allowed: false,
      reason: "plan",
      requiredPlan: feature.minPlan,
    };
  }

  return { feature: id, allowed: true };
}

/** One feature, resolving the context first. For a single check. */
export async function featureAccess(id: FeatureId): Promise<FeatureAccess> {
  return checkFeature(await featureContext(), id);
}

/**
 * Every feature, decided at once.
 *
 * What the client asks for on load: one round-trip, and the UI dims what it
 * cannot reach instead of each screen re-deriving the rules and drifting from
 * them.
 */
export async function allFeatureAccess(): Promise<FeatureAccess[]> {
  const context = await featureContext();
  return FEATURES.map((feature) => checkFeature(context, feature.id));
}

/** The response a denial deserves, by which half said no. */
export function featureDenial(access: FeatureAccess): Response {
  if (access.reason === "unauthenticated") {
    return jsonError(401, "Masuk dulu untuk melanjutkan.");
  }

  if (access.reason === "plan") {
    // 402 rather than 403: nothing about who they are is the problem, and the
    // client should offer an upgrade rather than an apology.
    return jsonError(402, "Fitur ini ada di paket yang lebih tinggi.", {
      requiredPlan: access.requiredPlan,
    });
  }

  return jsonError(403, "Akunmu tidak punya akses ke fitur ini.");
}

/**
 * Wraps a handler so a feature gate cannot be forgotten.
 *
 * The same shape as `withPermission`, and for the same reason: the failure path
 * is the default, and the handler only runs once the check has passed. It
 * receives the context so a handler that needs the viewer or the plan does not
 * fetch them again.
 */
export function withFeature<Args extends unknown[]>(
  id: FeatureId,
  handler: (context: FeatureContext, ...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    const context = await featureContext();
    const access = checkFeature(context, id);
    if (!access.allowed) return featureDenial(access);
    return handler(context, ...args);
  };
}
