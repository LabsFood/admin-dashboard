"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiFetch } from "./client";
import { unwrapList, unwrapMeta, type Difficulty } from "./catalog";

/* ─────────────────────────────────────────────────────────────────────────────
   La modération du contenu des batch cookers.

   La console ne crée ni ne modifie ce contenu : il appartient au batch cooker.
   Elle fait trois choses, et seulement trois :

   - **relire** la file d'attente (`GET /admin/dishes?review=pending`) : tout ce
     qui a été publié et que personne n'a encore regardé ;
   - **marquer comme relu** (`POST …/review`) : « vu, rien à dire ». La note
     reste entre admins, le batch cooker ne la lit jamais ;
   - **suspendre** ou **lever la suspension** (`PATCH …/moderation`). Le motif
     est obligatoire, entre 15 et 500 caractères, et le batch cooker le lit mot
     pour mot. Un plat `published` peut être suspendu ; seul un plat `suspended`
     peut être remis en ligne.
   ───────────────────────────────────────────────────────────────────────────── */

export type ModeratedStatus =
  | "draft"
  | "published"
  | "suspended"
  | "archived";

export type ReviewKind = "dish" | "menu";

export const REASON_CODES = [
  "allergens-incomplete",
  "inappropriate-content",
  "copyright",
  "misleading-origin",
  "duplicate",
  "quality",
  "other",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

/** Ce que l'admin voit dans la file : un plat ou un menu, et son auteur. */
export interface ReviewItem {
  id: string;
  /** `menu` quand l'élément est un menu — la file mélange les deux. */
  kind: ReviewKind;
  name: string;
  description: string | null;
  imageUrl: string | null;
  country: string | null;
  category: string | null;
  status: ModeratedStatus;
  portions: number | null;
  prepMinutes: number | null;
  difficulty: Difficulty | null;
  diets: string[];
  customDiets: string[];
  allergens: string[];
  /** Déclaration explicite du batch cooker : « vérifié, aucun des 14 ». */
  allergensNone: boolean;
  customAllergens: string[];
  publishedAt: string | null;
  reviewedAt: string | null;
  /** Le batch cooker, tel que l'API le nomme. */
  chefProfileId: string | null;
  chefName: string | null;
  /** Nombre de plats, pour un menu. */
  dishCount: number | null;
  /**
   * Ce qui mérite un regard, **décidé par l'API**.
   *
   * C'est la seule source fiable sur cette route : elle ne renvoie ni les
   * allèrgènes, ni le pays, ni la photo. Recalculer « allèrgènes non
   * déclarés » depuis des champs absents affichait l'avertissement sur
   * **chaque** ligne.
   */
  flags: ReviewFlag[];
  /** Où en est la relecture, tel que l'API le dit. */
  reviewState: string | null;
  /** Depuis quand la ligne attend. */
  pendingSince: string | null;
  /** La réponse brute : tout ce que l'API renvoie et qu'on n'affiche pas. */
  raw: Record<string, unknown>;
}

/** Le vocabulaire des drapeaux, tel que la doc de la route l'énumère. */
export const REVIEW_FLAGS = [
  "custom-allergen",
  "custom-diet",
  "no-allergens-declared",
  "edited-after-review",
  "republished-after-suspension",
  "source-changed",
] as const;

export type ReviewFlag = (typeof REVIEW_FLAGS)[number];

/** Ce que chaque drapeau veut dire, du point de vue de l'admin. */
export const reviewFlagLabel: Record<string, string> = {
  "custom-allergen": "Allèrgène hors liste",
  "custom-diet": "Régime hors liste",
  "no-allergens-declared": "Allèrgènes non déclarés",
  "edited-after-review": "Modifié après relecture",
  "republished-after-suspension": "Republié après suspension",
  "source-changed": "La suggestion d'origine a changé",
};

export const reviewFlagText = (f: string) => reviewFlagLabel[f] ?? f;

/**
 * Normalise une ligne de la file.
 *
 * Attention à ce que cette route **n'envoie pas** : ni `imageUrl`, ni
 * `country`, ni `prepMinutes`, ni les allèrgènes. Sa ligne tient en douze
 * champs — identité, auteur, statut, dates, `flags`. Les champs absents
 * restent donc à `null`, et l'écran ne doit **rien en déduire** : c'est
 * `flags` qui dit ce qui mérite un regard.
 *
 * Les autres routes de contenu (`/admin/chefs/{id}/dishes`, `/admin/meals`)
 * rendent la fiche complète, photo comprise : c'est là qu'on va la chercher
 * quand on ouvre le détail.
 */
function toReviewItem(raw: unknown, fallbackKind?: ReviewKind): ReviewItem {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const str = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v;
    }
    return null;
  };
  const num = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return null;
  };
  const arr = (...keys: string[]): string[] => {
    for (const k of keys) {
      const v = o[k];
      if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
    }
    return [];
  };

  const dishes = Array.isArray(o.dishes) ? o.dishes : null;
  const chef = (o.chef ?? o.chefProfile) as Record<string, unknown> | undefined;

  const kind: ReviewKind =
    o.kind === "menu" || o.type === "menu" || o.title !== undefined || dishes !== null
      ? "menu"
      : o.kind === "dish" || o.type === "dish"
        ? "dish"
        : (fallbackKind ?? "dish");

  return {
    id: str("id") ?? "",
    kind,
    name: str("name", "title") ?? "Sans titre",
    description: str("description", "pitch"),
    imageUrl: str("imageUrl", "image"),
    country: str("country"),
    category: str("category"),
    status: (str("status") as ModeratedStatus | null) ?? "published",
    portions: num("portions"),
    prepMinutes: num("prepMinutes", "prepTime"),
    difficulty: (str("difficulty") as Difficulty | null) ?? null,
    diets: arr("diets", "dietaryTags"),
    customDiets: arr("customDiets"),
    allergens: arr("allergens"),
    allergensNone: o.allergensNone === true,
    customAllergens: arr("customAllergens"),
    publishedAt: str("publishedAt"),
    reviewedAt: str("reviewedAt", "lastReviewedAt"),
    chefProfileId:
      str("chefProfileId") ??
      (typeof chef?.id === "string" ? chef.id : null),
    chefName:
      str("chefName") ??
      (typeof chef?.displayName === "string"
        ? chef.displayName
        : typeof chef?.name === "string"
          ? chef.name
          : null),
    dishCount: dishes ? dishes.length : num("dishCount"),
    flags: arr("flags") as ReviewFlag[],
    reviewState: str("reviewState"),
    pendingSince: str("pendingSince"),
    raw: o,
  };
}

