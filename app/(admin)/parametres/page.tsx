"use client";

import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Check,
  CreditCard,
  Flame,
  Tags,
  Layers2,
  Loader2,
  Lock,
  Save,
  UserCircle2,
} from "lucide-react";
import InfoPopover from "@/components/ui/InfoPopover";
import TierRules from "@/components/admin/TierRules";
import { useAuth } from "@/lib/auth";
import {
  useChefTierNames,
  useRecipeProfileSetting,
  useReheatModeSetting,
  useSetChefTierNames,
  useSetRecipeProfiles,
  useSetReheatModes,
} from "@/lib/api/admin";
import { CHEF_TIERS, type ChefTier } from "@/lib/api/chefs";
import { adminErrorMessage } from "@/lib/api/errors";

export default function ParametresPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<string | null>(null);
  const [notifs, setNotifs] = useState({
    newReservation: true,
    newDemande: true,
    newMessage: true,
    weeklyReport: false,
  });

  const flash = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 1800);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Profil admin */}
      <Section title="Mon compte" Icon={UserCircle2}>
        <Field label="Nom complet">
          <input defaultValue={user?.name} className="input-base" />
        </Field>
        <Field label="Email">
          <input
            type="email"
            defaultValue={user?.email}
            className="input-base"
          />
        </Field>
        <Field label="Rôle">
          <input
            defaultValue={user?.role}
            disabled
            className="input-base opacity-70"
          />
        </Field>
        <SaveButton saved={saved === "compte"} onClick={() => flash("compte")} />
      </Section>

      {/* Entreprise */}
      <Section title="Entreprise" eyebrow="Lab's Food" Icon={Building2}>
        <Field label="Nom commercial">
          <input defaultValue="Lab's Food" className="input-base" />
        </Field>
        <Field label="Email de contact">
          <input
            type="email"
            defaultValue="contact@labsfood.fr"
            className="input-base"
          />
        </Field>
        <Field label="Zone d'intervention">
          <input defaultValue="Côte d'Azur" className="input-base" />
        </Field>
        <SaveButton
          saved={saved === "entreprise"}
          onClick={() => flash("entreprise")}
        />
      </Section>

      {/* Notifications */}
      <Section title="Notifications" Icon={Bell}>
        {[
          {
            key: "newReservation",
            label: "Nouvelle réservation",
            sub: "Quand un client réserve une session.",
          },
          {
            key: "newDemande",
            label: "Demande sur-mesure",
            sub: "Quand un brief est soumis.",
          },
          {
            key: "newMessage",
            label: "Message client",
            sub: "Nouveau message dans la messagerie.",
          },
          {
            key: "weeklyReport",
            label: "Rapport hebdomadaire",
            sub: "Synthèse de l'activité chaque lundi.",
          },
        ].map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between border-b border-[rgba(0,35,75,0.06)] py-2.5 last:border-0"
          >
            <div>
              <p className="text-sm font-semibold text-navy">{row.label}</p>
              <p className="text-xs text-ink-soft">{row.sub}</p>
            </div>
            <Toggle
              on={(notifs as Record<string, boolean>)[row.key]}
              onChange={(v) =>
                setNotifs({ ...notifs, [row.key]: v } as typeof notifs)
              }
            />
          </div>
        ))}
      </Section>

      {/* Sécurité */}
      <Section title="Sécurité" eyebrow="Mot de passe" Icon={Lock}>
        <Field label="Mot de passe actuel">
          <input type="password" className="input-base" />
        </Field>
        <Field label="Nouveau mot de passe">
          <input
            type="password"
            placeholder="Minimum 8 caractères"
            className="input-base"
          />
        </Field>
        <Field label="Confirmer le mot de passe">
          <input type="password" className="input-base" />
        </Field>
        <SaveButton
          saved={saved === "securite"}
          onClick={() => flash("securite")}
          label="Mettre à jour"
        />
      </Section>

      {/* Facturation */}
      <div className="lg:col-span-2">
        <Section title="Facturation & paiements" eyebrow="Finance" Icon={CreditCard}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="TVA (%)">
              <input defaultValue="0" className="input-base" />
            </Field>
            <Field label="Crédit d'impôt SAP (%)">
              <input defaultValue="50" className="input-base" />
            </Field>
            <Field label="Devise">
              <select className="input-base">
                <option>EUR (€)</option>
                <option>USD ($)</option>
              </select>
            </Field>
          </div>
          <p className="rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs text-ink-mid">
            Service à la personne — les prestations batch cooking ouvrent droit
            à un crédit d&apos;impôt de 50 % pour les clients.
          </p>
          <SaveButton
            saved={saved === "facturation"}
            onClick={() => flash("facturation")}
          />
        </Section>
      </div>

      <div className="lg:col-span-2">
        <PaliersBatchCookers />
      </div>

      <div className="lg:col-span-2">
        <ModesRechauffage />
      </div>

      <div className="lg:col-span-2">
        <ProfilsRecette />
      </div>
    </div>
  );
}

