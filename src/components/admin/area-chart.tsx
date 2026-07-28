import type { Point } from "@/lib/admin/analytics";

const WIDTH = 600;
const HEIGHT = 200;
const PAD_Y = 12;

/**
 * A dependency-free area chart.
 *
 * Analytics needs a trend line and the project ships no chart library, so this
 * draws one in plain SVG: the series mapped to a polyline over a soft filled
 * area. It stretches to its container (`preserveAspectRatio="none"`) while the
 * stroke stays crisp via `non-scaling-stroke`, so one small viewBox serves any
 * width. Presentational only — it takes the points and renders them.
 */
export function AreaChart({
  points,
  gradientId = "area-fill",
}: {
  points: Point[];
  gradientId?: string;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = max - min || 1;

  const x = (i: number) => (i / (points.length - 1)) * WIDTH;
  const y = (value: number) =>
    HEIGHT - PAD_Y - ((value - min) / span) * (HEIGHT - PAD_Y * 2);

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `M0,${HEIGHT} L${line.replaceAll(" ", " L")} L${WIDTH},${HEIGHT} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-44 w-full"
      role="img"
      aria-label="Grafik tren harian"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
