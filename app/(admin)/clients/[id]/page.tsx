"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Ban,
  CalendarRange,
  CheckCircle2,
  Crown,
  Flame,
  Home,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toaster";
import { adminErrorMessage } from "@/lib/api/errors";
import RoleEditor from "@/components/admin/RoleEditor";
import { cn, euros, initials } from "@/lib/utils";
import { clientTone, clientLabel } from "@/lib/status";
import { useClient, useUpdateClient } from "@/lib/api/admin";
import WriteToUserButton from "@/components/admin/WriteToUserButton";
import DeleteAccountButton from "@/components/admin/DeleteAccountButton";
import PhotoDeProfil from "@/components/admin/PhotoDeProfil";
import { toClientView, type ClientView } from "@/lib/api/adapt";
import { ApiError } from "@/lib/api/client";
import type { ClientStatus } from "@/lib/mock/types";

const DASH = "—";

/** Le profil culinaire, dans l'ordre où le client le remplit. */
const PREFS = [
  { key: "dietaryPreferences", title: "Régimes", tone: "teal" },
  { key: "allergies", title: "Allergies", tone: "danger" },
  { key: "dislikes", title: "N'aime pas", tone: "danger" },
  { key: "favorites", title: "Favoris", tone: "teal" },
] as const;

type PrefKey = (typeof PREFS)[number]["key"];

/**
 * Les suggestions de la page profil du client (batchcooking-web). Il écrit des
 * libellés, pas des codes : une correction doit se lire comme ce qu'il a
 * lui-même écrit.
 */
const SUGGEST: Record<PrefKey, string[]> = {
  dietaryPreferences: ["Végétarien", "Vegan", "Sans-porc", "Sans-bœuf", "Halal", "Casher", "Sans-gluten", "Sans-lactose"],
  allergies: ["Fruits à coque", "Arachides", "Œufs", "Poisson", "Crustacés", "Soja", "Sésame"],
  dislikes: [],
  favorites: ["Risotto", "Curry", "Lasagnes", "Tajine", "Wok", "Saumon", "Pad thaï"],
};

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isPending, isError, error, refetch } = useClient(params.id);

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="card h-80 animate-pulse bg-cream-soft" />
        <div className="card h-80 animate-pulse bg-cream-soft" />
      </div>
    );
  }

  if (isError || !data) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="mb-3 text-5xl">🧑‍🍳</p>
        <h2 className="font-display text-2xl font-bold text-navy">
          {notFound ? "Client introuvable" : "Chargement impossible"}
        </h2>
        {!notFound && (
          <p className="mt-2 text-sm text-ink-mid">
            {error instanceof Error ? error.message : "Erreur inconnue."}
          </p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          {!notFound && (
            <button onClick={() => refetch()} className="btn btn-navy">
              <RotateCw className="h-4 w-4" /> Réessayer
            </button>
          )}
          <Link href="/clients" className="btn btn-outline">
            <ArrowLeft className="h-4 w-4" /> Retour aux clients
          </Link>
        </div>
      </div>
    );
  }

  // Monté une fois la donnée résolue → le statut optimiste s'initialise depuis
  // les props, sans synchronisation par effet.
  return <ClientDetail id={params.id} client={toClientView(data)} />;
}

