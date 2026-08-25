import { redirect } from "next/navigation";

/**
 * `/pengaturan` on its own.
 *
 * The section has no landing screen of its own: an index that listed the same
 * three tabs sitting directly above it would be a page whose only content is a
 * copy of its own navigation. So the bare path opens the first tab instead, and
 * "Pengaturan" in a menu still leads somewhere useful.
 *
 * `redirect` rather than rendering the profile tab here, so the URL matches what
 * is on screen — a reload, a bookmark, and the highlighted tab all agree.
 */
export default function SettingsIndexPage() {
  redirect("/pengaturan/profil");
}
