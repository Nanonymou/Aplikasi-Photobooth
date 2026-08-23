"use client";

import { Frame, RotateCcw } from "lucide-react";

import {
  ColorField,
  PanelSection,
  SliderField,
} from "@/components/editor/panels/panel-fields";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useActivePage, useEditorStore } from "@/store/editor-store";
import type { PhotoSlotObject, SlotShadow } from "@/types/editor";

/** What a shadow starts as when it is switched on. */
const DEFAULT_SHADOW: SlotShadow = {
  blur: 24,
  offsetX: 0,
  offsetY: 12,
  color: "#0f172a",
  opacity: 0.3,
};

/**
 * Live adjustment of existing frames.
 *
 * The layout controls above build slots; this section styles the ones already on
 * the page — border, corners, fill, shadow — and every change lands on the
 * canvas immediately, because judging a border weight from a number is hopeless.
 *
 * Like the filter panel, it aims at the selected slots, or at the whole page when
 * nothing is selected: a photostrip's frames are meant to match, so styling them
 * one at a time is the exception, not the default.
 */
export function FrameAdjust() {
  const page = useActivePage();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const updateObjects = useEditorStore((state) => state.updateObjects);
  const beginInteraction = useEditorStore((state) => state.beginInteraction);
  const endInteraction = useEditorStore((state) => state.endInteraction);

  const slots = page.objects.filter(
    (object): object is PhotoSlotObject => object.kind === "slot",
  );
  const selected = slots.filter((slot) => selectedIds.includes(slot.id));
  const targets = selected.length > 0 ? selected : slots;
  const lead = targets[0];

  if (!lead) {
    return (
      <PanelSection title="Penyesuaian bingkai">
        <p className="border-editor-border text-muted-foreground rounded-lg border border-dashed p-3 text-[11px] leading-relaxed">
          Belum ada slot di halaman ini. Terapkan tata letak dulu.
        </p>
      </PanelSection>
    );
  }

  /**
   * Slider drags fire continuously, so the whole gesture is wrapped in one
   * interaction — otherwise a single drag would leave a hundred undo steps.
   */
  function patch(next: Partial<PhotoSlotObject>) {
    beginInteraction();
    updateObjects(targets.map((slot) => ({ id: slot.id, patch: next })));
    endInteraction();
  }

  const shadow = lead.shadow;

  return (
    <>
      <PanelSection
        title="Penyesuaian bingkai"
        action={
          <span className="text-muted-foreground text-[10px]">
            {selected.length > 0
              ? `${targets.length} terpilih`
              : `semua (${targets.length})`}
          </span>
        }
      >
        <SliderField
          label="Tebal bingkai"
          value={lead.borderWidth}
          min={0}
          max={60}
          onChange={(borderWidth) => patch({ borderWidth })}
        />
        <ColorField
          label="Warna bingkai"
          value={lead.borderColor}
          onChange={(borderColor) => patch({ borderColor })}
        />
        <SliderField
          label="Sudut membulat"
          value={lead.cornerRadius}
          min={0}
          max={200}
          onChange={(cornerRadius) => patch({ cornerRadius })}
        />
        <ColorField
          label="Warna isi kosong"
          value={lead.fill}
          onChange={(fill) => patch({ fill })}
        />
      </PanelSection>

      <Separator />

      <PanelSection
        title="Bayangan"
        action={
          <Switch
            checked={Boolean(shadow)}
            onCheckedChange={(on) =>
              patch({ shadow: on ? DEFAULT_SHADOW : undefined })
            }
            aria-label="Aktifkan bayangan"
          />
        }
      >
        {shadow ? (
          <>
            <SliderField
              label="Kelembutan"
              value={shadow.blur}
              min={0}
              max={120}
              onChange={(blur) => patch({ shadow: { ...shadow, blur } })}
            />
            <SliderField
              label="Jarak turun"
              value={shadow.offsetY}
              min={-60}
              max={60}
              onChange={(offsetY) => patch({ shadow: { ...shadow, offsetY } })}
            />
            <SliderField
              label="Kepekatan"
              value={shadow.opacity * 100}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) =>
                patch({ shadow: { ...shadow, opacity: value / 100 } })
              }
            />
            <ColorField
              label="Warna bayangan"
              value={shadow.color}
              onChange={(color) => patch({ shadow: { ...shadow, color } })}
            />
          </>
        ) : (
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Bayangan mati. Nyalakan untuk mengangkat bingkai dari latar.
          </p>
        )}
      </PanelSection>

      <Separator />

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          patch({
            borderWidth: 0,
            cornerRadius: 0,
            shadow: undefined,
          })
        }
      >
        <RotateCcw />
        Kembalikan ke polos
      </Button>

      <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
        <Frame className="mt-0.5 size-3 shrink-0" />
        Pilih satu slot di kanvas untuk menyetelnya sendiri; tanpa pilihan,
        perubahan berlaku untuk semua slot di halaman ini.
      </p>
    </>
  );
}
