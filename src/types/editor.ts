/**
 * Domain model for the FrameStudio canvas editor.
 *
 * Everything the editor renders lives inside an `EditorProject`: a project holds
 * ordered `CanvasPage`s (multi-page / photostrip), and each page holds an ordered
 * list of `CanvasObject`s. Array order IS the layer order — index 0 renders at the
 * back, the last item renders on top.
 */

/** Canvas interaction mode — how pointer input on the stage is interpreted. */
export type ToolId = "select" | "hand";

/** Left-rail panels. `null` means the rail is collapsed. */
export type PanelId =
  | "template"
  | "frame"
  | "photo"
  | "text"
  | "sticker"
  | "background"
  | "ai"
  | "layers";

/** Shapes a photo slot can be cut to. */
export type SlotShape =
  | "rect"
  | "circle"
  | "heart"
  | "hexagon"
  | "diamond"
  | "polaroid"
  | "star";

export type ObjectKind = "slot" | "image" | "text" | "sticker" | "shape";

export type PageOrientation = "portrait" | "landscape";

/** Geometry + presentation shared by every object on the canvas. */
export interface BaseObject {
  id: string;
  kind: ObjectKind;
  /** Human label shown in the layers panel. */
  name: string;
  /** Top-left position in page coordinates (design px, not screen px). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, clockwise, around the object's centre. */
  rotation: number;
  /** 0–1. */
  opacity: number;
  locked: boolean;
  visible: boolean;
}

/** A photo taken with the webcam or uploaded, as placed inside a slot. */
export interface SlotPhoto {
  src: string;
  /** Pan of the photo within its slot, in design px. */
  offsetX: number;
  offsetY: number;
  /** Cover-scale multiplier; 1 = exactly fills the slot. */
  scale: number;
}

/** A cut-out in the frame that a photo drops into. */
export interface PhotoSlotObject extends BaseObject {
  kind: "slot";
  shape: SlotShape;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
  /** Placeholder fill shown while the slot is empty. */
  fill: string;
  photo: SlotPhoto | null;
}

/** A free-floating image (not bound to a slot). */
export interface ImageObject extends BaseObject {
  kind: "image";
  src: string;
  cornerRadius: number;
}

export interface TextObject extends BaseObject {
  kind: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  align: "left" | "center" | "right";
  fill: string;
}

export interface StickerObject extends BaseObject {
  kind: "sticker";
  /** Emoji or short glyph used for the stub sticker library. */
  content: string;
}

export interface ShapeObject extends BaseObject {
  kind: "shape";
  shape: "rect" | "ellipse" | "line";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export type CanvasObject =
  | PhotoSlotObject
  | ImageObject
  | TextObject
  | StickerObject
  | ShapeObject;

export type PageBackground =
  | { type: "solid"; color: string }
  | { type: "gradient"; from: string; to: string; angle: number }
  | { type: "image"; src: string };

export interface CanvasPage {
  id: string;
  name: string;
  /** Page size in design px. */
  width: number;
  height: number;
  background: PageBackground;
  objects: CanvasObject[];
}

export interface EditorProject {
  id: string;
  title: string;
  pages: CanvasPage[];
  /** ISO timestamp of the last mutation. */
  updatedAt: string;
}

export function pageOrientation(page: CanvasPage): PageOrientation {
  return page.width >= page.height ? "landscape" : "portrait";
}
