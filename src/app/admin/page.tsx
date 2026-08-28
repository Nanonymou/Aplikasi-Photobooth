import type { Metadata } from "next";

import { QuickLinks } from "@/components/admin/quick-links";
import { RecentActivity } from "@/components/admin/recent-activity";
import { RoleSummary } from "@/components/admin/role-summary";
import { StatGrid } from "@/components/admin/stat-grid";
import { readOverview } from "@/lib/db/admin-overview";
import { presentOverview } from "@/lib/admin/overview";

export const metadata: Metadata = {
  title: "Dasbor Admin — FrameStudio AI",
};

/**
 * The admin console's home.
 *
 * The landing an admin sees first: headline numbers, a role breakdown, and what
 * just happened — enough to read the health of the booth at a glance before
 * drilling into any one area. The console chrome comes from the layout, and the
 * guard is on it too, so this page is reached only by somebody who may see it.
 *
 * Read from the database directly. A server component fetching this app's own
 * endpoint is a round trip out to the network and back into the same process.
 */
export default async function AdminDashboardPage() {
  const { stats, roles, activity } = presentOverview(await readOverview());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Dasbor</h1>
        <p className="text-muted-foreground text-sm">
          Ringkasan aktivitas dan pengguna FrameStudio.
        </p>
      </div>

      <StatGrid stats={stats} />

      <QuickLinks />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity items={activity} />
        </div>
        <RoleSummary roles={roles} />
      </div>
    </div>
  );
}
