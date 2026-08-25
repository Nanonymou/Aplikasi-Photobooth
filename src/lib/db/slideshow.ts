import "server-only";

import { query } from "@/lib/db/client";

/**
 * The live feed a booth projects.
 *
 * An event's slideshow is its guests' shares, newest first: every time someone
 * turns their photostrip into a link, that picture is what the big screen should
 * show next. Nothing new is recorded to make this work — a share already means
 * "I am happy for this to be seen", which is exactly the consent a projector
 * needs, and a photo that was never shared never appears here.
 *
 * Expired and revoked shares drop out on their own, so a guest who pulls their
 * link takes it off the wall too.
 */

export interface Slide {
  /** The share's code; also the address the image is served from. */
  id: string;
  /** Who it is from, as a screen should say it. */
  guest: string;
  createdAt: string;
}

interface SlideRow {
  code: string;
  created_at: Date;
  display_name: string | null;
  email: string | null;
  /** The account that claimed the guest session this share came from, if any. */
  claimed_name: string | null;
  claimed_email: string | null;
  guest_code: string | null;
}

/** Enough to fill a loop without asking for an event's whole history. */
export const MAX_SLIDES = 60;
const DEFAULT_SLIDES = 30;

export function slideLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_SLIDES;
  return Math.min(parsed, MAX_SLIDES);
}

/**
 * A name for the screen.
 *
 * Who a share belongs to takes two hops, because ownership does. Work is owned
 * by the browser's owner id, and an account only becomes that owner for work it
 * claimed when signing in; anything made afterwards still carries the guest
 * identity. So the name is looked for in both places — the profile that owns the
 * row directly, then the account that claimed the guest session it came from.
 *
 * Failing both, guests have no name at all, only the short code their session is
 * known by: "Tamu S2QFYS" is something the person in front of the screen can
 * recognise as theirs, which a uuid is not. An email is a last resort and only
 * its local part — the screen is facing a room, and nobody shared their photo
 * expecting their address on a wall.
 */
function nameFor(row: SlideRow): string {
  const chosen = row.display_name?.trim() || row.claimed_name?.trim();
  if (chosen) return chosen;
  if (row.guest_code) return `Tamu ${row.guest_code}`;

  const local = (row.email ?? row.claimed_email)?.split("@")[0]?.trim();
  return local || "Tamu";
}

/**
 * The newest live shares.
 *
 * `since` turns this into a poll: a slideshow already holding the last fifty
 * slides asks only for what arrived after them, so the screen keeps running on
 * a trickle rather than refetching the event every few seconds.
 *
 * Only images. A shared PDF is a real share and a perfectly good link, but a
 * projector cannot page through one, and a slide that renders as a broken image
 * is worse than a slide that never appears.
 */
export async function listSlides(
  limit: number,
  since?: string,
): Promise<Slide[]> {
  const rows = await query<SlideRow>(
    `select s.code, s.created_at,
            p.display_name, p.email,
            c.display_name as claimed_name, c.email as claimed_email,
            g.code as guest_code
       from shares s
       left join user_profiles p on p.id = s.owner_id
       left join guest_sessions g on g.owner_id = s.owner_id
       left join user_profiles c on c.id = g.claimed_by
      where s.revoked_at is null
        and s.expires_at > now()
        and s.content_type like 'image/%'
        and ($2::timestamptz is null or s.created_at > $2)
      order by s.created_at desc
      limit $1`,
    [limit, since ?? null],
  );

  return rows.map((row) => ({
    id: row.code,
    guest: nameFor(row),
    createdAt: row.created_at.toISOString(),
  }));
}
