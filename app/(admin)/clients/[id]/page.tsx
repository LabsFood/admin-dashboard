"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarRange,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Wallet,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { euros, formatDate, initials } from "@/lib/utils";
import {
  clientTone,
  clientLabel,
  reservationTone,
  demandeTone,
} from "@/lib/status";
import { clientById } from "@/lib/mock/clients";
import { RESERVATIONS, RESERVATION_STATUS_LABEL } from "@/lib/mock/reservations";
import { DEMANDES, DEMANDE_STATUS_LABEL } from "@/lib/mock/demandes";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const client = clientById(params.id);

  if (!client) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-3 text-5xl">🧑‍🍳</p>
        <h2 className="font-display text-2xl font-bold text-navy">
          Client introuvable
        </h2>
        <Link href="/clients" className="btn btn-primary mt-6">
          <ArrowLeft className="h-4 w-4" /> Retour aux clients
        </Link>
      </div>
    );
  }

  const orders = RESERVATIONS.filter((r) => r.clientId === client.id).sort(
    (a, b) => b.date.localeCompare(a.date),
  );
  const demandes = DEMANDES.filter((d) => d.clientId === client.id);
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const tenure = Math.round(
    (now - new Date(client.createdAt).getTime()) /
      (1000 * 60 * 60 * 24 * 30),
  );

  return (
    <div className="space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-2 text-xs text-ink-mid hover:text-navy"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Tous les clients
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Colonne gauche : identité */}
        <aside className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-terra/25 blur-3xl" />
            <div className="relative flex flex-col items-center text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-terra font-display text-2xl font-bold text-white">
                {initials(client.name)}
              </span>
              <p className="mt-3 font-display text-xl font-bold">
                {client.name}
              </p>
              <Badge tone={clientTone[client.status]} className="mt-2">
                {clientLabel[client.status]}
              </Badge>
              <div className="mt-4 w-full space-y-2 text-left text-xs text-white/70">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-terra-soft" />
                  {client.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-terra-soft" />
                  {client.phone}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-soft" />
                  {client.address.street}, {client.address.postalCode}{" "}
                  {client.address.city}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <KpiBox Icon={CalendarRange} label="Sessions" value={client.ordersCount} />
            <KpiBox Icon={Wallet} label="Dépensé" value={euros(client.totalSpent)} />
            <KpiBox Icon={Home} label="Ancienneté" value={`${tenure} m`} />
          </div>

          {/* Préférences */}
          <section className="card p-5">
            <h4 className="mb-3 font-display text-base font-bold text-navy">
              Profil culinaire
            </h4>
            <PrefBlock title="Régimes" items={client.dietaryPreferences} tone="teal" />
            <PrefBlock title="Allergies" items={client.allergies} tone="danger" />
            <div className="mt-3 flex items-center gap-2 text-xs text-ink-mid">
              <Home className="h-3.5 w-3.5 text-ink-soft" />
              Foyer : {client.household.adults} adulte
              {client.household.adults > 1 ? "s" : ""}
              {client.household.kids > 0 &&
                `, ${client.household.kids} enfant${
                  client.household.kids > 1 ? "s" : ""
                }`}
            </div>
          </section>

          <Link
            href="/messagerie"
            className="flex items-center gap-3 rounded-3xl bg-teal p-4 text-white transition-transform hover:-translate-y-0.5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">Envoyer un message</p>
              <p className="text-xs text-white/60">Ouvrir la messagerie</p>
            </div>
          </Link>
        </aside>

        {/* Colonne droite : activité */}
        <div className="space-y-6">
          {/* Notes */}
          <section className="rounded-3xl border border-terra/30 bg-terra-pale/30 p-5">
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-terra-deep">
              <Sparkles className="h-3.5 w-3.5" /> Note interne
            </p>
            <p className="text-sm text-navy">{client.notes}</p>
          </section>

          {/* Historique réservations */}
          <section className="card p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-navy">
              Historique des sessions ({orders.length})
            </h3>
            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-soft">
                Aucune session pour ce client.
              </p>
            ) : (
              <ul className="divide-y divide-[rgba(0,35,75,0.06)]">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/reservations/${o.id}`}
                      className="flex items-center gap-4 py-3 transition-colors hover:bg-cream-soft"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-cream-deep">
                        <span className="font-display text-sm font-bold text-navy">
                          {new Date(o.date).getDate()}
                        </span>
                        <span className="font-mono text-[8px] uppercase text-ink-soft">
                          {new Date(o.date).toLocaleDateString("fr-FR", {
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-navy">
                          Formule {o.formula} · {o.meals.length} plats
                        </p>
                        <p className="font-mono text-[11px] text-ink-soft">
                          {o.reference} · {o.chefName}
                        </p>
                      </div>
                      <Badge tone={reservationTone[o.status]} dot>
                        {RESERVATION_STATUS_LABEL[o.status]}
                      </Badge>
                      <span className="hidden font-display text-sm font-bold text-navy sm:block">
                        {euros(o.amountTTC)}
                      </span>
                      <ArrowRight className="h-4 w-4 text-ink-soft" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Demandes */}
          {demandes.length > 0 && (
            <section className="card p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-navy">
                Demandes sur-mesure ({demandes.length})
              </h3>
              <ul className="space-y-2.5">
                {demandes.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(0,35,75,0.06)] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">
                        {d.title}
                      </p>
                      <p className="text-[11px] text-ink-soft">
                        {formatDate(d.createdAt)} · {d.persons} pers.
                      </p>
                    </div>
                    <Badge tone={demandeTone[d.status]}>
                      {DEMANDE_STATUS_LABEL[d.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiBox({
  Icon,
  label,
  value,
}: {
  Icon: typeof Wallet;
  label: string;
  value: string | number;
}) {
  return (
    <div className="card p-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-terra" />
      <p className="mt-1.5 font-display text-base font-bold text-navy">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}

function PrefBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "teal" | "danger";
}) {
  return (
    <div className="mb-2.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-ink-soft">Aucune</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span
              key={it}
              className={
                tone === "teal"
                  ? "rounded-full bg-teal-pale px-2.5 py-0.5 text-[11px] font-medium text-teal"
                  : "rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-medium text-danger"
              }
            >
              {it}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
