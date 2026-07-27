/**
 * Custom MIME type for dragging a library item onto the canvas.
 *
 * A private type rather than `text/plain` so the canvas can tell a sticker drag
 * apart from a file drop or text dragged in from another app.
 */
export const STICKER_DRAG_TYPE = "application/x-framestudio-sticker";
