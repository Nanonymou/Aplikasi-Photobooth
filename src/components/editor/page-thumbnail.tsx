"use client";

import type { CanvasObject, CanvasPage } from "@/types/editor";

/**
 * A page, small.
 *
 * Drawn as SVG from the model rather than rendered through the canvas engine.
 * A strip of thumbnails would otherwise mean one Konva stage per page, each
 * loading the same photos again, to produce something the size of a postage
 * stamp — cost that scales with the number of pages, for detail nobody can see
 * at that size.
 *
 * What survives the shrink is what makes one page recognisable as itself: its
 * shape, its background, and where the blocks sit. Photos are drawn because a
 * strip of three faces is exactly how somebody finds the page they meant; text
 * becomes bars, because at 28 pixels wide a sentence is a smudge either way and
 * a bar is an honest one.
 */

function backgroundFill(page: CanvasPage, gradientId: string): string {
  switch (page.background.type) {
    case "solid":
      return page.background.color;
    case "gradient":
      return `url(#${gradientId})`;
    case "pattern":
      return page.background.background;
    case "image":
      // The image itself is drawn separately; this is what shows around it.
      return "#0f172a";
    default:
      return "transparent";
  }
}

function Item({ object }: { object: CanvasObject }) {
  if (!object.visible) return null;

  // Rotation about the object's own centre, matching how the canvas applies it.
  const transform =
    object.rotation === 0
      ? undefined
      : `rotate(${object.rotation} ${object.x + object.width / 2} ${object.y + object.height / 2})`;

  const common = {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    opacity: object.opacity,
    transform,
  };

  if (object.kind === "slot") {
    return object.photo ? (
      <image
        {...common}
        href={object.photo.src}
        preserveAspectRatio="xMidYMid slice"
      />
    ) : (
      <rect {...common} fill={object.fill} rx={object.cornerRadius} />
    );
  }

  if (object.kind === "image") {
    return (
      <image {...common} href={object.src} preserveAspectRatio="xMidYMid slice" />
    );
  }

  if (object.kind === "shape") {
    return object.shape === "ellipse" ? (
      <ellipse
        cx={object.x + object.width / 2}
        cy={object.y + object.height / 2}
        rx={object.width / 2}
        ry={object.height / 2}
        fill={object.fill}
        opacity={object.opacity}
        transform={transform}
      />
    ) : (
      <rect {...common} fill={object.fill} rx={object.cornerRadius} />
    );
  }

  if (object.kind === "text") {
    // One bar per line, at the text's own colour: enough to show that something
    // is written there, and where.
    const lines = object.text.split("\n").length;
    const lineHeight = object.height / lines;

    return (
      <g opacity={object.opacity} transform={transform}>
        {Array.from({ length: lines }, (_, index) => (
          <rect
            key={index}
            x={object.x}
            y={object.y + index * lineHeight + lineHeight * 0.2}
            width={object.width * (index === lines - 1 ? 0.7 : 1)}
            height={lineHeight * 0.55}
            fill={object.fill}
            rx={lineHeight * 0.2}
          />
        ))}
      </g>
    );
  }

  // Stickers are a glyph, and a glyph shrinks perfectly well.
  return (
    <text
      x={object.x + object.width / 2}
      y={object.y + object.height / 2}
      fontSize={Math.min(object.width, object.height)}
      dominantBaseline="central"
      textAnchor="middle"
      opacity={object.opacity}
      transform={transform}
    >
      {object.content}
    </text>
  );
}

export function PageThumbnail({
  page,
  className,
}: {
  page: CanvasPage;
  className?: string;
}) {
  const gradientId = `thumb-${page.id}`;
  const background = page.background;

  return (
    <svg
      viewBox={`0 0 ${page.width} ${page.height}`}
      className={className}
      // Decorative: the chip beside it already says the page's name and number.
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {background.type === "gradient" && (
        <defs>
          <linearGradient
            id={gradientId}
            gradientTransform={`rotate(${background.angle - 90} 0.5 0.5)`}
          >
            <stop offset="0%" stopColor={background.from} />
            <stop offset="100%" stopColor={background.to} />
          </linearGradient>
        </defs>
      )}

      <rect
        width={page.width}
        height={page.height}
        fill={backgroundFill(page, gradientId)}
      />

      {background.type === "image" && (
        <image
          width={page.width}
          height={page.height}
          href={background.src}
          preserveAspectRatio="xMidYMid slice"
        />
      )}

      {page.objects.map((object) => (
        <Item key={object.id} object={object} />
      ))}
    </svg>
  );
}