/**
 * Le nom des quatre paliers (module Recettes, R34), branché sur l'API :
 * `/admin/settings/chef-tiers`. Le batch cooker voit le nouveau nom dans son
 * espace sans déploiement.
 */
function PaliersBatchCookers() {
  const noms = useChefTierNames();
  const save = useSetChefTierNames();
  const [brouillon, setBrouillon] = useState<Record<ChefTier, string> | null>(null);
  const valeurs = brouillon ?? noms.data?.labels;
  const incomplet = !valeurs || CHEF_TIERS.some((t) => !valeurs[t].trim());

  return (
    <Section title="Paliers des batch cookers" eyebrow="Recettes" Icon={Layers2}>
      <p className="flex items-center gap-1 text-xs text-ink-mid">
        Le nom de chaque palier, ce qu&apos;il permet et la commission qu&apos;il paie.
        <InfoPopover label="À quoi servent les paliers ?">
          Chaque batch cooker reçoit un palier depuis sa fiche (le premier
          d&apos;office). Renommer un palier ne change le palier de personne. Pour
          l&apos;instant tous les batch cookers sont au palier 1, qui permet tout au
          taux de commission de la plateforme ; les paliers 2 à 4 seront définis
          plus tard.
        </InfoPopover>
      </p>

      {noms.isPending ? (
        <SkeletonGroup>
          <Skeleton className="h-24 rounded-xl" />
        </SkeletonGroup>
      ) : noms.isError || !valeurs ? (
        <p role="alert" className="flex items-start gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {adminErrorMessage(noms.error)}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CHEF_TIERS.map((tier, i) => (
            <div key={tier} className="hairline space-y-2 rounded-xl border p-3">
              <label className="block">
                <span className="field-label">
                  Palier {i + 1} <span className="font-mono">({tier})</span>
                </span>
                <input
                  value={valeurs[tier]}
                  maxLength={40}
                  onChange={(e) => setBrouillon({ ...valeurs, [tier]: e.target.value })}
                  aria-invalid={!valeurs[tier].trim()}
                  className="input-base"
                />
              </label>
              {noms.data?.rules?.[tier] && <TierRules rule={noms.data.rules[tier]} />}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            brouillon && save.mutate(brouillon, { onSuccess: () => setBrouillon(null) })
          }
          disabled={!brouillon || incomplet || save.isPending}
          className="btn btn-primary"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Enregistrer les noms
        </button>
        {save.isSuccess && !brouillon && (
          <span className="flex items-center gap-1.5 text-[12px] text-success">
            <Check className="h-3.5 w-3.5" aria-hidden /> Noms enregistrés.
          </span>
        )}
        {save.isError && (
          <span role="alert" className="text-[12px] text-danger">
            {adminErrorMessage(save.error)}
          </span>
        )}
      </div>
    </Section>
  );
}

/** « Micro-ondes » → `micro-ondes` : le code que l'API accepte, tiré du libellé. */
const codeDe = (label: string) =>
  label
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

/**
 * Les modes de réchauffage (module Recettes §4.6) : `/admin/settings/reheat-modes`.
 * Le batch cooker les coche sur sa fiche ; le code reste, le libellé se renomme.
 */
function ModesRechauffage() {
  const liste = useReheatModeSetting();
  const save = useSetReheatModes();
  return (
    <ListeReglable
      title="Modes de réchauffage"
      Icon={Flame}
      intro="Ce que le batch cooker coche sur sa fiche, dans cet ordre."
      popoverLabel="Que change cette liste ?"
      popover="Renommer un mode change son libellé partout. En retirer un ne touche pas les fiches qui le portent : elles le gardent jusqu'à leur prochain enregistrement, où il faudra en choisir un autre. Aucune recette ne change de version pour autant."
      placeholder="Nouveau mode (ex. Air fryer)"
      items={liste.data?.modes}
      isPending={liste.isPending}
      error={liste.isError ? liste.error : null}
      save={save}
    />
  );
}

/** Les profils d'une recette (§4.8) : `/admin/settings/recipe-profiles`. */
function ProfilsRecette() {
  const liste = useRecipeProfileSetting();
  const save = useSetRecipeProfiles();
  return (
    <ListeReglable
      title="Profils de recette"
      Icon={Tags}
      intro="Ce qui aide un client à trouver un plat : adapté aux enfants, sportif…"
      popoverLabel="Que change cette liste ?"
      popover="Renommer un profil change son libellé partout, vitrine comprise. En retirer un ne touche pas les fiches qui le portent : elles le gardent jusqu'à leur prochain enregistrement."
      placeholder="Nouveau profil (ex. Sans cuisson)"
      items={liste.data?.profiles}
      isPending={liste.isPending}
      error={liste.isError ? liste.error : null}
      save={save}
    />
  );
}

/** Une liste qu'un admin règle : un code stable, un libellé qui se renomme. */
function ListeReglable({
  title,
  Icon,
  intro,
  popoverLabel,
  popover,
  placeholder,
  items,
  isPending,
  error,
  save,
}: {
  title: string;
  Icon: typeof Bell;
  intro: string;
  popoverLabel: string;
  popover: string;
  placeholder: string;
  items: { code: string; label: string }[] | undefined;
  isPending: boolean;
  error: unknown;
  save: {
    mutate: (
      items: { code: string; label: string }[],
      options: { onSuccess: () => void },
    ) => void;
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
  };
}) {
  const [brouillon, setBrouillon] = useState<{ code: string; label: string }[] | null>(null);
  const [nouveau, setNouveau] = useState("");
  const modes = brouillon ?? items;
  const incomplet = !modes || modes.length === 0 || modes.some((m) => !m.label.trim());
  const liste = { isPending, isError: error != null, error };

  function ajouter() {
    if (!modes) return;
    const label = nouveau.trim();
    const base = codeDe(label);
    if (!label || !base) return;
    let code = base;
    for (let n = 2; modes.some((m) => m.code === code); n++) code = `${base}-${n}`;
    setBrouillon([...modes, { code, label }]);
    setNouveau("");
  }

  return (
    <Section title={title} eyebrow="Recettes" Icon={Icon}>
      <p className="flex items-center gap-1 text-xs text-ink-mid">
        {intro}
        <InfoPopover label={popoverLabel}>{popover}</InfoPopover>
      </p>

      {liste.isPending ? (
        <SkeletonGroup>
          <Skeleton className="h-24 rounded-xl" />
        </SkeletonGroup>
      ) : liste.isError || !modes ? (
        <p role="alert" className="flex items-start gap-1.5 text-[12px] text-danger">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {adminErrorMessage(liste.error)}
        </p>
      ) : (
        <ul className="space-y-2">
          {modes.map((m, i) => (
            <li key={m.code} className="flex items-center gap-2">
              <input
                value={m.label}
                maxLength={60}
                onChange={(e) =>
                  setBrouillon(modes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                aria-label={`Libellé du mode ${m.code}`}
                aria-invalid={!m.label.trim()}
                className="input-base flex-1"
              />
              <span className="w-32 shrink-0 truncate font-mono text-xs text-ink-soft">
                {m.code}
              </span>
              <button
                type="button"
                onClick={() => setBrouillon(modes.filter((_, j) => j !== i))}
                disabled={modes.length === 1}
                className="btn btn-sm btn-outline"
              >
                Retirer
              </button>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <input
              value={nouveau}
              maxLength={60}
              onChange={(e) => setNouveau(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  ajouter();
                }
              }}
              placeholder={placeholder}
              className="input-base flex-1"
            />
            <button type="button" onClick={ajouter} className="btn btn-sm btn-outline">
              Ajouter
            </button>
          </li>
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            brouillon && save.mutate(brouillon, { onSuccess: () => setBrouillon(null) })
          }
          disabled={!brouillon || incomplet || save.isPending}
          className="btn btn-primary"
        >
          {save.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Enregistrer la liste
        </button>
        {save.isSuccess && !brouillon && (
          <span className="flex items-center gap-1.5 text-[12px] text-success">
            <Check className="h-3.5 w-3.5" aria-hidden /> Liste enregistrée.
          </span>
        )}
        {save.isError && (
          <span role="alert" className="text-[12px] text-danger">
            {adminErrorMessage(save.error)}
          </span>
        )}
      </div>
    </Section>
  );
}

function Section({
  title,
  eyebrow,
  Icon,
  children,
}: {
  title: string;
  eyebrow?: string;
  Icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          {eyebrow && (
            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">
              {eyebrow}
            </p>
          )}
          <h3 className="mt-0.5 font-display text-lg font-bold text-navy">
            {title}
          </h3>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-terra/12 text-terra-deep">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-ink-soft">
        {label}
      </p>
      {children}
    </div>
  );
}

function SaveButton({
  saved,
  onClick,
  label = "Enregistrer",
}: {
  saved: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button onClick={onClick} className="btn btn-primary">
      {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
      {saved ? "Enregistré" : label}
    </button>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`hit relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-terra" : "bg-cream-deep"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
