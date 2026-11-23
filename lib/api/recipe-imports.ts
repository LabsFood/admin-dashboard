"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   Import de recettes par IA depuis la console — `/admin/recipe-imports`.

   Même lecture que côté cuisinier (fichier, texte, lien ou simple titre), mais
   l'API ne crée aucun plat : une fois l'import `done`, `drafts` donne un
   brouillon par recette lue, que le formulaire de plat reprend. L'admin relit
   et enregistre lui-même (`POST /admin/meals`). On suit l'import toutes les
   2 secondes tant qu'il est en cours.
   ───────────────────────────────────────────────────────────────────────────── */

export type ImportSourceType = "file" | "text" | "url" | "title";
export type ImportStatus = "pending" | "processing" | "review" | "done" | "failed";

export interface DraftLine {
  name: string;
  qty: number | null;
  unit: string | null;
  catalogIngredientId: string | null;
  toVerify: boolean;
  rawText: string | null;
  optional: boolean;
  preparation: string | null;
  group: string | null;
}

export interface ImportDraft {
  dish: {
    name: string;
    description: string | null;
    country: string | null;
    category: string | null;
    portions: number;
    prepMinutes: number;
    cookMinutes: number | null;
    difficulty: "easy" | "medium" | "hard" | null;
    equipment: string[];
    recipe: {
      ingredients: DraftLine[];
      steps: { text: string; type: string | null; durationMinutes: number | null }[];
      storage?: { method: string; days: number; freezable?: boolean };
      reheating?: { note: string };
    };
  };
  estimatedFields: string[];
  warnings: string[];
  suspectedAllergens: string[];
  linked: number;
  toVerify: number;
}

export interface AdminRecipeImport {
  id: string;
  sourceType: ImportSourceType;
  status: ImportStatus;
  error: { code: string; message: string } | null;
  warnings: string[];
  drafts: ImportDraft[];
  createdAt: string;
  finishedAt: string | null;
}

export const IMPORT_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
export const IMPORT_MAX_MB = 10;
export const IMPORT_MAX_FILES = 4;

/** Ce que l'API refuse, dit avant l'envoi. */
export function checkImportFiles(files: File[]): string | null {
  if (files.length === 0) return "Choisissez un fichier.";
  if (files.length > IMPORT_MAX_FILES) return `${IMPORT_MAX_FILES} fichiers au plus.`;
  const pdfs = files.filter((f) => f.type === "application/pdf");
  if (pdfs.length > 1 || (pdfs.length === 1 && files.length > 1)) {
    return "Un seul PDF par import, ou plusieurs photos d'une même recette.";
  }
  for (const f of files) {
    if (!IMPORT_MIME.includes(f.type)) return "Formats acceptés : PDF, JPEG, PNG, WebP.";
    if (f.size === 0) return "Un des fichiers est vide.";
    if (f.size > IMPORT_MAX_MB * 1024 * 1024) {
      return `Fichier trop lourd : ${IMPORT_MAX_MB} Mo au plus.`;
    }
  }
  return null;
}

/** Suit un import tant qu'il est en cours. */
export function useAdminRecipeImport(id: string | null) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "recipe-imports", id ?? "none"],
    queryFn: () => apiFetch<AdminRecipeImport>(`/admin/recipe-imports/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "pending" || status === "processing" ? 2000 : false;
    },
  });
}

interface Ticket {
  uploadId: string;
  method?: string;
  url: string;
  headers?: Record<string, string>;
}

export type StartImport =
  | { sourceType: "file"; files: File[] }
  | { sourceType: "text"; text: string }
  | { sourceType: "url"; url: string }
  | { sourceType: "title"; title: string };

export function useStartAdminImport() {
  const apiFetch = useApiFetch();
  return useMutation({
    mutationFn: async (input: StartImport) => {
      if (input.sourceType !== "file") {
        return apiFetch<AdminRecipeImport>("/admin/recipe-imports", {
          method: "POST",
          body: input,
        });
      }
      const problem = checkImportFiles(input.files);
      if (problem) throw new Error(problem);
      const uploadIds: string[] = [];
      for (const file of input.files) {
        const ticket = await apiFetch<Ticket>("/admin/recipe-imports/upload-url", {
          method: "POST",
          body: { mimeType: file.type, sizeBytes: file.size },
        });
        let res: Response;
        try {
          res = await fetch(ticket.url, {
            method: ticket.method || "PUT",
            headers: ticket.headers ?? { "Content-Type": file.type },
            body: file,
          });
        } catch {
          throw new Error("Le transfert s'est interrompu. Réessayez.");
        }
        if (!res.ok) throw new Error(`Le transfert du fichier a échoué (${res.status}).`);
        uploadIds.push(ticket.uploadId);
      }
      return apiFetch<AdminRecipeImport>("/admin/recipe-imports", {
        method: "POST",
        body: { sourceType: "file", uploadIds },
      });
    },
  });
}