function ClientDetail({ id, client }: { id: string; client: ClientView }) {
  const update = useUpdateClient(id);
  const [status, setStatus] = useState<ClientStatus>(client.status);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const noPrefs =
    PREFS.every((p) => client[p.key].length === 0) && client.householdSize == null;

  const changeStatus = (next: ClientStatus) => {
    const prev = status;
    setStatus(next);
    update.mutate({ status: next }, { onError: () => setStatus(prev) });
  };

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
              <PhotoDeProfil
                userId={client.userId}
                nom={client.name}
                url={client.avatarUrl}
                tone="terra"
                className="h-20 w-20 rounded-full font-display text-2xl"
              />
              <p className="mt-3 font-display text-xl font-bold">
                {client.name}
              </p>
              <Badge tone={clientTone[status]} className="mt-2">
                {clientLabel[status]}
              </Badge>
              <div className="mt-4 w-full space-y-2 text-left text-xs text-white/70">
                <p className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-terra-soft" />
                  {client.email || DASH}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-terra-soft" />
                  {client.phone ?? DASH}
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra-soft" />
                  {client.address ?? "Adresse non renseignée"}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-3">
            <KpiBox
              Icon={CalendarRange}
              label="Sessions"
              value={client.ordersCount ?? DASH}
            />
            <KpiBox
              Icon={Wallet}
              label="Dépensé"
              value={client.totalSpent != null ? euros(client.totalSpent) : DASH}
            />
            <KpiBox
              Icon={Flame}
              label="Piment"
              value={client.spiceLevel ? `${client.spiceLevel}/5` : DASH}
            />
          </div>

          {/* Préférences */}
          <section className="card p-5">
            <h4 className="mb-3 flex items-center justify-between font-display text-base font-bold text-navy">
              Profil culinaire
              {!editingPrefs && (
                <button
                  type="button"
                  onClick={() => setEditingPrefs(true)}
                  className="btn btn-sm btn-ghost"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> Modifier
                </button>
              )}
            </h4>
            {editingPrefs ? (
              <PrefsEditor id={id} client={client} onDone={() => setEditingPrefs(false)} />
            ) : (
              <>
                {PREFS.map((p) => (
                  <PrefBlock key={p.key} title={p.title} items={client[p.key]} tone={p.tone} />
                ))}
                {client.householdSize != null && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-ink-mid">
                    <Home className="h-3.5 w-3.5 text-ink-soft" />
                    Foyer : {client.householdSize}
                  </div>
                )}
                {noPrefs && (
                  <p className="text-xs text-ink-soft">Aucune préférence renseignée.</p>
                )}
              </>
            )}
          </section>

          {/* Actions */}
          <section className="card p-5">
            <h4 className="mb-3 flex items-center justify-between font-display text-base font-bold text-navy">
              Actions
              {update.isPending && (
                <span className="font-mono text-[10px] font-normal uppercase tracking-wide text-ink-soft">
                  Enregistrement…
                </span>
              )}
            </h4>
            <div className="space-y-2">
              {status !== "vip" && (
                <ActionButton
                  Icon={Crown}
                  label="Passer en VIP"
                  tone="terra"
                  disabled={update.isPending}
                  onClick={() => changeStatus("vip")}
                />
              )}
              {status === "inactive" ? (
                <ActionButton
                  Icon={CheckCircle2}
                  label="Réactiver le client"
                  tone="success"
                  disabled={update.isPending}
                  onClick={() => changeStatus("active")}
                />
              ) : (
                <ActionButton
                  Icon={Ban}
                  label="Suspendre le client"
                  tone="danger"
                  disabled={update.isPending}
                  onClick={() => changeStatus("inactive")}
                />
              )}
              {status !== "active" && status !== "inactive" && (
                <ActionButton
                  Icon={CheckCircle2}
                  label="Marquer comme actif"
                  tone="success"
                  disabled={update.isPending}
                  onClick={() => changeStatus("active")}
                />
              )}
            </div>
            {update.isError && (
              <p className="mt-2 text-xs text-danger">
                Échec de la mise à jour du statut.
              </p>
            )}
          </section>

          {/* Rôle applicatif — droits d'accès (users.role) */}
          <section className="card p-5">
            <h4 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-navy">
              <ShieldCheck className="h-4 w-4 text-terra" />
              Rôle & accès
            </h4>
            <p className="mb-3 text-xs leading-relaxed text-ink-mid">
              Détermine les droits du compte. Passer quelqu&apos;un en{" "}
              <strong>admin</strong> lui ouvre cette console.
            </p>
            <RoleEditor userId={client.userId} role={client.role} />
          </section>

          <WriteToUserButton userId={client.userId} variant="card" />

          <section className="card p-5">
            <h4 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-navy">
              <Trash2 className="h-4 w-4 text-danger" />
              Fermer ce compte
            </h4>
            <p className="mb-3 text-xs leading-relaxed text-ink-mid">
              Définitif : le compte Clerk est supprimé et la personne ne peut plus
              se connecter. L&apos;API refuse tant qu&apos;une réservation est
              ouverte.
            </p>
            <DeleteAccountButton
              userId={client.userId}
              nom={client.name || client.email}
              role="client"
              retourVers="/clients"
            />
          </section>
        </aside>

        {/* Colonne droite : activité */}
        <div className="space-y-6">
          {/* Notes internes (kitchenNotes) */}
          <section className="rounded-3xl border border-terra/30 bg-terra-pale/30 p-5">
            <p className="mb-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-terra-deep">
              <Sparkles className="h-3.5 w-3.5" /> Note cuisine
            </p>
            <p className="text-sm text-navy">
              {client.kitchenNotes?.trim() || "Aucune note pour ce client."}
            </p>
          </section>

          {/* Historique — non fourni par l'API pour l'instant */}
          <section className="card p-6">
            <h3 className="mb-4 font-display text-lg font-bold text-navy">
              Historique des sessions
            </h3>
            <p className="py-6 text-center text-sm text-ink-soft">
              L&apos;historique des réservations sera disponible ici une fois
              l&apos;endpoint correspondant exposé par l&apos;API.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  Icon,
  label,
  tone,
  onClick,
  disabled,
}: {
  Icon: typeof Wallet;
  label: string;
  tone: "terra" | "success" | "danger" | "neutral";
  onClick: () => void;
  disabled?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    terra: "text-terra-deep hover:border-terra/40 hover:bg-terra/5",
    success: "text-success hover:border-success/40 hover:bg-success-soft/50",
    danger: "text-danger hover:border-danger/40 hover:bg-danger-soft/50",
    neutral: "text-ink-mid hover:border-navy/30 hover:bg-cream-soft",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-[rgba(0,35,75,0.1)] px-3.5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        tones[tone],
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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
  if (items.length === 0) return null;
  return (
    <div className="mb-2.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
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
    </div>
  );
}

