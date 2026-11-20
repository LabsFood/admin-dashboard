import InfoPopover from "@/components/ui/InfoPopover";
import { euros, formatDateLong } from "@/lib/utils";
import type { BookingRequest } from "@/lib/api/bookings";
import type {
  BookingContract,
  BookingWithdrawal,
  ChefLegalIdentity,
} from "@/lib/api/contract";

const DAY = 86_400_000;

/** La rétractation d'une réservation : l'admin rembourse à la main sous 14 jours. */
export function WithdrawalPanel({ withdrawal }: { withdrawal?: BookingWithdrawal | null }) {
  if (!withdrawal?.submittedAt) return null;
  const deadline = new Date(new Date(withdrawal.submittedAt).getTime() + 14 * DAY).toISOString();
  return (
    <section className="card border-terra/40 p-5">
      <h3 className="mb-2 font-display text-base font-bold text-navy">
        Rétractation
        <InfoPopover label="Que faire ?">
          Le client s&apos;est rétracté (CGV art. 15). Remboursez-le à la main, par le
          même moyen de paiement (Stripe, CESU ou URSSAF), au plus tard 14 jours après
          l&apos;envoi. Si le montant dû est « à fixer », la prestation était en cours :
          fixez la part déjà réalisée.
        </InfoPopover>
      </h3>
      <dl className="space-y-1 text-sm text-ink-mid">
        <div>Envoyée le {formatDateLong(withdrawal.submittedAt)}</div>
        <div>
          Reste dû par le client :{" "}
          {withdrawal.amountDueCents == null ? "à fixer" : euros(withdrawal.amountDueCents)}
        </div>
        <div className="font-semibold text-navy tabular-nums">
          À rembourser :{" "}
          {withdrawal.refundCents == null ? "à fixer" : euros(withdrawal.refundCents)} avant le{" "}
          {formatDateLong(deadline)}
        </div>
      </dl>
    </section>
  );
}

const METHOD_LABEL: Record<BookingRequest["paymentMethod"], string> = {
  cb: "Carte bancaire",
  avance_immediate: "Avance immédiate URSSAF",
  cesu: "CESU préfinancé",
};

const STATE_LABEL: Record<NonNullable<BookingRequest["state"]>, string> = {
  awaiting_card: "Carte à enregistrer par le client",
  awaiting_chef: "En attente du batch cooker",
  accepted: "Acceptée",
  refused: "Refusée par le batch cooker",
  expired: "Sans réponse sous 48 h",
};

/** La demande de réservation (CGV V1 5.1, 5.2, 7.3). */
export function RequestPanel({ request }: { request?: BookingRequest | null }) {
  if (!request) return null;
  const line = (label: string, at: string | null) =>
    at ? (
      <div>
        {label} : {formatDateLong(at)}
      </div>
    ) : null;
  return (
    <section className="card p-5">
      <h3 className="mb-2 font-display text-base font-bold text-navy">
        Demande
        <InfoPopover label="Comment ça marche ?">
          Le client choisit son moyen et enregistre une carte à la réservation, sans
          rien payer. Le batch cooker accepte sous 48 h, ce qui conclut le contrat. Le
          prix est prélevé automatiquement après la session (dès l&apos;acceptation pour
          une carte réservée moins de 48 h avant) ; un seul essai. Si la carte est
          refusée, le client a 48 h pour régler (CGV 7.5).
        </InfoPopover>
      </h3>
      <dl className="space-y-1 text-sm text-ink-mid">
        <div className="font-semibold text-navy">
          {request.state ? STATE_LABEL[request.state] : "—"}
        </div>
        <div>Moyen choisi : {METHOD_LABEL[request.paymentMethod]}</div>
        <div>
          Carte :{" "}
          {request.card ? `${request.card.brand ?? ""} •••• ${request.card.last4}` : "non enregistrée"}
        </div>
        {line("Envoyée au batch cooker", request.requestedAt)}
        {request.state === "awaiting_chef" && line("Réponse attendue avant", request.acceptBy)}
        {line("Acceptée", request.acceptedAt)}
        {line("Refusée", request.refusedAt)}
        {request.refusalReason && <div>Motif : {request.refusalReason}</div>}
        {!request.chargedAt && line("Prélèvement prévu", request.chargeAt)}
        {line("Prélèvement lancé", request.chargedAt)}
      </dl>
    </section>
  );
}

/** Les cases cochées à la commande (CGV art. 5.1). */
export function ContractPanel({ contract }: { contract?: BookingContract }) {
  if (!contract) return null;
  const line = (label: string, at: string | null) => (
    <div>
      {label} : {at ? formatDateLong(at) : "non"}
    </div>
  );
  return (
    <section className="card p-5">
      <h3 className="mb-2 font-display text-base font-bold text-navy">Contrat</h3>
      <dl className="space-y-1 text-sm text-ink-mid">
        <div>Version des CGV : {contract.version ?? "aucune (réservation d'avant la V1)"}</div>
        {line("CGV acceptées", contract.cgvAcceptedAt)}
        {line("Mandat de débours", contract.deboursMandateAcceptedAt)}
        {line("Exécution anticipée demandée", contract.earlyExecutionRequestedAt)}
        {line("Conclu", contract.concludedAt)}
      </dl>
    </section>
  );
}

const MISSING_LABEL: Record<string, string> = {
  name: "dénomination",
  legalStatus: "statut juridique",
  siren: "SIREN",
  businessAddress: "adresse professionnelle",
  vat: "régime de TVA",
  sapNumber: "n° SAP",
  insurance: "assurance",
  mediator: "médiateur",
};

/** L'identité légale d'un batch cooker (CGV art. 3.2) et ce qui manque. */
export function ChefLegalPanel({ identity }: { identity?: ChefLegalIdentity }) {
  if (!identity) return null;
  const rows: [string, string | null][] = [
    ["Dénomination", identity.name],
    ["Statut", identity.legalStatus],
    ["SIREN", identity.siren],
    ["Adresse professionnelle", identity.businessAddress],
    ["TVA", identity.vat],
    ["Déclaration SAP", identity.sapNumber],
    ["Assurance", identity.insurance],
    ["Médiateur", identity.mediator],
  ];
  const missing = identity.missing ?? [];
  return (
    <section className="card p-5">
      <h3 className="mb-2 font-display text-base font-bold text-navy">
        Identité légale
        <InfoPopover label="Pourquoi ?">
          Les CGV (art. 3.2) affichent ces informations au client avant la commande. Un
          manque ne bloque pas la réservation, mais doit être complété par le batch
          cooker dans Rémunération.
        </InfoPopover>
      </h3>
      {missing.length > 0 && (
        <p className="mb-2 text-sm font-semibold text-terra-ink">
          À compléter : {missing.map((m) => MISSING_LABEL[m] ?? m).join(", ")}
        </p>
      )}
      <dl className="space-y-1 text-sm text-ink-mid">
        {rows.map(([label, value]) => (
          <div key={label}>
            {label} : {value ?? "—"}
          </div>
        ))}
      </dl>
    </section>
  );
}
