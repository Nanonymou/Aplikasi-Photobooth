/** Where a shot came from. */
export type ShotSource = "camera" | "upload" | "demo";

/** A frame collected in the photo session, and where it landed on the canvas. */
export interface CapturedShot {
  id: string;
  /** Data URL from the webcam or an upload, or a sample asset path in demo mode. */
  src: string;
  takenAt: string;
  source: ShotSource;
  /** Slot the shot was placed into, or null if every slot was already full. */
  slotId: string | null;
  slotName: string | null;
}
