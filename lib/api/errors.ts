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

/**
 * Les codes que l'API renvoie sur l'avance immédiate et les commissions : son
 * `message` est en anglais, ce sont ces phrases que l'admin lit.
 */
const CODE_MESSAGES: Record<string, string> = {
  URSSAF_NOT_MANUAL_OR_SIMULATED:
    "La passerelle URSSAF n'est ni en mode manuel ni simulé sur ce serveur : aucune réponse ne peut être notée.",
  URSSAF_NOT_SIMULATED:
    "La passerelle URSSAF n'est pas en mode simulé sur ce serveur.",
  URSSAF_ALREADY_TRANSMITTED:
    "Cette demande est déjà notée comme saisie en manuel. Rechargez la liste.",
  URSSAF_REQUEST_SETTLED: "Cette demande a déjà reçu sa réponse. Rechargez la liste.",
  URSSAF_REFERENCE_REQUIRED:
    "Indiquez la référence donnée à la demande avant de la marquer payée.",
  URSSAF_DOSSIER_MISSING: "Ce client n'a pas encore rempli son dossier URSSAF.",
  KYC_STORAGE_UNAVAILABLE:
    "Le dossier ne peut pas être lu pour l'instant (stockage ou clé de chiffrement indisponible).",
  COMMISSION_NOT_COLLECTABLE:
    "Une des commissions choisies ne peut plus être prélevée (déjà facturée, ou prestation pas encore payée). Rechargez la liste.",
  SEPA_MANDATE_INACTIVE:
    "Ce batch cooker n'a pas de mandat SEPA actif : rien ne peut être prélevé.",
};

const apiCode = (error: ApiError): string | undefined => {
  const body = error.body;
  return body && typeof body === "object" && typeof (body as { code?: unknown }).code === "string"
    ? (body as { code: string }).code
    : undefined;
};

export function adminErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "Erreur inconnue.";
  }
  const known = CODE_MESSAGES[apiCode(error) ?? ""];
  if (known) return known;

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
