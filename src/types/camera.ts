/** A frame grabbed in the photo session, before it is placed into a slot. */
export interface CapturedShot {
  id: string;
  /** Data URL from the webcam, or a sample asset path in demo mode. */
  src: string;
  takenAt: string;
  /** True when the shot came from demo mode rather than a real camera. */
  demo: boolean;
}
