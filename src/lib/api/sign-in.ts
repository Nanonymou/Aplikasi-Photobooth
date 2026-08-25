import "server-only";

import { accountIdForEmail, setSessionToken } from "@/lib/api/account";
import { createAuthSession } from "@/lib/db/auth-sessions";
import { getOwnerId } from "@/lib/api/owner";
import {
  claimGuestSession,
  getGuestSession,
  GuestSessionNotFoundError,
} from "@/lib/db/guest-sessions";
import {
  recordSignIn,
  type AuthProvider,
  type UserProfile,
} from "@/lib/db/user-profiles";

/**
 * What happens when anyone signs in, by any route.
 *
 * Email links and social providers differ only in how the identity is proven;
 * everything after that is the same three steps — establish the session, sync
 * the profile, bring the guest's work along. Keeping them in one function is
 * what stops the two paths drifting, which is how you end up with an app where
 * signing in with Google quietly forgets to claim your strip.
 */

export interface SignInResult {
  profile: UserProfile;
  /** What the guest session handed over, or null if there was nothing to move. */
  claimed: { designs: number; photos: number } | null;
}

export async function signIn(identity: {
  email: string;
  provider: AuthProvider;
  displayName?: string | null;
  avatarUrl?: string | null;
}): Promise<SignInResult> {
  const accountId = accountIdForEmail(identity.email);

  // The profile first: a session pointing at an account with no profile row
  // would resolve to an identity nothing else can describe.
  const profile = await recordSignIn({ ...identity, id: accountId });

  // Each sign-in issues its own session, so signing out on a phone does not
  // sign the same person out of the booth they are standing at.
  const session = await createAuthSession(accountId);
  await setSessionToken(session.token);

  // Whatever this browser was working on as a guest comes along.
  let claimed: SignInResult["claimed"] = null;
  const owner = await getOwnerId();

  if (owner) {
    const guest = await getGuestSession(owner);
    if (guest && !guest.claimedAt) {
      try {
        const result = await claimGuestSession(guest.code, accountId);
        claimed = { designs: result.designs, photos: result.photos };
      } catch (error) {
        // Expired, or claimed by another device in the meantime: nothing to
        // move. Not a reason to refuse someone entry to their own account.
        if (!(error instanceof GuestSessionNotFoundError)) {
          console.error("sign-in claim failed", error);
        }
      }
    }
  }

  return { profile, claimed };
}