export interface ReviewQueueQuery {
  page?: number;
  limit?: number;
  /** `pending` : uniquement ce que personne n'a relu. */
  review?: "pending";
  /** Restreindre à un seul genre. Sans ça, plats et menus arrivent mêlés. */
  type?: ReviewKind;
  chefId?: string;
  /** `false` garde la requête en sommeil sans changer sa clé de cache. */
  enabled?: boolean;
}

const QUEUE = ["admin", "review-queue"] as const;

/**
 * `GET /admin/dishes` — la file de relecture, plats **et** menus.
 *
 * Sans `review=pending`, c'est tout le contenu des batch cookers.
 */
export function useReviewQueue({
  page,
  limit,
  review,
  type,
  chefId,
  enabled,
}: ReviewQueueQuery = {}) {
  const apiFetch = useApiFetch();

  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));
  if (limit != null) params.set("limit", String(limit));
  if (review) params.set("review", review);
  if (type) params.set("type", type);
  if (chefId) params.set("chefId", chefId);
  const qs = params.toString();

  return useQuery({
    queryKey: [
      ...QUEUE,
      { page, limit, review: review ?? "all", type: type ?? "both", chefId: chefId ?? "" },
    ],
    queryFn: async () => {
      const res = await apiFetch<unknown>(`/admin/dishes${qs ? `?${qs}` : ""}`);
      return {
        items: unwrapList<unknown>(res, "dishes", "results").map((r) =>
          toReviewItem(r, type),
        ),
        meta: unwrapMeta(res),
      };
    },
    enabled: enabled ?? true,
  });
}

