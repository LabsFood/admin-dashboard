"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Info,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toaster";
import { cn, euros } from "@/lib/utils";
import {
  useFormules,
  useUpdateFormule,
  type Formule,
  type FormulePatch,
} from "@/lib/api/formules";
import { useAdminDashboard } from "@/lib/api/dashboard";
import { adminErrorMessage } from "@/lib/api/errors";

/* ─────────────────────────────────────────────────────────────────────────────
   Les formules — `GET /admin/formules`, `PATCH /admin/formules/{id}`.

   Ce que le client choisit en réservant, avec deux prix : le TTC et ce qu'il
   paie réellement après le crédit d'impôt de 50 %. L'API stocke les deux et
   n'en déduit aucun : la console propose la moitié et laisse corriger, mais
   c'est ce qui est écrit ici qui s'affiche sur le site.

   L'écran montrait « sessions vendues » et un chiffre d'affaires par formule
   tirés d'un mock. Le nombre de réservations par formule existe vraiment — il
   vient de `GET /admin/dashboard` — mais pas le chiffre d'affaires par
   formule : il n'est nulle part. On montre donc le premier, pas le second.

   Ni création ni suppression : les quatre formules sont posées en base.
   Désactiver, c'est cesser de la proposer aux nouveaux clients sans toucher
   aux réservations déjà prises.
   ───────────────────────────────────────────────────────────────────────────── */

export default function FormulesPage() {
  const formules = useFormules();
  const figures = useAdminDashboard();

  const liste = formules.data ?? [];
  /** Combien de réservations pour chaque formule, depuis les chiffres réels. */
  const reservations = new Map(
    (figures.data?.formuleSplit ?? []).map((s) => [s.key, s.count]),
  );
  const total = [...reservations.values()].reduce((n, v) => n + v, 0);

  if (formules.isError) {
    return (
      <section className="card p-6">
        <p className="flex items-start gap-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {adminErrorMessage(formules.error)}
        </p>
        <button onClick={() => formules.refetch()} className="btn btn-outline btn-sm mt-4">
          <RotateCw className="h-3 w-3" aria-hidden /> Réessayer
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <div className="card flex items-center gap-3 p-5">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra/12 text-terra-deep"
          >
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold text-navy">
              {figures.isPending ? "…" : total}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">
              Réservations, toutes formules
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-5">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-pale text-teal"
          >
            <Check className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-2xl font-bold text-navy">
              {formules.isPending
                ? "…"
                : `${liste.filter((f) => f.active).length}/${liste.length}`}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-ink-soft">
              Formules proposées
            </p>
          </div>
        </div>
        <div className="rounded-3xl bg-navy p-5 text-white">
          <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-terra-soft">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> Avantage fiscal
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/75">
            Service à la personne — crédit d&apos;impôt de{" "}
            <span className="font-bold text-terra-soft">50 %</span>. Il n&apos;est
            pas appliqué par l&apos;API : les deux prix sont saisis.
          </p>
        </div>
      </motion.section>

      {formules.isPending ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-80 animate-pulse" />
          ))}
        </div>
      ) : liste.length === 0 ? (
        <p className="card p-6 text-sm text-ink-soft">
          Aucune formule en base. Elles sont posées côté serveur : la console ne
          sait pas en créer.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
          {liste.map((f, i) => (
            <FormuleCard
              key={f.id}
              formule={f}
              index={i}
              reservations={reservations.get(f.id)}
            />
          ))}
        </div>
      )}

      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
          <Info className="h-4 w-4 text-ink-soft" aria-hidden />
          Ce que l&apos;API ne permet pas
        </h3>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-mid">
          <li>
            <strong>Créer ou supprimer une formule</strong> — seules les quatre
            posées en base existent ; on peut les modifier et les désactiver.
          </li>
          <li>
            <strong>La durée, le nombre de plats, le nombre de personnes</strong>{" "}
            — lisibles, mais absents du corps de modification.
          </li>
          <li>
            <strong>Le chiffre d&apos;affaires par formule</strong> — seul le
            nombre de réservations est compté.
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ── Une formule ───────────────────────────────────────────────────────────── */

