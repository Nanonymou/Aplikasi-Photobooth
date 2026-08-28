import "server-only";

import { siteUrl } from "@/lib/api/site";

/**
 * Getting a sign-in link to a person.
 *
 * There is no mail provider wired up yet, and that fact must not be papered
 * over: a sign-in flow that silently fails to send is a locked door with no
 * error message. So delivery reports honestly whether it happened, the endpoint
 * passes that on, and an unconfigured install logs the link where its operator
 * can see it — which is a legitimate way to run a booth on a laptop and a
 * terrible way to run a service, hence the warning that says so.
 *
 * The link itself is never returned to the caller. Handing a browser the token
 * it was supposed to receive by mail would turn the whole exercise back into
 * "type an address, get a session".
 */

export interface Delivery {
  delivered: boolean;
  /** Why not, when not — shown to nobody, logged for whoever runs the place. */
  reason?: string;
}

export function magicLinkUrl(token: string): string {
  return `${siteUrl()}/masuk-tautan/verifikasi?token=${encodeURIComponent(token)}`;
}

/**
 * Sends a support note from the console to one account.
 *
 * Same delivery, different content, and the same honest report: an admin who
 * typed a paragraph to a stuck user needs to know whether it left the building.
 */
export async function deliverSupportNote(
  email: string,
  message: string,
): Promise<Delivery> {
  const provider = process.env.MAIL_PROVIDER;

  if (!provider) {
    console.warn(
      `[mail] no MAIL_PROVIDER configured — support note for ${email} not sent.\n` +
        `[mail] note: ${message}`,
    );
    return { delivered: false, reason: "no mail provider configured" };
  }

  console.error(`[mail] unknown MAIL_PROVIDER "${provider}"; note not sent.`);
  return { delivered: false, reason: `unknown provider: ${provider}` };
}

/**
 * Sends the link, if there is anything to send it with.
 *
 * Deliberately not an SMTP client: which provider this ends up on is a
 * deployment decision, and the shape a caller needs — "did it go" — is the same
 * either way. Wiring one in means replacing this function's body, not its
 * signature or any of its callers.
 */
export async function deliverMagicLink(
  email: string,
  url: string,
): Promise<Delivery> {
  const provider = process.env.MAIL_PROVIDER;

  if (!provider) {
    // The address is logged; the URL is logged too, because on an unconfigured
    // install this console *is* the mailbox. Anyone who can read these logs
    // could already read the database.
    console.warn(
      `[mail] no MAIL_PROVIDER configured — sign-in link for ${email} not sent.\n` +
        `[mail] link: ${url}`,
    );
    return { delivered: false, reason: "no mail provider configured" };
  }

  console.error(`[mail] unknown MAIL_PROVIDER "${provider}"; link not sent.`);
  return { delivered: false, reason: `unknown provider: ${provider}` };
}
