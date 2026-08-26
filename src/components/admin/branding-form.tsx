"use client";

import { useState } from "react";
import {
  Aperture,
  ArrowRight,
  Check,
  KeyRound,
  Loader2,
  Save,
  ShieldOff,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  accentColor,
  ACCENT_OPTIONS,
  fieldProblem,
  isValidPin,
  MAX_EVENT_NAME,
  MAX_TAGLINE,
  PIN_LENGTH,
  saveBranding,
  type AccentId,
  type BrandingFields,
  type BrandingState,
  type PinIntent,
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
function KioskPreview({ fields }: { fields: BrandingFields }) {
  const color = accentColor(fields.accent);
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
          {fields.eventName || "Nama acara"}
        </p>
        <p className="text-muted-foreground text-xs text-pretty">
          {fields.tagline || "Tagline acara muncul di sini."}
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

/** Character count, shown only once it is worth watching. */
function Counter({ value, max }: { value: string; max: number }) {
  const length = value.trim().length;
  if (length < max * 0.8) return null;

  return (
    <span
      className={cn(
        "text-[11px] tabular-nums",
        length > max ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {length} / {max}
    </span>
  );
}

/**
 * The exit PIN, which can be set or removed but never read back.
 *
 * Three states rather than a text field, because the stored value does not
 * exist as far as this screen is concerned: a form that showed four dots where
 * a PIN "is" would be inventing one, and one that showed an empty box would
 * imply no PIN is set. So the screen says what it knows — set or not — and asks
 * for an intention.
 */
function PinField({
  pinSet,
  intent,
  onIntent,
}: {
  pinSet: boolean;
  intent: PinIntent;
  onIntent: (intent: PinIntent) => void;
}) {
  const typed = intent.kind === "set" ? intent.pin : "";
  const malformed = intent.kind === "set" && typed.length > 0 && !isValidPin(typed);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">PIN keluar kiosk</span>

      {intent.kind === "keep" && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 text-xs",
              pinSet ? "text-muted-foreground" : "text-destructive",
            )}
          >
            {pinSet ? (
              <>
                <KeyRound className="size-3.5" />
                PIN sudah diatur.
              </>
            ) : (
              <>
                <ShieldOff className="size-3.5" />
                Belum ada PIN — tamu bisa keluar dari mode kiosk.
              </>
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onIntent({ kind: "set", pin: "" })}
          >
            {pinSet ? "Ganti PIN" : "Atur PIN"}
          </Button>
          {pinSet && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onIntent({ kind: "clear" })}
            >
              Hapus PIN
            </Button>
          )}
        </div>
      )}

      {intent.kind === "set" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Input
              id="brand-pin"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_LENGTH}
              value={typed}
              aria-label="PIN baru"
              aria-invalid={malformed || undefined}
              onChange={(event) =>
                onIntent({
                  kind: "set",
                  pin: event.target.value.replace(/\D/g, ""),
                })
              }
              className="w-28 tracking-[0.3em]"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onIntent({ kind: "keep" })}
            >
              Batal
            </Button>
          </div>
          <p
            className={cn(
              "text-[11px]",
              malformed ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {PIN_LENGTH} angka. Penyelenggara memakainya untuk keluar dari mode
            kiosk; PIN lama tidak bisa dilihat lagi.
          </p>
        </div>
      )}

      {intent.kind === "clear" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-destructive flex items-center gap-1.5 text-xs">
            <ShieldOff className="size-3.5" />
            PIN akan dihapus saat disimpan — siapa pun bisa keluar dari kiosk.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onIntent({ kind: "keep" })}
          >
            Batal
          </Button>
        </div>
      )}
    </div>
  );
}

function formatSaved(iso: string, by: string | null): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime()) || when.getTime() === 0) {
    return "Belum pernah diubah.";
  }

  const stamp = when.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return by ? `Terakhir diubah ${stamp} oleh ${by}.` : `Terakhir diubah ${stamp}.`;
}

