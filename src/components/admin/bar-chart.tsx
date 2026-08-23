import type { Point } from "@/lib/admin/analytics";

const HEIGHT = 200;
/** Share of each slot the bar occupies; the rest is the gap between bars. */
const BAR_RATIO = 0.62;

/**
 * A dependency-free bar chart.
 *
 * Counts per day read better as discrete bars than as a continuous line — a
 * download either happened that day or it did not — so downloads get bars while
 * the trend series get an area. Widths are computed from the slot count so one
 * component serves a 7-day window and a 90-day one; the viewBox stretches to the
 * container, and bars are plain rects so nothing needs a chart library.
 */
export function BarChart({ points }: { points: Point[] }) {
  if (points.length === 0) return null;

  const width = Math.max(points.length, 2) * 10;
  const max = Math.max(...points.map((point) => point.value), 1);
  const slot = width / points.length;
  const barWidth = slot * BAR_RATIO;

  return (
    <svg
      viewBox={`0 0 ${width} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-44 w-full"
      role="img"
      aria-label="Grafik unduhan harian"
    >
      {points.map((point, index) => {
        const barHeight = Math.max(2, (point.value / max) * (HEIGHT - 8));
        return (
          <rect
            key={point.index}
            x={index * slot + (slot - barWidth) / 2}
            y={HEIGHT - barHeight}
            width={barWidth}
            height={barHeight}
            rx={Math.min(1.5, barWidth / 2)}
            fill="var(--color-primary)"
            opacity={0.75}
          />
        );
      })}
    </svg>
  );
}