/**
 * L'admin corrige le profil culinaire à la place du client (A-17). Seules les
 * listes changées partent : l'API journalise chaque champ envoyé, avant et
 * après, et le journal doit dire ce qui a vraiment été corrigé.
 */
function PrefsEditor({
  id,
  client,
  onDone,
}: {
  id: string;
  client: ClientView;
  onDone: () => void;
}) {
  const update = useUpdateClient(id);
  const toast = useToast();
  const [lists, setLists] = useState<Record<PrefKey, string[]>>(() => ({
    dietaryPreferences: client.dietaryPreferences,
    allergies: client.allergies,
    dislikes: client.dislikes,
    favorites: client.favorites,
  }));

  function save() {
    const patch = Object.fromEntries(
      PREFS.filter((p) => lists[p.key].join("\n") !== client[p.key].join("\n")).map(
        (p) => [p.key, lists[p.key]],
      ),
    );
    if (Object.keys(patch).length === 0) return onDone();
    update.mutate(patch, {
      onSuccess: () => {
        toast.success("Profil culinaire corrigé");
        onDone();
      },
      onError: (e) => toast.error("La correction n'est pas enregistrée", adminErrorMessage(e)),
    });
  }

  return (
    <div className="space-y-4">
      {PREFS.map((p) => (
        <TagsField
          key={p.key}
          title={p.title}
          tone={p.tone}
          items={lists[p.key]}
          suggestions={SUGGEST[p.key]}
          onChange={(items) => setLists((l) => ({ ...l, [p.key]: items }))}
        />
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={update.isPending}
          className="btn btn-sm btn-navy"
        >
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={update.isPending}
          className="btn btn-sm btn-ghost"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function TagsField({
  title,
  tone,
  items,
  suggestions,
  onChange,
}: {
  title: string;
  tone: "teal" | "danger";
  items: string[];
  suggestions: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add(value: string) {
    const v = value.trim();
    if (v && !items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      onChange([...items, v]);
    }
    setDraft("");
  }

  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span
            key={it}
            className={cn(
              "inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1.5 text-[11px] font-medium",
              tone === "teal" ? "bg-teal-pale text-teal" : "bg-danger-soft text-danger",
            )}
          >
            {it}
            <button
              type="button"
              onClick={() => onChange(items.filter((i) => i !== it))}
              aria-label={`Retirer ${it}`}
              className="rounded-full p-0.5 hover:bg-white/60"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
        {suggestions
          .filter((s) => !items.includes(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[rgba(0,35,75,0.2)] px-2.5 py-0.5 text-[11px] text-ink-mid hover:border-navy/40 hover:text-navy"
            >
              <Plus className="h-3 w-3" aria-hidden /> {s}
            </button>
          ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          }
        }}
        // Tapé sans Entrée puis « Enregistrer » : la saisie compte quand même.
        onBlur={() => add(draft)}
        placeholder="Autre… puis Entrée"
        aria-label={`Ajouter — ${title}`}
        className="input-base mt-1.5 py-1.5 text-xs"
      />
    </div>
  );
}
