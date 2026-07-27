/**
 * Longest edge kept when grabbing a frame.
 *
 * Captures are stored as data URLs inside the project, which autosave writes to
 * localStorage — a handful of full 1080p frames would blow the ~5 MB quota. This
 * still leaves plenty of detail for a photostrip print.
 */
export const CAPTURE_MAX_EDGE = 1600;

const CAPTURE_QUALITY = 0.88;

export interface CaptureOptions {
  /**
   * Flip the frame horizontally to match a mirrored preview.
   *
   * A photobooth should save what the subject saw: if the preview is mirrored,
   * the photo is too, otherwise text and poses come out reversed from what they
   * were framing.
   */
  mirror?: boolean;
  maxEdge?: number;
}

/**
 * Grabs the current video frame as a JPEG data URL, downscaled so the long edge
 * is at most `maxEdge`. Returns null before the stream has produced dimensions.
 */
export function captureFrame(
  video: HTMLVideoElement,
  { mirror = false, maxEdge = CAPTURE_MAX_EDGE }: CaptureOptions = {},
): string | null {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return null;

  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  if (mirror) {
    context.translate(width, 0);
    context.scale(-1, 1);
  }

  context.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
}