/** `GET /admin/chefs/{id}/dishes` — les plats d'un batch cooker. */
export function useChefDishes(chefProfileId: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "chef-dishes", chefProfileId],
    queryFn: async () =>
      unwrapList<unknown>(
        await apiFetch<unknown>(`/admin/chefs/${chefProfileId}/dishes`),
        "dishes",
      ).map((r) => toReviewItem(r, "dish")),
    enabled: !!chefProfileId,
  });
}

/** `GET /admin/chefs/{id}/menus` — les menus d'un batch cooker. */
export function useChefMenus(chefProfileId: string | undefined) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "chef-menus", chefProfileId],
    queryFn: async () =>
      unwrapList<unknown>(
        await apiFetch<unknown>(`/admin/chefs/${chefProfileId}/menus`),
        "menus",
      ).map((r) => toReviewItem(r, "menu")),
    enabled: !!chefProfileId,
  });
}

/**
 * `GET /admin/dishes/custom-values` — les régimes et allergènes que les batch
 * cookers ont tapés à la main. Ce que la liste de référence ne couvre pas
 * encore, et qu'il faudra peut-être y ajouter.
 */
export function useCustomValues() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: ["admin", "custom-values"],
    queryFn: async () => {
      const res = await apiFetch<unknown>("/admin/dishes/custom-values");
      const o = (res && typeof res === "object" ? res : {}) as Record<string, unknown>;
      return {
        diets: unwrapList<string>(o.diets ?? o.customDiets ?? [], "diets"),
        allergens: unwrapList<string>(
          o.allergens ?? o.customAllergens ?? [],
          "allergens",
        ),
      };
    },
  });
}

/* ── Décisions ─────────────────────────────────────────────────────────────── */

export interface ModerationInput {
  /** `suspended` retire du public ; `published` lève la suspension. */
  status: "suspended" | "published";
  /** 15 à 500 caractères, sinon `422 REASON_REQUIRED`. Lu tel quel. */
  reason: string;
  reasonCode?: ReasonCode;
  notifyChef?: boolean;
}

function useModerationMutation<TInput>(
  build: (input: TInput) => {
    path: string;
    method: "POST" | "PATCH";
    body: unknown;
  },
) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TInput) => {
      const { path, method, body } = build(input);
      return apiFetch<unknown>(path, { method, body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUEUE });
      qc.invalidateQueries({ queryKey: ["admin", "chef-dishes"] });
      qc.invalidateQueries({ queryKey: ["admin", "chef-menus"] });
    },
  });
}

/**
 * `PATCH /admin/dishes/{id}/moderation` et `PATCH /admin/menus/{id}/moderation`
 *
 * Même corps des deux côtés : le genre de l'élément décide seulement de la
 * route. `409 INVALID_TRANSITION` quand on suspend autre chose que du publié,
 * ou qu'on remet en ligne autre chose qu'un suspendu.
 */
export function useModerate() {
  return useModerationMutation<ModerationInput & { id: string; kind: ReviewKind }>(
    ({ id, kind, ...body }) => ({
      path: `/admin/${kind === "menu" ? "menus" : "dishes"}/${id}/moderation`,
      method: "PATCH",
      body,
    }),
  );
}

/**
 * `POST /admin/dishes/{id}/review` et `POST /admin/menus/{id}/review`
 * « Regardé, rien à changer » — sort l'élément de la file.
 */
export function useMarkReviewed() {
  return useModerationMutation<{
    id: string;
    kind: ReviewKind;
    note?: string;
  }>(({ id, kind, note }) => ({
    path: `/admin/${kind === "menu" ? "menus" : "dishes"}/${id}/review`,
    method: "POST",
    body: { outcome: "ok", ...(note?.trim() ? { note: note.trim() } : {}) },
  }));
}
