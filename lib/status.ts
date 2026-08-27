import type { BadgeTone } from "@/components/ui/Badge";
import type { Role } from "@/lib/api/types";
import type {
  ReservationStatus,
  DemandeStatus,
  KossamStatus,
  CandidatureStatus,
  ContactStatus,
  PaymentStatus,
  ClientStatus,
  MealStatus,
} from "@/lib/mock/types";

/* Correspondance statut → couleur de badge, centralisée. */

export const reservationTone: Record<ReservationStatus, BadgeTone> = {
  pending: "warning",
  confirmed: "info",
  shopping: "teal",
  cooking: "terra",
  delivered: "success",
  cancelled: "danger",
};

export const demandeTone: Record<DemandeStatus, BadgeTone> = {
  submitted: "warning",
  "in-review": "info",
  quoted: "terra",
  accepted: "success",
  declined: "danger",
};

export const kossamTone: Record<KossamStatus, BadgeTone> = {
  new: "warning",
  preparing: "info",
  delivering: "terra",
  delivered: "success",
  cancelled: "danger",
};

export const candidatureTone: Record<CandidatureStatus, BadgeTone> = {
  new: "warning",
  reviewing: "info",
  interview: "terra",
  accepted: "success",
  rejected: "danger",
};

export const contactTone: Record<ContactStatus, BadgeTone> = {
  new: "warning",
  read: "info",
  replied: "success",
  archived: "neutral",
};

export const paymentTone: Record<PaymentStatus, BadgeTone> = {
  pending: "warning",
  paid: "success",
  refunded: "neutral",
};

export const paymentLabel: Record<PaymentStatus, string> = {
  pending: "Paiement en attente",
  paid: "Payé",
  refunded: "Remboursé",
};

export const clientTone: Record<ClientStatus, BadgeTone> = {
  vip: "terra",
  active: "success",
  prospect: "info",
  inactive: "neutral",
};

export const clientLabel: Record<ClientStatus, string> = {
  vip: "VIP",
  active: "Actif",
  prospect: "Prospect",
  inactive: "Inactif",
};

/* Rôle applicatif (`users.role`) — RBAC côté API. */

export const roleTone: Record<Role, BadgeTone> = {
  admin: "terra",
  chef: "navy",
  client: "teal",
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  chef: "Chef·fe",
  client: "Client",
};

/** Ce que chaque rôle autorise — affiché sous le sélecteur de rôle. */
export const roleHint: Record<Role, string> = {
  admin: "Accès complet à la console d'administration.",
  chef: "Personnel de cuisine — pas d'accès à la console.",
  client: "Compte client standard — espace client uniquement.",
};

export const mealTone: Record<MealStatus, BadgeTone> = {
  published: "success",
  draft: "warning",
  archived: "neutral",
};

export const mealLabel: Record<MealStatus, string> = {
  published: "Publié",
  draft: "Brouillon",
  archived: "Archivé",
};
