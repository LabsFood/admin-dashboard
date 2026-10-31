"use client";

import { useSyncExternalStore } from "react";
import type { Me, Role } from "./api/types";

/* ─────────────────────────────────────────────────────────────────────────────
   Mémo local des comptes provisionnés depuis la console.

   L'API n'expose pas de `GET /admin/users` : un compte fraîchement créé
   n'apparaît donc dans aucune liste (`GET /admin/clients` ne renvoie que les
   `client_profiles`, créés côté espace client). On garde ici, dans le
   localStorage du navigateur, la trace des comptes créés afin de pouvoir
   revenir dessus — notamment pour ajuster leur rôle.

   Ce n'est qu'un pense-bête d'interface : la source de vérité reste Postgres.
   À supprimer le jour où l'API expose une vraie liste d'utilisateurs.
   ───────────────────────────────────────────────────────────────────────────── */

const KEY = "labsfood-admin-recent-users";
const MAX = 30;

export interface ProvisionedUser {
  /** uuid `users.id` — la clé attendue par `PATCH /admin/users/{id}/role`. */
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  /** Date de création côté console (ISO). */
  createdAt: string;
}

let cache: ProvisionedUser[] | null = null;
const listeners = new Set<() => void>();

/** Snapshot serveur — stable, évite toute lecture de localStorage au SSR. */
const EMPTY: ProvisionedUser[] = [];

function read(): ProvisionedUser[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    cache = Array.isArray(parsed) ? (parsed as ProvisionedUser[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: ProvisionedUser[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / mode privé — le mémo est optionnel, on ignore */
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Synchronise les autres onglets de la console.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cache = null;
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

/** Ajoute (ou rafraîchit) un compte provisionné, le plus récent en tête. */
export function rememberUser(user: Me) {
  const entry: ProvisionedUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: new Date().toISOString(),
  };
  write([entry, ...read().filter((u) => u.id !== entry.id)].slice(0, MAX));
}

/** Reflète un changement de rôle réussi dans le mémo. */
export function rememberRole(id: string, role: Role) {
  write(read().map((u) => (u.id === id ? { ...u, role } : u)));
}

/** Retire une entrée du mémo (sans rien supprimer côté API). */
export function forgetUser(id: string) {
  write(read().filter((u) => u.id !== id));
}

export function useRecentUsers(): ProvisionedUser[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
