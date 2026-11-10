"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  UserPlus,
} from "lucide-react";
import RoleSelect from "@/components/admin/RoleSelect";
import Hint from "@/components/ui/Hint";
import { cn } from "@/lib/utils";
import { useProvisionUser } from "@/lib/api/admin";
import { adminErrorMessage } from "@/lib/api/errors";
import type { Me, Role } from "@/lib/api/types";

/**
 * Formulaire de création d'un compte (`POST /admin/users`) : crée l'utilisateur
 * dans Clerk **et** la ligne Postgres avec le rôle choisi.
 */
export default function UserForm({
  onCreated,
  onCancel,
}: {
  /** Appelé après une création réussie (le formulaire se réinitialise). */
  onCreated?: (user: Me) => void;
  onCancel?: () => void;
}) {
  const provision = useProvisionUser();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("client");
  const [withPassword, setWithPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [created, setCreated] = useState<Me | null>(null);

  const passwordTooShort =
    withPassword && password.length > 0 && password.length < 8;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordTooShort) return;

    provision.mutate(
      {
        email: email.trim(),
        // Champs optionnels : on n'envoie que ce qui est renseigné.
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        ...(withPassword && password ? { password } : {}),
        role,
      },
      {
        onSuccess: (user) => {
          setCreated(user);
          setEmail("");
          setFirstName("");
          setLastName("");
          setPassword("");
          setWithPassword(false);
          setRole("client");
          onCreated?.(user);
        },
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {created && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-success/30 bg-success-soft/60 px-4 py-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div className="min-w-0 text-xs leading-relaxed text-ink-mid">
            <p className="font-semibold text-navy">
              Compte créé pour {created.email}
            </p>
            <p className="mt-0.5">
              Il faudra que la personne se connecte une première fois à
              l&apos;espace client pour apparaître dans le fichier clients.
            </p>
          </div>
        </div>
      )}

      <Hint id="creation-compte-fichier-clients">
        Un compte client créé ici n&apos;apparaît dans le fichier clients qu&apos;après
        la première connexion de la personne à son espace. Sans mot de passe, elle se
        connecte par le lien que Clerk lui envoie.
      </Hint>

      <Field label="Adresse email" required>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="chef@labsfood.fr"
            autoComplete="off"
            className="input-base pl-10"
          />
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Prénom">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Marie"
            className="input-base"
          />
        </Field>
        <Field label="Nom">
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Dupont"
            className="input-base"
          />
        </Field>
      </div>

      <Field label="Rôle">
        <RoleSelect value={role} onChange={setRole} disabled={provision.isPending} />
      </Field>

      {/* Mot de passe — optionnel : sans lui, Clerk crée un compte passwordless. */}
      <div className="rounded-2xl border border-[rgba(0,35,75,0.1)] bg-cream-soft p-3.5">
        <button
          type="button"
          onClick={() => setWithPassword((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-navy">
            <KeyRound className="h-4 w-4 text-ink-soft" />
            Définir un mot de passe initial
          </span>
          <span
            className={cn(
              "relative h-5 w-9 shrink-0 rounded-full transition-colors",
              withPassword ? "bg-terra" : "bg-ink-soft/30",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                withPassword ? "translate-x-[18px]" : "translate-x-0.5",
              )}
            />
          </span>
        </button>

        {withPassword ? (
          <div className="mt-3">
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                autoComplete="new-password"
                minLength={8}
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={
                  showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"
                }
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-soft hover:text-navy"
              >
                {showPwd ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordTooShort && (
              <p className="mt-1.5 text-[11px] text-danger">
                8 caractères minimum (politique Clerk).
              </p>
            )}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft">
            Sans mot de passe, le compte est créé « passwordless » : la personne
            se connecte via le lien envoyé par Clerk.
          </p>
        )}
      </div>

      {provision.isError && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p className="text-xs leading-relaxed text-danger">
            {adminErrorMessage(provision.error)}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={provision.isPending || !email.trim() || passwordTooShort}
          className="btn btn-primary flex-1 disabled:opacity-60"
        >
          {provision.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Création…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" /> Créer le compte
            </>
          )}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Annuler
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
        {required && <span className="text-terra"> *</span>}
      </span>
      {children}
    </label>
  );
}
