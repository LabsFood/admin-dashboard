"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Clock3,
  Info,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import UserForm from "@/components/admin/UserForm";
import RoleEditor from "@/components/admin/RoleEditor";
import { cn, initials, timeAgo } from "@/lib/utils";
import { roleLabel, roleTone } from "@/lib/status";
import { useClients } from "@/lib/api/admin";
import { toClientView } from "@/lib/api/adapt";
import { forgetUser, useRecentUsers } from "@/lib/recent-users";
import type { Role } from "@/lib/api/types";

export default function UtilisateursPage() {
  const recent = useRecentUsers();
  const [query, setQuery] = useState("");

  const { data, isPending, isError, error, refetch } = useClients();

  const existing = useMemo(() => {
    const rows = (data ?? []).map(toClientView);
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-6">
      {/* Bandeau — ce que fait réellement l'API */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white lg:p-7"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-terra/25 blur-3xl" />
        <p className="relative font-mono text-[10px] uppercase tracking-[0.2em] text-terra-soft">
          Comptes & accès
        </p>
        <h2 className="relative mt-1.5 font-display text-2xl font-bold lg:text-3xl">
          Utilisateurs
        </h2>
        <p className="relative mt-1 max-w-2xl text-sm text-white/65">
          Créer un compte provisionne l&apos;utilisateur dans Clerk et sa ligne
          en base, avec le rôle choisi. Le rôle est la source de vérité des
          droits : seuls les comptes <strong>admin</strong> accèdent à cette
          console.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* ── Création ─────────────────────────────────────────────────── */}
        <section className="card h-fit p-6">
          <h3 className="font-display text-base font-bold text-navy">
            Nouveau compte
          </h3>
          <p className="mt-1 mb-5 text-xs leading-relaxed text-ink-mid">
            Seul l&apos;email est obligatoire.
          </p>
          <UserForm />
        </section>

        <div className="space-y-6">
          {/* ── Comptes créés depuis la console ────────────────────────── */}
          <section className="card p-6">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
                <Sparkles className="h-4 w-4 text-terra" />
                Créés depuis la console
              </h3>
              {recent.length > 0 && (
                <Badge tone="neutral">{recent.length}</Badge>
              )}
            </div>
            <p className="mb-4 text-xs leading-relaxed text-ink-mid">
              L&apos;API ne propose pas encore de liste d&apos;utilisateurs :
              cette section est un pense-bête conservé dans ce navigateur pour
              retrouver les comptes que tu viens de créer.
            </p>

            {recent.length === 0 ? (
              <p className="rounded-2xl bg-cream-soft px-4 py-6 text-center text-sm text-ink-soft">
                Aucun compte créé depuis ce navigateur.
              </p>
            ) : (
              <ul className="space-y-3">
                {recent.map((u) => (
                  <UserCard
                    key={u.id}
                    name={u.fullName?.trim() || u.email}
                    email={u.email}
                    userId={u.id}
                    role={u.role}
                    meta={`Créé ${timeAgo(u.createdAt)}`}
                    onForget={() => forgetUser(u.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* ── Comptes existants (profils clients) ────────────────────── */}
          <section className="card p-6">
            <div className="mb-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
                <Users className="h-4 w-4 text-teal" />
                Comptes existants
              </h3>
              <div className="relative sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nom, email…"
                  className="input-base pl-9"
                />
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-ink-mid">
              Issus du fichier clients — un compte n&apos;y apparaît
              qu&apos;après sa première connexion à l&apos;espace client.
            </p>

            {isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 animate-pulse rounded-2xl bg-cream-soft"
                  />
                ))}
              </div>
            ) : isError ? (
              <div>
                <EmptyState
                  Icon={Users}
                  title="Chargement impossible"
                  text={
                    error instanceof Error
                      ? error.message
                      : "Impossible de récupérer les comptes depuis l'API."
                  }
                />
                <div className="flex justify-center">
                  <button onClick={() => refetch()} className="btn btn-navy">
                    <RotateCw className="h-4 w-4" /> Réessayer
                  </button>
                </div>
              </div>
            ) : existing.length === 0 ? (
              <p className="rounded-2xl bg-cream-soft px-4 py-6 text-center text-sm text-ink-soft">
                Aucun compte ne correspond à cette recherche.
              </p>
            ) : (
              <ul className="space-y-3">
                {existing.map((c) => (
                  <UserCard
                    key={c.id}
                    name={c.name}
                    email={c.email}
                    userId={c.userId}
                    role={c.role}
                    href={`/clients/${c.id}`}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* ── Limite backend connue ──────────────────────────────────── */}
          <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-navy/20 bg-cream-soft px-4 py-3.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
            <p className="text-xs leading-relaxed text-ink-mid">
              <span className="font-semibold text-navy">
                Nom, prénom et téléphone ne sont pas modifiables ici :
              </span>{" "}
              l&apos;API expose la création du compte et le changement de rôle,
              mais aucun endpoint de mise à jour des informations personnelles
              d&apos;un autre utilisateur. Le rôle et le profil culinaire
              restent les seuls champs éditables côté console.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserCard({
  name,
  email,
  userId,
  role,
  meta,
  href,
  onForget,
}: {
  name: string;
  email: string;
  userId: string;
  role: Role;
  meta?: string;
  href?: string;
  onForget?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="rounded-2xl border border-[rgba(0,35,75,0.09)] bg-paper p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-xs font-bold text-white">
          {initials(name)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {href ? (
                <Link
                  href={href}
                  className="truncate font-semibold text-navy hover:text-terra"
                >
                  {name}
                </Link>
              ) : (
                <p className="truncate font-semibold text-navy">{name}</p>
              )}
              <p className="truncate font-mono text-[11px] text-ink-soft">
                {email}
              </p>
            </div>
            <Badge tone={roleTone[role]}>{roleLabel[role]}</Badge>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors",
                open ? "text-navy" : "text-terra hover:text-terra-deep",
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {open ? "Masquer" : "Modifier le rôle"}
            </button>
            {meta && (
              <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
                <Clock3 className="h-3 w-3" />
                {meta}
              </span>
            )}
            {onForget && (
              <button
                type="button"
                onClick={onForget}
                title="Retirer de cette liste (ne supprime pas le compte)"
                className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-soft hover:text-danger"
              >
                <X className="h-3 w-3" /> Retirer
              </button>
            )}
          </div>

          {open && (
            <div className="mt-3 border-t border-[rgba(0,35,75,0.07)] pt-3">
              <RoleEditor userId={userId} role={role} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