/**
 * The event-branding form.
 *
 * Edits the face the booth wears, beside a live preview of the kiosk it feeds.
 * Nothing commits until "Simpan": the sticky bar tracks whether there is
 * anything to save and refuses one the server would reject anyway, so a typo
 * comes back as a red line under the field rather than a round trip.
 *
 * The stored values arrive as a prop from the server rather than through a fetch
 * on mount, so the form is never briefly wrong — this row is what a booth shows
 * a room full of people, and a page that flashes a placeholder event name at the
 * person about to check it is worse than a page that takes a moment.
 */
export function BrandingForm({ initial }: { initial: BrandingState }) {
  const [fields, setFields] = useState<BrandingFields>({
    eventName: initial.eventName,
    tagline: initial.tagline,
    accent: initial.accent,
  });
  const [baseline, setBaseline] = useState<BrandingFields>(fields);
  const [pinSet, setPinSet] = useState(initial.pinSet);
  const [pin, setPin] = useState<PinIntent>({ kind: "keep" });
  const [saved, setSaved] = useState({
    at: initial.updatedAt,
    by: initial.updatedBy,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const copyDirty = JSON.stringify(fields) !== JSON.stringify(baseline);
  const pinDirty = pin.kind !== "keep";
  const dirty = copyDirty || pinDirty;

  const problem =
    fieldProblem(fields) ??
    (pin.kind === "set" && !isValidPin(pin.pin)
      ? `PIN harus ${PIN_LENGTH} angka.`
      : null);

  const canSave = dirty && problem === null && !busy;

  function set<K extends keyof BrandingFields>(key: K, value: BrandingFields[K]) {
    setJustSaved(false);
    setError(null);
    setFields((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    if (!canSave) return;

    setBusy(true);
    setError(null);
    const result = await saveBranding(fields, pin);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // The row comes back from the write, so the form reflects what was stored —
    // trimmed copy included — rather than what was typed.
    const stored = result.branding;
    const next: BrandingFields = {
      eventName: stored.eventName,
      tagline: stored.tagline,
      accent: stored.accent,
    };
    setFields(next);
    setBaseline(next);
    setPinSet(stored.pinSet);
    setPin({ kind: "keep" });
    setSaved({ at: stored.updatedAt, by: saved.by });
    setJustSaved(true);
  }

  function reset() {
    setFields(baseline);
    setPin({ kind: "keep" });
    setError(null);
  }

  const status = error
    ? error
    : problem && dirty
      ? problem
      : dirty
        ? "Ada perubahan yang belum disimpan."
        : justSaved
          ? "Branding tersimpan."
          : formatSaved(saved.at, saved.by);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border-border bg-card flex flex-col gap-5 rounded-xl border p-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="brand-event">
                Nama acara
              </label>
              <Counter value={fields.eventName} max={MAX_EVENT_NAME} />
            </div>
            <Input
              id="brand-event"
              value={fields.eventName}
              onChange={(event) => set("eventName", event.target.value)}
              placeholder="mis. Pernikahan Dewi & Rangga"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label className="text-sm font-medium" htmlFor="brand-tagline">
                Tagline
              </label>
              <Counter value={fields.tagline} max={MAX_TAGLINE} />
            </div>
            <Textarea
              id="brand-tagline"
              value={fields.tagline}
              onChange={(event) => set("tagline", event.target.value)}
              rows={2}
              placeholder="Kalimat sambutan singkat untuk tamu."
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Warna aksen</span>
            <div className="flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((option) => {
                const active = fields.accent === option.id;
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

          <PinField
            pinSet={pinSet}
            intent={pin}
            onIntent={(next) => {
              setJustSaved(false);
              setError(null);
              setPin(next);
            }}
          />
        </div>

        <KioskPreview fields={fields} />
      </div>

      <div className="bg-card border-border sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg">
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs",
            error || (problem && dirty)
              ? "text-destructive"
              : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {(error || (problem && dirty)) && (
            <TriangleAlert className="size-3.5 shrink-0" />
          )}
          {justSaved && !dirty && !error && (
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          {status}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reset} disabled={!dirty || busy}>
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
