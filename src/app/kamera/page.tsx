import type { Metadata } from "next";

import { CameraStudio } from "@/components/camera/camera-studio";

export const metadata: Metadata = {
  title: "Sesi Foto — FrameStudio AI",
};

export default function CameraPage() {
  return <CameraStudio />;
}
