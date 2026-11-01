"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Building2,
  Check,
  CreditCard,
  Lock,
  Save,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

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
      <Section title="Mon compte" eyebrow="Identité" Icon={UserCircle2}>
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
      <Section title="Notifications" eyebrow="Alertes" Icon={Bell}>
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
    </div>
  );
}

function Section({
  title,
  eyebrow,
  Icon,
  children,
}: {
  title: string;
  eyebrow: string;
  Icon: typeof Bell;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
            {eyebrow}
          </p>
          <h3 className="mt-0.5 font-display text-lg font-bold text-navy">
            {title}
          </h3>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-terra/12 text-terra-deep">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
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
      <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
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
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
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
