"use client";

import type { ReactNode } from "react";

import { Slider } from "@/components/ui/slider";

/**
 * The field primitives editor panels share.
 *
 * Panels are mostly the same handful of rows — a titled group, a labelled
 * slider, a colour well — so they live here rather than being re-typed with
 * slightly different spacing in each panel.
 */

export function PanelSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs">{label}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {Math.round(value)}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => onChange(next)}
        aria-label={label}
      />
    </div>
  );
}

/**
 * A colour row: the native picker for precision, plus the hex, because reading
 * back what a swatch actually is beats guessing from a 20px square.
 */
export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-[11px] tabular-nums uppercase">
          {value}
        </span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="border-editor-border size-7 cursor-pointer rounded border bg-transparent"
        />
      </div>
    </div>
  );
}
