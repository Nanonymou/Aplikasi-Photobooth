import type { Metadata } from "next";

import { Forbidden } from "@/components/auth/forbidden";

export const metadata: Metadata = {
  title: "Akses Ditolak — FrameStudio AI",
};

/**
 * The standalone access-denied page.
 *
 * A stable place to land or link to for a 403 — the same screen the route guard
 * shows, without a specific area's role context, so its message stays general.
 */
export default function ForbiddenPage() {
  return <Forbidden />;
}
