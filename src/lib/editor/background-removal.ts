/**
 * Local stand-in for the AI background remover.
 *
 * It samples the four corners, assumes they are background, and clears pixels
 * close to that colour. That is nowhere near a real segmentation model — it has
 * no idea what a person is — but it produces a genuine transparent PNG so the
 * whole flow (progress, result, revert, export with alpha) can be built and
 * tried before the provider call exists.
 */

/** How far a pixel may sit from the sampled background and still be cleared. */
const DEFAULT_TOLERANCE = 48;

/** Feather width, in tolerance units, so cut edges are not hard-aliased. */
const FEATHER = 24;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Gambar tidak bisa dimuat."));
    image.src = src;
  });
}

function distance(
  data: Uint8ClampedArray,
  index: number,
  reference: [number, number, number],
): number {
  const dr = data[index] - reference[0];
  const dg = data[index + 1] - reference[1];
  const db = data[index + 2] - reference[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export async function removeBackgroundApprox(
  src: string,
  tolerance: number = DEFAULT_TOLERANCE,
): Promise<string> {
  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("Ukuran gambar tidak terbaca.");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Kanvas tidak tersedia.");

  context.drawImage(image, 0, 0);
  const frame = context.getImageData(0, 0, width, height);
  const { data } = frame;

  // Average of the four corners, so a single odd pixel cannot skew the estimate.
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + (width - 1)) * 4,
  ];
  const reference: [number, number, number] = [0, 0, 0];
  for (const corner of corners) {
    reference[0] += data[corner] / corners.length;
    reference[1] += data[corner + 1] / corners.length;
    reference[2] += data[corner + 2] / corners.length;
  }

  for (let index = 0; index < data.length; index += 4) {
    const delta = distance(data, index, reference);

    if (delta <= tolerance) {
      data[index + 3] = 0;
    } else if (delta <= tolerance + FEATHER) {
      // Ramp the alpha across the feather band instead of a hard cut.
      data[index + 3] = Math.round(
        data[index + 3] * ((delta - tolerance) / FEATHER),
      );
    }
  }

  context.putImageData(frame, 0, 0);
  // PNG, not JPEG: the whole point is keeping the alpha channel.
  return canvas.toDataURL("image/png");
}
