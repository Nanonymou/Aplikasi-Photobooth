import "server-only";

import { getSettings } from "@/lib/db/app-settings";
import { EXPORT_MAX_EDGE } from "@/lib/admin/settings";

/**
 * The settings, as rules the app actually obeys.
 *
 * Every knob in the admin console is read from here by whatever it governs, and
 * that indirection is the whole point: a setting is only real at the moment
 * something refuses to proceed because of it. Before this module the console
 * had six switches an admin could flip, save, and watch change nothing.
 *
 * Each function is one question asked at one door, so there is no way to add a
 * setting and forget to enforce it — the setting has no other reason to be read.
 */

/**
 * Whether a walk-up guest may use the booth without an account.
 *
 * Asked at the two doors a guest comes through: starting a session, and saving
 * the first thing they make. Not at reads — somebody who already has work must
 * still be able to fetch it after the switch is turned off, or turning it off
 * would silently confiscate what people already made.
 */
export async function guestsAllowed(): Promise<boolean> {
  return (await getSettings()).allowGuest;
}

/**
 * Whether an email nobody has seen before may become an account.
 *
 * Signing in is not registering. An existing account passes this untouched, so
 * closing registration locks the door without locking out the people already
 * inside — which is what an admin means when they close it mid-event.
 */
export async function registrationAllowed(): Promise<boolean> {
  return (await getSettings()).allowRegistration;
}

/**
 * How long a guest's work is kept, as a Postgres interval argument.
 *
 * Returned as a number of days for `make_interval(days => …)` rather than as
 * SQL text, so it cannot carry anything but a number into a statement.
 */
export async function guestRetentionDays(): Promise<number> {
  return (await getSettings()).guestRetentionDays;
}

/**
 * The largest edge an export may be rendered at.
 *
 * The quality knob has to cost something or it is decoration. A request for a
 * bigger scale is clamped rather than refused: the export still arrives, at the
 * size this installation is willing to spend on it.
 */
export async function exportMaxEdge(): Promise<number> {
  return EXPORT_MAX_EDGE[(await getSettings()).exportQuality];
}
