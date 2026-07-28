import type { Metadata } from "next";

import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export const metadata: Metadata = {
  title: "Analitik — FrameStudio AI",
};

/**
 * The analytics page.
 *
 * How the booth is doing over time: headline KPIs, a daily trend, and what drives
 * the numbers — all scoped to a period the admin picks. The chrome comes from the
 * admin layout; this page states the heading and hands the rest to the client
 * view over shaped mock data.
 */
export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Analitik</h1>
        <p className="text-muted-foreground text-sm">
          Pantau tren sesi, desain, dan ekspor dari waktu ke waktu.
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
