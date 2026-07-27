/** A frame grabbed in the photo session, and where it landed on the canvas. */
export interface CapturedShot {
  id: string;
  /** Data URL from the webcam, or a sample asset path in demo mode. */
  src: string;
  takenAt: string;
  /** True when the shot came from demo mode rather than a real camera. */
  demo: boolean;
  /** Slot the shot was placed into, or null if every slot was already full. */
  slotId: string | null;
  slotName: string | null;
}