function FormuleCard({
  formule: f,
  index,
  reservations,
}: {
  formule: Formule;
  index: number;
  reservations?: number;
}) {
  const toast = useToast();
  const update = useUpdateFormule();

  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(f.name);
  const [ttc, setTtc] = useState(String(Math.round(f.priceTtc / 100)));
  const [apres, setApres] = useState(String(Math.round(f.priceAfterTax / 100)));
  const [features, setFeatures] = useState<string[]>(f.features ?? []);
  const [ajout, setAjout] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState<"prix" | "visibilite" | null>(null);

  function ouvrir() {
    setErreur(null);
    setNom(f.name);
    setTtc(String(Math.round(f.priceTtc / 100)));
    setApres(String(Math.round(f.priceAfterTax / 100)));
    setFeatures(f.features ?? []);
    setAjout("");
    setEditing(true);
  }

  function changerTtc(v: string) {
    setTtc(v);
    const n = Number(v);
    if (v.trim() && Number.isFinite(n)) setApres(String(Math.round(n / 2)));
  }

  const ttcCents = Math.round(Number(ttc) * 100);
  const apresCents = Math.round(Number(apres) * 100);
  const prixChange = ttcCents !== f.priceTtc || apresCents !== f.priceAfterTax;
  const valide =
    nom.trim().length > 0 &&
    Number.isFinite(ttcCents) &&
    ttcCents >= 0 &&
    Number.isFinite(apresCents) &&
    apresCents >= 0 &&
    apresCents <= ttcCents;

  function envoyer() {
    setErreur(null);
    const patch: FormulePatch = {
      name: nom.trim(),
      priceTtc: ttcCents,
      priceAfterTax: apresCents,
      features,
    };
    update.mutate(
      { id: f.id, patch },
      {
        onSuccess: () => {
          setAConfirmer(null);
          setEditing(false);
          toast.success(`« ${nom.trim()} » enregistrée`);
        },
        onError: (e) => setErreur(adminErrorMessage(e)),
      },
    );
  }

  function basculer() {
    update.mutate(
      { id: f.id, patch: { active: !f.active } },
      {
        onSuccess: () => {
          setAConfirmer(null);
          toast.success(
            f.active
              ? `« ${f.name} » n'est plus proposée`
              : `« ${f.name} » est de nouveau proposée`,
            f.active ? "Les réservations déjà prises ne changent pas." : undefined,
          );
        },
        onError: (e) => toast.error("Le changement a échoué", adminErrorMessage(e)),
      },
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.34, delay: Math.min(index * 0.06, 0.3) }}
      className={cn(
        "card relative flex flex-col p-6",
        f.popular && "ring-1 ring-terra/50",
        !f.active && "opacity-75",
      )}
    >
      {f.popular && (
        <span className="absolute -top-2.5 left-6 rounded-full bg-terra px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Populaire
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {editing ? (
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              aria-label="Nom de la formule"
              className="input-base"
            />
          ) : (
            <h3 className="font-display text-xl font-bold text-navy">{f.name}</h3>
          )}
          <p className="mt-0.5 text-xs text-ink-soft">
            {[f.persons, f.duration, f.mealsCount ? `${f.mealsCount} plats` : null]
              .filter(Boolean)
              .join(" · ") || f.id}
          </p>
        </div>
        <Badge tone={f.active ? "success" : "neutral"} dot>
          {f.active ? "Proposée" : "Retirée"}
        </Badge>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="field-label">Prix TTC (€)</span>
            <input
              type="number"
              min={0}
              value={ttc}
              onChange={(e) => changerTtc(e.target.value)}
              className="input-base"
            />
          </label>
          <label className="block">
            <span className="field-label">Après crédit d&apos;impôt (€)</span>
            <input
              type="number"
              min={0}
              value={apres}
              onChange={(e) => setApres(e.target.value)}
              aria-invalid={(apresCents > ttcCents) || undefined}
              className="input-base"
            />
          </label>
          {apresCents > ttcCents && (
            <p className="text-[12px] text-danger">
              Le prix après crédit d&apos;impôt dépasse le TTC.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          {f.priceTtc > 0 ? (
            <>
              <p className="font-display text-3xl font-bold text-navy">
                {euros(Math.round(f.priceTtc / 100))}
              </p>
              <p className="text-xs text-terra-deep">
                soit {euros(Math.round(f.priceAfterTax / 100))} après crédit
                d&apos;impôt
              </p>
            </>
          ) : (
            <p className="font-display text-2xl font-bold text-navy">Sur devis</p>
          )}
        </div>
      )}

      {/* Ce que la formule comprend */}
      <div className="mt-4 flex-1">
        {editing ? (
          <>
            <p className="field-label">Ce qui est compris</p>
            <ul className="space-y-1.5">
              {features.map((feat, i) => (
                <li key={`${feat}-${i}`} className="flex items-center gap-1.5">
                  <input
                    value={feat}
                    onChange={(e) =>
                      setFeatures(features.map((x, j) => (j === i ? e.target.value : x)))
                    }
                    aria-label={`Ligne ${i + 1}`}
                    className="input-base flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setFeatures(features.filter((_, j) => j !== i))}
                    aria-label={`Retirer « ${feat} »`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-danger-soft hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-1.5">
              <input
                value={ajout}
                onChange={(e) => setAjout(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ajout.trim()) {
                    e.preventDefault();
                    setFeatures([...features, ajout.trim()]);
                    setAjout("");
                  }
                }}
                placeholder="Courses incluses"
                aria-label="Ajouter une ligne"
                className="input-base flex-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (!ajout.trim()) return;
                  setFeatures([...features, ajout.trim()]);
                  setAjout("");
                }}
                className="btn btn-sm btn-outline shrink-0"
              >
                <Plus className="h-3 w-3" aria-hidden />
              </button>
            </div>
          </>
        ) : (
          <ul className="space-y-1.5">
            {(f.features ?? []).map((feat) => (
              <li key={feat} className="flex items-start gap-1.5 text-xs text-ink-mid">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-terra" aria-hidden />
                {feat}
              </li>
            ))}
          </ul>
        )}
      </div>

      {erreur && (
        <p role="alert" className="mt-3 text-[12px] leading-relaxed text-danger">
          {erreur}
        </p>
      )}

      <div className="hairline mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-[11px] text-ink-soft">
          {reservations != null
            ? `${reservations} réservation${reservations > 1 ? "s" : ""}`
            : "Aucune réservation"}
        </span>

        {editing ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => (prixChange ? setAConfirmer("prix") : envoyer())}
              disabled={!valide || update.isPending}
              className="btn btn-sm btn-primary"
            >
              {update.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3 w-3" aria-hidden />
              )}
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              aria-label="Annuler"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-soft hover:text-navy"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ouvrir}
              aria-label={`Modifier ${f.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-cream-soft text-navy hover:bg-cream-deep"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAConfirmer("visibilite")}
              disabled={update.isPending}
              role="switch"
              aria-checked={f.active}
              aria-label={`${f.active ? "Retirer" : "Proposer"} ${f.name}`}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                f.active ? "bg-terra" : "bg-cream-deep",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute top-1 h-4 w-4 rounded-full bg-white transition-transform",
                  f.active ? "translate-x-6" : "translate-x-1",
                )}
              />
            </button>
          </div>
        )}
      </div>

      {/* Un prix public ne change pas sans qu'on l'ait relu. */}
      <ConfirmDialog
        open={aConfirmer === "prix"}
        onClose={() => setAConfirmer(null)}
        onConfirm={envoyer}
        pending={update.isPending}
        error={erreur}
        title={`Changer le prix de « ${nom.trim() || f.name} » ?`}
        lead={`Les clients verront ${euros(Math.round(ttcCents / 100))} TTC, soit ${euros(
          Math.round(apresCents / 100),
        )} après crédit d'impôt, au lieu de ${euros(Math.round(f.priceTtc / 100))}.`}
        detail="Le nouveau prix s'applique aux prochaines réservations. Celles déjà prises gardent le montant convenu."
        confirmLabel="Changer le prix"
      />

      <ConfirmDialog
        open={aConfirmer === "visibilite"}
        onClose={() => setAConfirmer(null)}
        onConfirm={basculer}
        pending={update.isPending}
        tone={f.active ? "danger" : "primary"}
        title={
          f.active
            ? `Retirer « ${f.name} » de l'offre ?`
            : `Proposer « ${f.name} » de nouveau ?`
        }
        lead={
          f.active
            ? "Elle disparaît du choix des nouveaux clients. Les réservations déjà prises ne changent pas."
            : "Elle réapparaît dans le choix des clients, au prix affiché ci-dessus."
        }
        confirmLabel={f.active ? "Retirer de l'offre" : "Proposer de nouveau"}
      />
    </motion.article>
  );
}
