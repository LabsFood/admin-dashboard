"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";
import { adminErrorMessage } from "./errors";

/* ─────────────────────────────────────────────────────────────────────────────
   L'envoi d'une photo, partout pareil.

   Trois appels, et le fichier ne passe jamais par l'API :

     1. `POST …/photo/upload-url` avec le type et la taille. Réponse : une `url`
        privée valable 15 minutes et un `uploadId`.
     2. `PUT` du fichier vers cette url, avec les en-têtes donnés. Sa longueur
        doit valoir **exactement** `sizeBytes` : le stockage refuse le reste par
        un 403.
     3. `POST …/photo/confirm` avec `uploadId` et le **même** `contentType`.

   Rien n'est enregistré avant l'étape 3. JPEG, PNG ou WebP, 5 Mo au plus.

   Le même trio sert aux plats et aux menus Lab's Food. Un plat adopté par un
   batch cooker montre la même photo : la supprimer ici ne retire le fichier
   que si plus aucune copie ne s'en sert.
   ───────────────────────────────────────────────────────────────────────────── */

export const PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"];
export const PHOTO_MAX_MB = 5;

/** Ce que l'API refuse, dit avant de tenter l'envoi. */
export function checkPhoto(file: File): string | null {
  if (!PHOTO_MIME.includes(file.type)) {
    return "Format non accepté. Choisissez un JPG, un PNG ou un WebP.";
  }
  if (file.size > PHOTO_MAX_MB * 1024 * 1024) {
    return `Image trop lourde. La limite est de ${PHOTO_MAX_MB} Mo.`;
  }
  if (file.size === 0) return "Ce fichier est vide.";
  return null;
}

interface PhotoTicket {
  uploadId: string;
  method?: string;
  url: string;
  headers?: Record<string, string>;
  expiresAt?: string;
}

export type PhotoStep = "ticket" | "transfer" | "confirm";

export class PhotoError extends Error {
  step: PhotoStep;
  constructor(step: PhotoStep, message: string) {
    super(message);
    this.name = "PhotoError";
    this.step = step;
  }
}

/** Le refus de l'API ou du stockage, dit à l'admin qui vient de cliquer. */
export function photoMessage(error: unknown): string {
  if (error instanceof PhotoError) return error.message;
  const e = error as { status?: number } | null;
  if (e?.status === 503) {
    return "Le stockage des photos n'est pas configuré sur ce serveur.";
  }
  return adminErrorMessage(error);
}

async function uploadPhoto<T>(
  apiFetch: ReturnType<typeof useApiFetch>,
  base: string,
  file: File,
): Promise<T> {
  const probleme = checkPhoto(file);
  if (probleme) throw new PhotoError("ticket", probleme);

  let ticket: PhotoTicket;
  try {
    ticket = await apiFetch<PhotoTicket>(`${base}/photo/upload-url`, {
      method: "POST",
      // `contentType` et `sizeBytes` : tout ce que `PhotoUploadDto` accepte.
      body: { contentType: file.type, sizeBytes: file.size },
    });
  } catch (e) {
    throw new PhotoError("ticket", photoMessage(e));
  }

  let res: Response;
  try {
    res = await fetch(ticket.url, {
      method: ticket.method || "PUT",
      headers: ticket.headers ?? { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new PhotoError(
      "transfer",
      "Le transfert s'est interrompu. Rien n'a été enregistré.",
    );
  }
  if (!res.ok) {
    throw new PhotoError(
      "transfer",
      res.status === 403
        ? "Le stockage a refusé le fichier : sa taille ne correspond pas à celle annoncée."
        : `Le transfert de l'image a échoué (${res.status}).`,
    );
  }

  try {
    return await apiFetch<T>(`${base}/photo/confirm`, {
      method: "POST",
      // Le même type qu'à l'étape 1, sinon l'API répond 422.
      body: { uploadId: ticket.uploadId, contentType: file.type },
    });
  } catch (e) {
    throw new PhotoError("confirm", photoMessage(e));
  }
}

const MEALS = ["admin", "meals"] as const;
const MENUS = ["admin", "labsfood-menus"] as const;

/** `POST /admin/meals/{id}/photo/*` */
export function useMealPhoto<T>() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadPhoto<T>(apiFetch, `/admin/meals/${id}`, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEALS });
      qc.invalidateQueries({ queryKey: MENUS });
    },
  });
}

/** `DELETE /admin/meals/{id}/photo` */
export function useDeleteMealPhoto<T>() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<T>(`/admin/meals/${id}/photo`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MEALS });
      qc.invalidateQueries({ queryKey: MENUS });
    },
  });
}

/** `POST /admin/menus/{id}/photo/*` */
export function useLabsFoodMenuPhoto<T>() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadPhoto<T>(apiFetch, `/admin/menus/${id}`, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENUS }),
  });
}

/** `DELETE /admin/menus/{id}/photo` */
export function useDeleteLabsFoodMenuPhoto<T>() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<T>(`/admin/menus/${id}/photo`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: MENUS }),
  });
}

/** `DELETE /admin/users/{id}/avatar` — retirer la photo de profil de quelqu'un. */
export function useRemoveUserAvatar() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<unknown>(`/admin/users/${userId}/avatar`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
