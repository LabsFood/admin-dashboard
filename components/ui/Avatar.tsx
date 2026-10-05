"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { useMe } from "@/lib/api/me";
import {
  PHOTO_MAX_MB,
  checkPhoto,
  photoMessage,
  useRemoveAvatar,
  useUploadAvatar,
} from "@/lib/api/photos";

/* ─────────────────────────────────────────────────────────────────────────────
   La photo de profil, dans la console.

   Elle remplace les initiales partout où elles servaient d'identité, et se
   change depuis le menu du compte — là où l'on va déjà pour se déconnecter.
   ───────────────────────────────────────────────────────────────────────────── */

/** La pastille : la photo si elle existe, les initiales sinon. */
export function Avatar({
  url,
  name,
  className,
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
}) {
  if (url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={url}
        alt=""
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-navy font-bold text-white",
        className,
      )}
    >
      {name ? initials(name) : "AD"}
    </span>
  );
}

/** Le bloc qui se pose en tête du menu du compte. */
export function AvatarEditor({ role }: { role?: string }) {
  const me = useMe();
  const envoi = useUploadAvatar();
  const retrait = useRemoveAvatar();
  const champ = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const url = me.data?.avatarUrl ?? null;
  const occupe = envoi.isPending || retrait.isPending;

  function choisir(file: File | null) {
    setErreur(null);
    if (!file) return;
    const probleme = checkPhoto(file);
    if (probleme) {
      setErreur(probleme);
      return;
    }
    envoi.mutate(file, {
      onSuccess: () => {
        if (champ.current) champ.current.value = "";
      },
      onError: (e) => setErreur(photoMessage(e)),
    });
  }

  return (
    <div className="px-3 pb-2.5 pt-1">
      <div className="flex items-center gap-3">
        <span className="relative">
          <Avatar
            url={url}
            name={me.data?.fullName}
            className="h-12 w-12 text-sm"
          />
          {occupe && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-navy/60">
              <Loader2 className="h-4 w-4 animate-spin text-white" aria-hidden />
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy">
            {me.data?.fullName || "Mon compte"}
          </p>
          <p className="truncate text-[11px] text-ink-soft">{me.data?.email}</p>
          {role && (
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-terra">
              {role}
            </p>
          )}
        </div>
      </div>

      <input
        ref={champ}
        id="admin-avatar-file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => choisir(e.target.files?.[0] ?? null)}
      />

      <div className="mt-2.5 flex items-center gap-1.5">
        <label
          htmlFor="admin-avatar-file"
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-cream-soft px-2.5 py-1.5 text-[11px] font-semibold text-navy transition-colors hover:bg-cream-deep",
            occupe && "pointer-events-none opacity-50",
          )}
        >
          <Camera className="h-3 w-3" aria-hidden />
          {url ? "Changer" : "Ajouter une photo"}
        </label>

        {url && (
          <button
            type="button"
            onClick={() =>
              retrait.mutate(undefined, {
                onError: (e) => setErreur(photoMessage(e)),
              })
            }
            disabled={occupe}
            title="Retirer la photo"
            aria-label="Retirer la photo"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {erreur ? (
        <p role="alert" className="mt-1.5 text-[11px] leading-relaxed text-danger">
          {erreur}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
          JPG, PNG ou WebP, {PHOTO_MAX_MB} Mo au plus.
        </p>
      )}
    </div>
  );
}
