import "server-only";

import { slotPathData } from "@/lib/editor/slot-shape";
import { patternDataUri, type PatternId } from "@/lib/editor/patterns";
import type {
  CanvasObject,
  CanvasPage,
  PageBackground,
  TextObject,
} from "@/types/editor";

/**
 * Draws a page as SVG, for rendering without a browser.
 *
 * The editor's own export is pixel-exact because it crops the live Konva stage.
 * This exists for everything that has no stage to crop: a print job, a shared
 * gallery, a QR that hands someone a file. It rebuilds the page from the same
 * model, using the same slot geometry (`slotPathData`) and the same background
 * vocabulary, so the two agree on everything that is a shape.
 *
 * Where the two can differ is type, and it is worth being precise about how:
 *
 *   wrapping  Konva measures glyphs and breaks lines accordingly; SVG has no
 *             wrapping at all, so lines are broken here from an estimated
 *             advance width. A long caption may break one word earlier or later
 *             than it did on screen.
 *   faces     the renderer uses whatever fonts the server has installed. A web
 *             font the browser loaded is not automatically here, and the
 *             fallback is a system sans.
 *   emoji     stickers render in colour only if a colour emoji font is present;
 *             without one they come out as monochrome glyphs.
 *
 * All three are limits of rendering without a browser, listed so they are found
 * here rather than discovered in a print run.
 */

export interface PhotoResolver {
  /** Returns a data URI for a photo reference, or null if it cannot be read. */
  (src: string): Promise<string | null>;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Rotation about the object's own centre, matching how the editor rotates. */
function transformFor(object: CanvasObject): string {
  const parts = [`translate(${object.x} ${object.y})`];
  if (object.rotation) {
    parts.push(
      `rotate(${object.rotation} ${object.width / 2} ${object.height / 2})`,
    );
  }
  return parts.join(" ");
}

function backgroundMarkup(
  background: PageBackground,
  width: number,
  height: number,
): { defs: string; body: string } {
  switch (background.type) {
    case "transparent":
      return { defs: "", body: "" };

    case "solid":
      return {
        defs: "",
        body: `<rect width="${width}" height="${height}" fill="${escapeXml(background.color)}"/>`,
      };

    case "gradient": {
      // The editor's angle is measured like CSS `linear-gradient`: 0 points up.
      // SVG gradients run left to right, so the whole gradient is rotated.
      const id = "page-bg-gradient";
      return {
        defs: `<linearGradient id="${id}" gradientTransform="rotate(${background.angle - 90}, 0.5, 0.5)">
            <stop offset="0%" stop-color="${escapeXml(background.from)}"/>
            <stop offset="100%" stop-color="${escapeXml(background.to)}"/>
          </linearGradient>`,
        body: `<rect width="${width}" height="${height}" fill="url(#${id})"/>`,
      };
    }

    case "pattern": {
      const tile = patternDataUri(
        background.pattern as PatternId,
        background.foreground,
        background.background,
      );
      return {
        defs: "",
        body:
          `<rect width="${width}" height="${height}" fill="${escapeXml(background.background)}"/>` +
          `<image href="${escapeXml(tile)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>`,
      };
    }

    case "image":
      return {
        defs: "",
        body: `<image href="${escapeXml(background.src)}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`,
      };
  }
}

/**
 * Breaks a line to fit a box.
 *
 * Without a font engine the advance of a glyph can only be estimated; 0.52em is
 * a reasonable mean for the sans faces the editor offers. Deliberately
 * conservative — a line that wraps slightly early looks like a design choice,
 * one that overflows looks broken.
 */
function wrapText(text: string, width: number, fontSize: number): string[] {
  const perChar = fontSize * 0.52;
  const maxChars = Math.max(1, Math.floor(width / perChar));
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length <= maxChars || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }

  return lines;
}

