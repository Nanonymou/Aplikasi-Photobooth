import {
  bulanPendek,
  rupiah,
  type MonthlyRevenue,
} from "@/lib/creator/sales";

const HEIGHT = 200;
/** Share of each slot the bar occupies; the rest is the gap between bars. */
const BAR_RATIO = 0.6;

/**
 * Six months of takings, in plain SVG.
 *
 * Discrete bars rather than a line, because a month's revenue is a total and not
 * a reading on the way somewhere — joining the tops would draw a trajectory
 * through days that never had a value. The numbers are also listed under it, so
 * the chart is the shape of the answer and the labels are the answer; a picture
 * nobody can read a figure off is decoration.
 *
 * The months arrive from the endpoint as `YYYY-MM` and are named here. A series
 * with no sales in it is still six bars of zero, because the shape of a quiet
 * stretch is information and a chart that skipped those months would draw the
 * wrong one.
 */
export function RevenueChart({ months }: { months: MonthlyRevenue[] }) {
  if (months.length === 0) return null;

  const max = Math.max(...months.map((month) => month.value), 1);
  const width = months.length * 10;
  const slot = width / months.length;
  const barWidth = slot * BAR_RATIO;

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`Pendapatan ${months.length} bulan terakhir: ${months
          .map((month) => `${bulanPendek(month.month)} ${rupiah(month.value)}`)
          .join(", ")}`}
      >
        {months.map((month, index) => {
          const barHeight = Math.max(2, (month.value / max) * (HEIGHT - 8));
          return (
            <rect
              key={month.month}
              x={index * slot + (slot - barWidth) / 2}
              y={HEIGHT - barHeight}
              width={barWidth}
              height={barHeight}
              rx={Math.min(1.5, barWidth / 2)}
              fill="var(--color-primary)"
              opacity={index === months.length - 1 ? 1 : 0.6}
            />
          );
        })}
      </svg>

      <div
        className="grid gap-1 text-center"
        style={{
          gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))`,
        }}
      >
        {months.map((month) => (
          <div key={month.month} className="flex flex-col">
            <span className="text-muted-foreground text-[11px]">
              {bulanPendek(month.month)}
            </span>
            <span className="text-[11px] tabular-nums">
              {Math.round(month.value / 1000)} rb
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
