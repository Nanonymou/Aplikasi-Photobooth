import type { Metadata } from "next";

import { RecentActivity } from "@/components/admin/recent-activity";
import { RoleSummary } from "@/components/admin/role-summary";
import { StatGrid } from "@/components/admin/stat-grid";

export const metadata: Metadata = {
  title: "Dasbor Admin — FrameStudio AI",
};

/**
 * The admin console's home.
 *
 * The landing an admin sees first: headline numbers, a role breakdown, and what
 * just happened — enough to read the health of the booth at a glance before
 * drilling into any one area. The console chrome comes from the layout; this page
 * assembles the overview on shaped mock data.
 */
export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Dasbor</h1>
        <p className="text-muted-foreground text-sm">
          Ringkasan aktivitas dan pengguna FrameStudio.
        </p>
      </div>

      <StatGrid />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
        <RoleSummary />
      </div>
    </div>
  );
}
