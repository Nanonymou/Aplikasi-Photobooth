"use client";

import { useState } from "react";
import { Check, Loader2, Save } from "lucide-react";

import { Avatar } from "@/components/auth/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setMockProfile, useAccount } from "@/lib/auth/use-account";
import { NAME_MAX, nameProblem, saveProfile } from "@/lib/settings/profile";

/** How long "Tersimpan" stays up before the bar goes quiet again. */
const SAVED_MS = 2500;

function Row({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:pt-1.5">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {description && (
          <p className="text-muted-foreground text-xs">{description}</p>
        )}
      </div>
      <div className="w-full sm:w-64 sm:shrink-0">{children}</div>
    </div>
  );
}

/**
 * The profile form.
 *
 * Two fields and a face. The name is the only thing here that is actually
 * editable, which is worth being plain about rather than dressing up: an email
 * is the address a sign-in link is sent to, so changing it is a different
 * operation with its own proof, and a photo arrives with the upload control
 * that follows this task.
 *
 * Nothing commits until "Simpan". The bar tracks whether there is anything to
 * save and reflects saving → saved, so a mistyped name can be abandoned by
 * reverting rather than by saving twice. Save is mocked; the dirty tracking, the
 * validation, and the store update behind it are the real thing being built —
 * the top bar renames itself the moment a save lands.
 */
export function ProfileForm() {
  const profile = useAccount();

  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  // The server render has no profile yet, and neither does the first paint.
  if (!profile) {
    return (
      <div className="bg-card border-border text-muted-foreground flex items-center gap-2 rounded-xl border px-4 py-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Memuat profil…
      </div>
    );
  }

  // `null` means untouched, so the field follows the account until it is edited
  // — a save from another tab is not overwritten by a stale initial value.
  const value = name ?? profile.name;
  const problem = nameProblem(value);
  const dirty = value.trim() !== profile.name;

  async function save() {
    if (!dirty || problem || busy) return;

    setBusy(true);
    setFailed(false);
    try {
      const draft = { name: value.trim(), avatarUrl: profile!.avatarUrl ?? null };
      await saveProfile(draft);
      setMockProfile({ name: draft.name });
      setName(null);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), SAVED_MS);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const status = failed
    ? "Perubahan gagal disimpan. Coba lagi."
    : problem && dirty
      ? problem
      : dirty
        ? "Ada perubahan yang belum disimpan."
        : justSaved
          ? "Perubahan tersimpan."
          : "Profil tersimpan.";

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-card border-border rounded-xl border">
        <div className="border-border border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Identitas</h2>
          <p className="text-muted-foreground text-xs">
            Bagaimana kamu dikenali di karya dan tautan yang kamu bagikan.
          </p>
        </div>

        <div className="divide-border flex flex-col divide-y">
          <Row
            label="Foto"
            description="Dipakai di menu akun dan daftar karya."
          >
            <div className="flex items-center gap-3">
              <Avatar profile={profile} className="size-12 text-sm" />
              <p className="text-muted-foreground text-xs">
                {profile.avatarUrl
                  ? "Diambil dari akun yang kamu pakai untuk masuk."
                  : "Belum ada foto — inisial namamu dipakai sebagai gantinya."}
              </p>
            </div>
          </Row>

          <Row
            label="Nama tampilan"
            htmlFor="profile-name"
            description="Muncul di menu akun dan di slideshow acara."
          >
            <Input
              id="profile-name"
              value={value}
              maxLength={NAME_MAX + 1}
              aria-invalid={dirty && problem ? true : undefined}
              aria-describedby={dirty && problem ? "profile-name-error" : undefined}
              onChange={(event) => {
                setJustSaved(false);
                setFailed(false);
                setName(event.target.value);
              }}
            />
            {dirty && problem && (
              <p id="profile-name-error" className="text-destructive mt-1.5 text-xs">
                {problem}
              </p>
            )}
          </Row>

          <Row
            label="Email"
            description="Alamat tempat tautan masuk dikirim."
          >
            <Input value={profile.email} readOnly disabled />
            <p className="text-muted-foreground mt-1.5 text-xs">
              Mengganti email berarti membuktikan kamu memegang alamat yang baru,
              jadi itu alur tersendiri — belum tersedia di sini.
            </p>
          </Row>
        </div>
      </section>

      <div className="bg-card border-border sticky bottom-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <p
          role="status"
          className={failed ? "text-destructive text-xs" : "text-muted-foreground text-xs"}
        >
          {status}
        </p>

        <div className="flex items-center gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setName(null);
                setFailed(false);
              }}
              disabled={busy}
            >
              Batalkan
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={!dirty || busy || !!problem}>
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : justSaved ? (
              <Check />
            ) : (
              <Save />
            )}
            Simpan
          </Button>
        </div>
      </div>
    </div>
  );
}
