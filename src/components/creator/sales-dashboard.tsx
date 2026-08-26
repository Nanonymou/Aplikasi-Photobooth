import {
  Banknote,
  Clock,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { RevenueChart } from "@/components/creator/revenue-chart";
import {
  PAYOUTS,
  PLATFORM_CUT,
  RECENT_SALES,
  TEMPLATE_SALES,
  percent,
  rupiah,
  summarise,
  tanggal,
  type PayoutStatus,
} from "@/lib/creator/sales";
import { cn } from "@/lib/utils";

function StatCard({
  label,
  value,
  note,
  icon: Icon,
  delta,
}: {
  label: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  delta?: number | null;
}) {
  const Trend = delta !== null && delta !== undefined && delta < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </span>
        {delta !== null && delta !== undefined && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              delta < 0
                ? "text-destructive"
                : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            <Trend className="size-3.5" />
            {percent(delta)}
          </span>
        )}
      </div>

      {note && <span className="text-muted-foreground text-xs">{note}</span>}
    </div>
  );
}

const PAYOUT_STYLE: Record<PayoutStatus, string> = {
  menunggu: "bg-muted text-muted-foreground",
  diproses: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  dibayar: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

/**
 * What a creator has earned, and what is still owed to them.
 *
 * Four questions, in the order a maker actually asks them: how much have I made,
 * is it going up, which of my templates is carrying it, and when do I get paid.
 * The payout table is last but it is the one people scroll to — so it states the
 * date and the status plainly rather than a progress bar that means nothing
 * until you already know the schedule.
 *
 * The platform's cut is spelled out beside the gross rather than left as the gap
 * between two numbers somebody has to subtract. A dashboard that shows takings
 * and pays out less without saying why is a support ticket.
 */
export function SalesDashboard() {
  const summary = summarise();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendapatan bulan ini"
          value={rupiah(summary.thisMonth)}
          icon={Banknote}
          delta={summary.monthOverMonth}
          note="Dibanding bulan lalu"
        />
        <StatCard
          label="Total sepanjang masa"
          value={rupiah(summary.grossAllTime)}
          icon={Wallet}
          note={`Bersih ${rupiah(summary.netAllTime)} setelah potongan ${Math.round(PLATFORM_CUT * 100)}%`}
        />
        <StatCard
          label="Template terjual"
          value={summary.soldAllTime.toLocaleString("id-ID")}
          icon={ShoppingBag}
          note={`${TEMPLATE_SALES.length} template berbayar`}
        />
        <StatCard
          label="Menunggu dicairkan"
          value={rupiah(summary.pendingPayout)}
          icon={Clock}
          note={`Dijadwalkan ${tanggal(PAYOUTS[0].at)}`}
        />
      </div>

      <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4">
        <h2 className="text-sm font-semibold">Pendapatan enam bulan terakhir</h2>
        <RevenueChart />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Per template</h2>
        <div className="border-border relative overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-muted-foreground bg-muted/40 text-xs">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">
                  Template
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Harga
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Terjual
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Pendapatan
                </th>
              </tr>
            </thead>
            <tbody>
              {TEMPLATE_SALES.map((row) => (
                <tr key={row.id} className="border-border border-t">
                  <th scope="row" className="px-4 py-2.5 text-left font-medium">
                    {row.title}
                  </th>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {rupiah(row.price)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {row.sold}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {rupiah(row.gross)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Transaksi terakhir</h2>
          <ul className="border-border divide-border divide-y rounded-xl border">
            {RECENT_SALES.map((sale) => (
              <li
                key={sale.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{sale.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {sale.buyer} · {tanggal(sale.at)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm tabular-nums">{rupiah(sale.net)}</p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    dari {rupiah(sale.price)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Pencairan</h2>
          <ul className="border-border divide-border divide-y rounded-xl border">
            {PAYOUTS.map((payout) => (
              <li
                key={payout.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{payout.period}</p>
                  <p className="text-muted-foreground text-xs">
                    {payout.status === "dibayar" ? "Dibayar" : "Dijadwalkan"}{" "}
                    {tanggal(payout.at)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm tabular-nums">
                    {rupiah(payout.amount)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      PAYOUT_STYLE[payout.status],
                    )}
                  >
                    {payout.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Pencairan berjalan otomatis tiap tanggal 5 untuk penjualan bulan
            sebelumnya. Potongan platform {Math.round(PLATFORM_CUT * 100)}% sudah
            dihitung pada angka di atas.
          </p>
        </section>
      </div>
    </div>
  );
}
