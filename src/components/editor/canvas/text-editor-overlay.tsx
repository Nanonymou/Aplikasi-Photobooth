"use client";

import { useEffect, useRef, useState } from "react";

import { resolveFontFamily } from "@/lib/editor/fonts";
import type { TextObject } from "@/types/editor";

/**
 * Inline editor for a text object.
 *
 * A real `<textarea>` laid over the canvas at the object's on-screen position
 * and scale — Konva has no text input of its own, and reusing the browser's
 * gives caret, selection, IME and mobile keyboards for free.
 */
export function TextEditorOverlay({
  object,
  zoom,
  offsetX,
  offsetY,
  onCommit,
  onCancel,
}: {
  object: TextObject;
  zoom: number;
  /** Stage translation of the page group, in screen px. */
  offsetX: number;
  offsetY: number;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(object.text);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.focus();
    element.select();
  }, []);

  const fontSize = object.fontSize * zoom;

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(event) => {
        // Enter inserts a line break, so committing needs a modifier.
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onCommit(value);
        }
        // The editor owns the keyboard while it is open.
        event.stopPropagation();
      }}
      aria-label={`Sunting ${object.name}`}
      spellCheck={false}
      className="border-primary absolute z-10 resize-none overflow-hidden rounded border-2 bg-transparent p-0 outline-none"
      style={{
        left: offsetX + object.x * zoom,
        top: offsetY + object.y * zoom,
        width: object.width * zoom,
        height: Math.max(fontSize * object.lineHeight, object.height * zoom),
        transform: object.rotation
          ? `rotate(${object.rotation}deg)`
          : undefined,
        transformOrigin: "center",
        fontFamily: resolveFontFamily(object.fontFamily),
        fontSize,
        fontWeight: object.fontWeight,
        fontStyle: object.italic ? "italic" : "normal",
        letterSpacing: object.letterSpacing * zoom,
        lineHeight: object.lineHeight,
        textAlign: object.align,
        color: object.fill,
      }}
    />
  );
}
