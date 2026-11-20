/* CGV V1 (en vigueur le 21/11/2026) : ce que l'API renvoie sur le contrat d'une
   réservation et sur l'identité légale d'un batch cooker. Lecture seule ici. */

export interface BookingContract {
  version: string | null;
  cgvAcceptedAt: string | null;
  deboursMandateAcceptedAt: string | null;
  earlyExecutionRequestedAt: string | null;
  concludedAt: string | null;
}

export interface BookingWithdrawal {
  open: boolean;
  refusal: string | null;
  availableUntil: string | null;
  submittedAt: string | null;
  /** `null` : la part déjà réalisée est à fixer par l'équipe. */
  amountDueCents: number | null;
  refundCents: number | null;
}

export interface ChefLegalIdentity {
  name: string | null;
  legalStatus: string | null;
  siren: string | null;
  businessAddress: string | null;
  vat: string | null;
  sapNumber: string | null;
  insurance: string | null;
  mediator: string | null;
  contact: string;
  /** Vue admin seulement : ce qui manque encore (codes de champs). */
  missing?: string[];
}