function textMarkup(object: TextObject, index: number): { defs: string; body: string } {
  const anchor =
    object.align === "center" ? "middle" : object.align === "right" ? "end" : "start";
  const anchorX =
    object.align === "center"
      ? object.width / 2
      : object.align === "right"
        ? object.width
        : 0;

  let defs = "";
  let fill = escapeXml(object.fill);

  if (object.gradient) {
    const id = `text-gradient-${index}`;
    defs = `<linearGradient id="${id}" gradientTransform="rotate(${object.gradient.angle - 90}, 0.5, 0.5)">
        <stop offset="0%" stop-color="${escapeXml(object.gradient.from)}"/>
        <stop offset="100%" stop-color="${escapeXml(object.gradient.to)}"/>
      </linearGradient>`;
    fill = `url(#${id})`;
  }

  const lineHeight = object.fontSize * object.lineHeight;
  const lines = wrapText(object.text, object.width, object.fontSize);

  const attributes = [
    `x="${anchorX}"`,
    `y="${object.fontSize}"`,
    `font-family="${escapeXml(object.fontFamily)}, DejaVu Sans, sans-serif"`,
    `font-size="${object.fontSize}"`,
    `font-weight="${object.fontWeight}"`,
    `letter-spacing="${object.letterSpacing}"`,
    `text-anchor="${anchor}"`,
    `fill="${fill}"`,
    object.italic ? 'font-style="italic"' : "",
    object.stroke
      ? `stroke="${escapeXml(object.stroke)}" stroke-width="${object.strokeWidth ?? 0}" paint-order="stroke"`
      : "",
  ].filter(Boolean);

  const spans = lines
    .map(
      (line, lineIndex) =>
        `<tspan x="${anchorX}" dy="${lineIndex === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("");

  return { defs, body: `<text ${attributes.join(" ")}>${spans}</text>` };
}

async function objectMarkup(
  object: CanvasObject,
  index: number,
  resolvePhoto: PhotoResolver,
): Promise<{ defs: string; body: string }> {
  if (!object.visible) return { defs: "", body: "" };

  const open = `<g transform="${transformFor(object)}" opacity="${object.opacity}">`;
  const close = "</g>";

  switch (object.kind) {
    case "slot": {
      const clipId = `slot-clip-${index}`;
      const path = slotPathData(
        object.shape,
        object.width,
        object.height,
        object.cornerRadius,
      );

      let contents = `<path d="${path}" fill="${escapeXml(object.fill)}"/>`;

      if (object.photo) {
        const href = await resolvePhoto(object.photo.src);
        if (href) {
          // `cover` inside the slot, then the user's pan and zoom — the same
          // order the canvas applies them, so a nudged photo lands identically.
          contents +=
            `<g clip-path="url(#${clipId})">` +
            `<image href="${escapeXml(href)}" x="${object.photo.offsetX}" y="${object.photo.offsetY}"` +
            ` width="${object.width}" height="${object.height}"` +
            ` transform="scale(${object.photo.scale})" transform-origin="center"` +
            ` preserveAspectRatio="xMidYMid slice"/></g>`;
        }
      }

      if (object.borderWidth > 0) {
        contents += `<path d="${path}" fill="none" stroke="${escapeXml(object.borderColor)}" stroke-width="${object.borderWidth}"/>`;
      }

      return {
        defs: `<clipPath id="${clipId}"><path d="${path}"/></clipPath>`,
        body: open + contents + close,
      };
    }

    case "image": {
      const href = await resolvePhoto(object.src);
      if (!href) return { defs: "", body: "" };
      return {
        defs: "",
        body:
          open +
          `<image href="${escapeXml(href)}" width="${object.width}" height="${object.height}"` +
          ` rx="${object.cornerRadius}" preserveAspectRatio="xMidYMid slice"/>` +
          close,
      };
    }

    case "text": {
      const { defs, body } = textMarkup(object, index);
      return { defs, body: open + body + close };
    }

    case "sticker":
      // Emoji are text to SVG as well; the box height is the type size, the way
      // the canvas draws them.
      return {
        defs: "",
        body:
          open +
          `<text x="${object.width / 2}" y="${object.height * 0.82}" font-size="${object.height * 0.72}"` +
          ` text-anchor="middle" font-family="Noto Color Emoji, DejaVu Sans, sans-serif">${escapeXml(object.content)}</text>` +
          close,
      };

    case "shape": {
      const stroke = object.strokeWidth
        ? ` stroke="${escapeXml(object.stroke)}" stroke-width="${object.strokeWidth}"`
        : "";
      const body =
        object.shape === "ellipse"
          ? `<ellipse cx="${object.width / 2}" cy="${object.height / 2}" rx="${object.width / 2}" ry="${object.height / 2}" fill="${escapeXml(object.fill)}"${stroke}/>`
          : object.shape === "line"
            ? `<line x1="0" y1="${object.height / 2}" x2="${object.width}" y2="${object.height / 2}"${stroke || ` stroke="${escapeXml(object.stroke)}" stroke-width="1"`}/>`
            : `<rect width="${object.width}" height="${object.height}" rx="${object.cornerRadius}" fill="${escapeXml(object.fill)}"${stroke}/>`;
      return { defs: "", body: open + body + close };
    }
  }
}

/** Builds the page's SVG document at its design size. */
export async function renderPageSvg(
  page: CanvasPage,
  resolvePhoto: PhotoResolver,
): Promise<string> {
  const background = backgroundMarkup(page.background, page.width, page.height);

  const defs: string[] = [background.defs];
  const body: string[] = [background.body];

  // Array order is layer order: index 0 at the back.
  for (const [index, object] of page.objects.entries()) {
    const markup = await objectMarkup(object, index, resolvePhoto);
    if (markup.defs) defs.push(markup.defs);
    if (markup.body) body.push(markup.body);
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"` +
    ` width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}">` +
    `<defs>${defs.filter(Boolean).join("")}</defs>` +
    body.filter(Boolean).join("") +
    `</svg>`
  );
}
