import { ApiError } from "./client";

/**
 * Traduit une erreur d'API en message actionnable pour l'admin.
 * Utilisé par les écrans de gestion des comptes (création, changement de rôle).
 */
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
      return "Utilisateur introuvable côté API.";
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
