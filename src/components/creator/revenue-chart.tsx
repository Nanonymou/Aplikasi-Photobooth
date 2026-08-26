import { MONTHLY_REVENUE, rupiah } from "@/lib/creator/sales";

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
 */
export function RevenueChart() {
  const max = Math.max(...MONTHLY_REVENUE.map((month) => month.value), 1);
  const width = MONTHLY_REVENUE.length * 10;
  const slot = width / MONTHLY_REVENUE.length;
  const barWidth = slot * BAR_RATIO;

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`Pendapatan enam bulan terakhir: ${MONTHLY_REVENUE.map(
          (month) => `${month.label} ${rupiah(month.value)}`,
        ).join(", ")}`}
      >
        {MONTHLY_REVENUE.map((month, index) => {
          const barHeight = Math.max(2, (month.value / max) * (HEIGHT - 8));
          return (
            <rect
              key={month.label}
              x={index * slot + (slot - barWidth) / 2}
              y={HEIGHT - barHeight}
              width={barWidth}
              height={barHeight}
              rx={Math.min(1.5, barWidth / 2)}
              fill="var(--color-primary)"
              opacity={index === MONTHLY_REVENUE.length - 1 ? 1 : 0.6}
            />
          );
        })}
      </svg>

      <div
        className="grid gap-1 text-center"
        style={{
          gridTemplateColumns: `repeat(${MONTHLY_REVENUE.length}, minmax(0, 1fr))`,
        }}
      >
        {MONTHLY_REVENUE.map((month) => (
          <div key={month.label} className="flex flex-col">
            <span className="text-muted-foreground text-[11px]">
              {month.label}
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
