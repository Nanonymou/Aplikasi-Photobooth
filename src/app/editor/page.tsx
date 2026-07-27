import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/editor-shell";

export const metadata: Metadata = {
  title: "Editor — FrameStudio AI",
};

export default function EditorPage() {
  return <EditorShell />;
}
