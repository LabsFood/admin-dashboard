import { ApiError } from "./client";

/**
 * Traduit une erreur d'API en message actionnable pour l'admin.
 * Utilisé par les écrans de gestion des comptes (création, changement de rôle).
 */
/**
 * Le détail d'un `400` de validation, champ par champ.
 *
 * Depuis le 17/10 l'API renvoie, à côté du `message[]` historique, un tableau
 * `errors: [{ field, code, message }]` où `field` est le chemin dans le corps
 * envoyé (`meals.0.portions`) et `code` le nom de la règle (`min`, `isUuid`,
 * `whitelistValidation` pour un champ inconnu). Le `message` reste en anglais :
 * il sert au développement, pas à l'affichage — c'est au formulaire de
 * traduire à partir du `code`.
 *
 * Un formulaire s'en sert pour poser l'erreur **sous le bon champ** plutôt que
 * de montrer une ligne rouge en haut de page.
 */
export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export function fieldErrors(error: unknown): FieldError[] {
  if (!(error instanceof ApiError)) return [];
  const body = error.body;
  if (!body || typeof body !== "object") return [];
  const list = (body as { errors?: unknown }).errors;
  if (!Array.isArray(list)) return [];
  return list.flatMap((e) =>
    e && typeof e === "object" && typeof (e as FieldError).field === "string"
      ? [
          {
            field: String((e as FieldError).field),
            code: String((e as FieldError).code ?? ""),
            message: String((e as FieldError).message ?? ""),
          },
        ]
      : [],
  );
}

/** L'erreur d'un champ précis, s'il y en a une. */
export const errorFor = (error: unknown, field: string) =>
  fieldErrors(error).find((e) => e.field === field) ?? null;

export function adminErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "Erreur inconnue.";
  }

  switch (error.status) {
    case 0:
      return "API injoignable. Vérifie que le backend répond.";
    case 401:
      return "Session expirée. Reconnecte-toi puis réessaie.";
    case 403:
      return "Ton compte n'a pas le rôle admin requis pour cette action.";
    case 404:
      return "Introuvable côté API : l'élément n'existe plus (supprimé ou fusionné). Rechargez la page.";
    case 400: {
      /* Un refus de validation nomme ses champs depuis le 17/10 : on les cite
         plutôt que de répéter une phrase générique. */
      const champs = fieldErrors(error).map((e) => e.field);
      if (champs.length > 0) {
        return champs.length === 1
          ? `Le champ « ${champs[0]} » n'est pas accepté par l'API.`
          : `${champs.length} champs ne sont pas acceptés par l'API : ${champs.join(", ")}.`;
      }
      return error.message || "La requête a été refusée.";
    }
    case 409:
    case 422:
      return error.message || "Cette adresse email est déjà utilisée.";
    case 503:
      // Le backend refuse le provisioning si CLERK_SECRET_KEY vaut le placeholder.
      return "Le provisioning est indisponible : l'API tourne avec une clé Clerk de test (`sk_test_placeholder`). Une vraie CLERK_SECRET_KEY est nécessaire côté backend.";
    default:
      return error.message || `Échec de la requête (${error.status}).`;
  }
}
