"use client";

import { useState, type ReactNode } from "react";
import { Check, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DEFAULT_SETTINGS,
  EXPORT_QUALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  RETENTION_MAX,
  RETENTION_MIN,
  saveSettings,
  type SystemSettings,
} from "@/lib/admin/settings";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-card border-border rounded-xl border">
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      <div className="divide-border flex flex-col divide-y">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * The system-settings form.
 *
 * Booth-wide switches grouped by concern, each an immediate edit to local state.
 * Nothing commits until "Simpan" — the sticky bar tracks whether there is
 * anything to save and reflects saving → saved — so an admin can flip several
 * knobs and commit once. Save is mocked (`saveSettings`); the dirty tracking and
 * the bar are the real thing being built.
 */
export function SettingsForm() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [baseline, setBaseline] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = JSON.stringify(settings) !== JSON.stringify(baseline);

  function set<K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) {
    setJustSaved(false);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    await saveSettings(settings);
    setBaseline(settings);
    setBusy(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  const status = dirty
    ? "Ada perubahan yang belum disimpan."
    : justSaved
      ? "Perubahan tersimpan."
      : "Semua pengaturan tersimpan.";

  return (
    <div className="flex flex-col gap-4">
      <Section title="Umum">
        <Field
          label="Nama brand"
          htmlFor="set-brand"
          description="Muncul di editor, ekspor, dan halaman bagikan."
        >
          <Input
            id="set-brand"
            value={settings.brandName}
            onChange={(event) => set("brandName", event.target.value)}
            className="sm:w-56"
          />
        </Field>

        <Field label="Bahasa default" description="Untuk pengguna baru.">
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.language}
            onValueChange={(value) =>
              value && set("language", value as SystemSettings["language"])
            }
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.id} value={option.id}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </Section>

      <Section title="Sesi tamu">
        <Field
          label="Izinkan sesi tamu"
          description="Pakai booth tanpa akun."
        >
          <Switch
            checked={settings.allowGuest}
            onCheckedChange={(value) => set("allowGuest", value)}
            aria-label="Izinkan sesi tamu"
          />
        </Field>

        <Field
          label="Retensi karya tamu"
          description="Berapa lama karya tamu disimpan di perangkat."
        >
          <div className="flex items-center gap-3 sm:w-56">
            <Slider
              min={RETENTION_MIN}
              max={RETENTION_MAX}
              step={1}
              value={[settings.guestRetentionDays]}
              onValueChange={([value]) => set("guestRetentionDays", value)}
              disabled={!settings.allowGuest}
              aria-label="Retensi karya tamu (hari)"
            />
            <span className="text-muted-foreground w-16 shrink-0 text-right text-sm tabular-nums">
              {settings.guestRetentionDays} hari
            </span>
          </div>
        </Field>
      </Section>

      <Section title="Ekspor">
        <Field
          label="Kualitas ekspor default"
          description="Dipakai saat pengguna belum memilih."
        >
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.exportQuality}
            onValueChange={(value) =>
              value &&
              set("exportQuality", value as SystemSettings["exportQuality"])
            }
          >
            {EXPORT_QUALITY_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.id} value={option.id}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </Section>

      <Section title="Keamanan">
        <Field
          label="Izinkan pendaftaran"
          description="Matikan untuk menutup pendaftaran akun baru. Yang sudah punya akun tetap bisa masuk."
        >
          <Switch
            checked={settings.allowRegistration}
            onCheckedChange={(value) => set("allowRegistration", value)}
            aria-label="Izinkan pendaftaran"
          />
        </Field>
      </Section>

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
            onClick={() => setSettings(baseline)}
            disabled={!dirty || busy}
          >
            Batalkan
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            Simpan perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
