import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getViewer, type Viewer } from "@/lib/api/authorize";
import { checkFeature, featureContext } from "@/lib/api/features";
import type { AppPermission } from "@/lib/db/role-permissions";
import type { FeatureId } from "@/lib/features";

/**
 * The server half of route protection.
 *
 * `proxy.ts` asks whether there is a session at all — the one question a cookie
 * can answer without touching the database. That is as far as a cookie goes:
 * whether the role fits, and whether the plan covers it, live in the database.
 * This is where those are asked, before the page is rendered, so the answer
 * cannot be edited by the person it is about — which is exactly what a guard
 * running in the visitor's own browser could never promise.
 *
 * A guarded page therefore stops being static, which is the honest outcome — a
 * page whose content depends on who is asking was never cacheable.
 */

/** Set by the proxy, so a redirect can send the visitor back where they meant to go. */
const PATH_HEADER = "x-pathname";

async function currentPath(): Promise<string> {
  return (await headers()).get(PATH_HEADER) ?? "/";
}

/**
 * Where each refusal leads.
 *
 * Three different situations, three different places, because a person who
 * needs to sign in, a person whose role will never fit, and a person one
 * upgrade away are not helped by the same screen.
 */
async function refuse(reason: "signin" | "role" | "plan"): Promise<never> {
  if (reason === "signin") {
    redirect(`/masuk?next=${encodeURIComponent(await currentPath())}`);
  }

  redirect(reason === "plan" ? "/langganan" : "/dilarang");
}

/** Any signed-in account. For pages that are personal rather than privileged. */
export async function requireAccount(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) await refuse("signin");
  return viewer as Viewer;
}

/** A page that a role must hold a permission to reach. */
export async function requirePagePermission(
  permission: AppPermission,
): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) await refuse("signin");
  if (!(viewer as Viewer).can(permission)) await refuse("role");
  return viewer as Viewer;
}

/**
 * A page gated by a feature — role and plan together.
 *
 * The same check the endpoints behind the page use, so a screen and its data
 * cannot disagree about who may see it: reaching a page whose every request then
 * answers 402 is a worse experience than being sent to the pricing page.
 */
export async function requirePageFeature(id: FeatureId): Promise<Viewer> {
  const context = await featureContext();
  const access = checkFeature(context, id);

  if (!access.allowed) {
    await refuse(
      access.reason === "unauthenticated"
        ? "signin"
        : access.reason === "plan"
          ? "plan"
          : "role",
    );
  }

  return context.viewer as Viewer;
}
