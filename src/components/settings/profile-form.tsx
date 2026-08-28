"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";

import { Avatar } from "@/components/auth/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshAccount, useAccount } from "@/lib/auth/use-account";
import { toast } from "@/store/toast-store";
import {
  NAME_MAX,
  nameProblem,
  readAvatarFile,
  saveProfile,
} from "@/lib/settings/profile";

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
      {/* One width for every row, wide enough that the photo controls sit on a
          single line — rows whose controls start at different x read as three
          little forms rather than one. */}
      <div className="w-full sm:w-80 sm:shrink-0">{children}</div>
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
  // Same `null`-means-untouched rule as the name: the picture follows the
  // account until somebody actually picks one. A cleared photo is `null` too,
  // which is why the two are told apart by a separate flag rather than by value.
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoTouched, setPhotoTouched] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const avatarUrl = photoTouched ? photo : (profile.avatarUrl ?? null);
  const dirty =
    value.trim() !== profile.name || avatarUrl !== (profile.avatarUrl ?? null);

  /** What the avatar and the preview both read from, so they cannot disagree. */
  const preview = { ...profile, avatarUrl };

  async function pick(file: File | undefined) {
    if (!file) return;

    setJustSaved(false);
    setFailed(false);
    setPhotoError(null);
    setReading(true);

    const result = await readAvatarFile(file);
    setReading(false);

    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }

    setPhoto(result.dataUrl);
    setPhotoTouched(true);
  }

  function clearPhoto() {
    setJustSaved(false);
    setPhotoError(null);
    setPhoto(null);
    setPhotoTouched(true);
  }

  async function save() {
    if (!dirty || problem || busy) return;

    setBusy(true);
    setFailed(false);
    try {
      const draft = { name: value.trim(), avatarUrl };
      await saveProfile(draft);
      // Re-read rather than patch the store locally: the server is the one that
      // knows what was stored, including the avatar key it minted.
      await refreshAccount();
      setName(null);
      setPhoto(null);
      setPhotoTouched(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), SAVED_MS);

      // Two confirmations, doing two jobs: the bar says the form is clean and
      // stays that way, the toast says *something just happened* and leaves.
      // Only the second one is noticeable if you were looking at the photo
      // rather than at the button you pressed.
      toast({
        variant: "success",
        title: "Profil tersimpan",
        description: draft.name,
      });
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
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void pick(event.dataTransfer.files[0]);
              }}
              className="flex items-center gap-3"
            >
              <Avatar profile={preview} className="size-14 text-sm" />

              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={reading}
                  >
                    {reading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <ImagePlus />
                    )}
                    {avatarUrl ? "Ganti foto" : "Pilih foto"}
                  </Button>

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearPhoto}
                      disabled={reading}
                    >
                      <Trash2 />
                      Hapus
                    </Button>
                  )}
                </div>

                <p
                  className={
                    photoError
                      ? "text-destructive text-xs"
                      : "text-muted-foreground text-xs"
                  }
                >
                  {photoError ??
                    (avatarUrl
                      ? "Dipotong persegi dari tengah, seperti yang terlihat."
                      : "Seret gambar ke sini atau pilih berkas — inisial namamu dipakai sampai ada foto.")}
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                void pick(event.target.files?.[0]);
                // Cleared so picking the same file twice still fires a change.
                event.target.value = "";
              }}
            />
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
                setPhoto(null);
                setPhotoTouched(false);
                setPhotoError(null);
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
              <Check className="settings-confirm" />
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
