import "server-only";

import { getViewer } from "@/lib/api/authorize";
import { allFeatureAccess, type FeatureAccess } from "@/lib/api/features";
import { getOwnerId } from "@/lib/api/owner";
import { getGuestSession, type GuestSession } from "@/lib/db/guest-sessions";
import { FREE_PLAN, getSubscription } from "@/lib/db/subscriptions";
import type { AppPermission } from "@/lib/db/role-permissions";
import type { UserProfile, UserRole } from "@/lib/db/user-profiles";
import type { PlanId } from "@/lib/billing/plans";

/**
 * Everything a client needs to know about the person in front of it.
 *
 * Four questions that are never asked apart — who are you, what may your role
 * do, what has your account paid for, and is there guest work waiting — answered
 * once so the app does not open with four requests racing each other to decide
 * what its own navigation looks like.
 *
 * Written once here because two endpoints already answered pieces of it, and a
 * second description of the same person is how a menu ends up disagreeing with
 * the page it opens.
 */

export interface Me {
  /** Null for a visitor who has not signed in; everything else still applies. */
  profile: UserProfile | null;
  role: UserRole | null;
  permissions: AppPermission[];
  /** Per-feature decisions, each carrying why it was refused. */
  features: FeatureAccess[];
  plan: PlanId;
  /** Guest work on this browser that no account has taken yet. */
  guestSession: GuestSession | null;
}

export async function describeMe(): Promise<Me> {
  const [viewer, ownerId] = await Promise.all([getViewer(), getOwnerId()]);

  const [features, subscription, guest] = await Promise.all([
    allFeatureAccess(),
    viewer ? getSubscription(viewer.profile.id) : Promise.resolve(FREE_PLAN),
    ownerId ? getGuestSession(ownerId) : Promise.resolve(null),
  ]);

  return {
    profile: viewer?.profile ?? null,
    role: viewer?.profile.role ?? null,
    permissions: viewer?.permissions ?? [],
    features,
    plan: subscription.plan,
    // A claimed session is history; only an unclaimed one is still an offer.
    guestSession: guest && !guest.claimedAt ? guest : null,
  };
}
