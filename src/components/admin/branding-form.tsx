"use client";

import { useState } from "react";
import { Aperture, ArrowRight, Check, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  accentColor,
  ACCENT_OPTIONS,
  DEFAULT_BRANDING,
  isValidPin,
  PIN_LENGTH,
  saveBranding,
  type AccentId,
  type EventBranding,
} from "@/lib/admin/branding";
import { cn } from "@/lib/utils";

/**
 * A shrunk kiosk attract screen that mirrors the form live.
 *
 * The point of a branding page is seeing the result, so this shows exactly what a
 * guest will — event name, tagline, accent on the mark and the start button —
 * updating on every keystroke. It is a preview, so the accent is scoped to inline
 * styles here rather than retheming the app.
 */
function KioskPreview({ branding }: { branding: EventBranding }) {
  const color = accentColor(branding.accent);
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="border-border text-muted-foreground border-b px-3 py-2 text-xs font-medium">
        Pratinjau layar sambut
      </div>
      <div className="flex aspect-video flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        <span
          className="flex size-10 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: color }}
        >
          <Aperture className="size-5" />
        </span>
        <p
          className="text-[11px] font-semibold tracking-wide uppercase"
          style={{ color }}
        >
          Photobooth
        </p>
        <p className="text-lg leading-tight font-semibold tracking-tight text-balance">
          {branding.eventName || "Nama acara"}
        </p>
        <p className="text-muted-foreground text-xs text-pretty">
          {branding.tagline || "Tagline acara muncul di sini."}
        </p>
        <span
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          Ketuk untuk mulai
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

/**
 * The event-branding form.
 *
 * Edits the face the booth wears — name, tagline, accent, exit PIN — beside a
 * live preview of the kiosk it feeds. Nothing commits until "Simpan"; the sticky
 * bar tracks whether there is anything to save and blocks a save while the PIN is
 * malformed, since that is the one field with a rule guests depend on. Save is
 * mocked; the dirty tracking and preview are the real build.
 */
export function BrandingForm() {
  const [branding, setBranding] = useState<EventBranding>(DEFAULT_BRANDING);
  const [baseline, setBaseline] = useState<EventBranding>(DEFAULT_BRANDING);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = JSON.stringify(branding) !== JSON.stringify(baseline);
  const pinOk = isValidPin(branding.exitPin);
  const canSave = dirty && pinOk && !busy;

  function set<K extends keyof EventBranding>(key: K, value: EventBranding[K]) {
    setJustSaved(false);
    setBranding((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!canSave) return;
    setBusy(true);
    await saveBranding(branding);
    setBaseline(branding);
    setBusy(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const status = dirty
    ? "Ada perubahan yang belum disimpan."
    : justSaved
      ? "Branding tersimpan."
      : "Semua tersimpan.";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="brand-event">
              Nama acara
            </label>
            <Input
              id="brand-event"
              value={branding.eventName}
              onChange={(event) => set("eventName", event.target.value)}
              placeholder="mis. Pernikahan Dewi & Rangga"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="brand-tagline">
              Tagline
            </label>
            <Textarea
              id="brand-tagline"
              value={branding.tagline}
              onChange={(event) => set("tagline", event.target.value)}
              rows={2}
              placeholder="Kalimat sambutan singkat untuk tamu."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Warna aksen</span>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((option) => {
                const active = branding.accent === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => set("accent", option.id as AccentId)}
                    aria-pressed={active}
                    aria-label={option.label}
                    title={option.label}
                    className={cn(
                      "focus-visible:ring-ring/50 size-8 rounded-full outline-none focus-visible:ring-[3px]",
                      active
                        ? "ring-foreground ring-2 ring-offset-2 ring-offset-card"
                        : "ring-border ring-1",
                    )}
                    style={{ backgroundColor: option.color }}
                  />
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="brand-pin">
              PIN keluar kiosk
            </label>
            <Input
              id="brand-pin"
              inputMode="numeric"
              maxLength={PIN_LENGTH}
              value={branding.exitPin}
              onChange={(event) =>
                set("exitPin", event.target.value.replace(/\D/g, ""))
              }
              className="w-28 tracking-[0.3em]"
            />
            <p
              className={
                branding.exitPin.length > 0 && !pinOk
                  ? "text-destructive text-[11px]"
                  : "text-muted-foreground text-[11px]"
              }
            >
              {PIN_LENGTH} angka. Penyelenggara memakainya untuk keluar dari mode
              kiosk.
            </p>
          </div>
        </div>

        <KioskPreview branding={branding} />
      </div>

      <div className="bg-card border-border sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {justSaved && !dirty && (
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          {status}
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBranding(baseline)}
            disabled={!dirty || busy}
          >
            Batalkan
          </Button>
          <Button size="sm" onClick={save} disabled={!canSave}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            Simpan branding
          </Button>
        </div>
      </div>
    </div>
  );
}
