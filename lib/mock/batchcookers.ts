/* ─────────────────────────────────────────────────────────────────────────────
   Gestion des batch cookers — données simulées (démo).

   Miroir côté back-office du modèle décrit dans
   labs-food/docs/PLAN-dashboards-v2.md § 5 bis : chaque pièce a son propre
   état, l'état du dossier est **dérivé** de celles-ci.
   ───────────────────────────────────────────────────────────────────────────── */

import type { BadgeTone } from "@/components/ui/Badge";

export type DocStatus =
  | "missing"
  | "submitted"
  | "reviewing"
  | "valid"
  | "rejected"
  | "expiring"
  | "expired";

export const docStatusLabel: Record<DocStatus, string> = {
  missing: "À fournir",
  submitted: "Déposé",
  reviewing: "En vérification",
  valid: "Validé",
  rejected: "Refusé",
  expiring: "Expire bientôt",
  expired: "Expiré",
};

export const docStatusTone: Record<DocStatus, BadgeTone> = {
  missing: "neutral",
  submitted: "info",
  reviewing: "info",
  valid: "success",
  rejected: "danger",
  expiring: "warning",
  expired: "danger",
};

export type DossierStatus =
  | "draft"
  | "awaiting-registration"
  | "incomplete"
  | "reviewing"
  | "validated"
  | "suspended"
  | "disabled";

export const dossierStatusLabel: Record<DossierStatus, string> = {
  draft: "Brouillon",
  "awaiting-registration": "En attente d'immatriculation",
  incomplete: "Pièces à compléter",
  reviewing: "En vérification",
  validated: "Validé",
  suspended: "Suspendu",
  disabled: "Désactivé",
};

export const dossierStatusTone: Record<DossierStatus, BadgeTone> = {
  draft: "neutral",
  "awaiting-registration": "warning",
  incomplete: "warning",
  reviewing: "info",
  validated: "success",
  suspended: "danger",
  disabled: "neutral",
};

export type DocFamily = "blocking" | "recommended" | "conditional";

export const docFamilyLabel: Record<DocFamily, string> = {
  blocking: "Bloquant",
  recommended: "Recommandé",
  conditional: "Conditionnel",
};

export type SapPath = "type-a" | "type-b";

export const sapPathLabel: Record<SapPath, string> = {
  "type-a": "Type A — déclaration NOVA",
  "type-b": "Type B — coopérative",
};

export interface BcDocument {
  id: string;
  label: string;
  family: DocFamily;
  status: DocStatus;
  submittedAt?: string;
  expiresAt?: string;
  rejectionReason?: string;
  /** Aperçu : "pdf" rend une page simulée, "image" affiche previewUrl. */
  format?: "pdf" | "image";
  previewUrl?: string;
  pages?: number;
  sizeKb?: number;
}

export interface BatchCooker {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  zone: string;
  sapPath: SapPath;
  acceptsCesu: boolean;
  registered: boolean;
  dossier: DossierStatus;
  appliedAt: string;
  rating: number | null;
  missionsCount: number;
  documents: BcDocument[];
  // ── Vitrine (champs pas encore portés par l'API — cf. tâches backend) ──
  displayName?: string;
  bio?: string;
  languages?: string[];
  specialties?: string[];
  acceptedPayments?: ("card" | "urssaf" | "cesu")[];
  shoppingIncluded?: boolean;
  isVerified?: boolean;
  isActive?: boolean;
}

/** Recette / menu publié par le batch cooker. */
export interface BcMenu {
  id: string;
  chefId: string;
  name: string;
  country: string;
  category: string;
  portions: number;
  allergens: string[];
  origin: "chef" | "ai";
  published: boolean;
  /** Statut de publication, modifiable par l'admin. */
  status: ContentStatus;
  rejectionReason?: string;
}

/** Prestation réalisée. */
export interface BcSession {
  id: string;
  chefId: string;
  reference: string;
  client: string;
  date: string;
  persons: number;
  meals: number;
  amountTTC: number;
  commission: number;
  net: number;
  paymentMethod: "card" | "urssaf" | "cesu";
  status: "done" | "upcoming" | "cancelled" | "disputed";
}

/** Mouvement financier — sert aussi à la page Transactions globale. */
export interface BcTransaction {
  id: string;
  chefId: string;
  chefName: string;
  date: string;
  reference: string;
  type: "session" | "commission" | "payout" | "subscription";
  paymentMethod: "card" | "urssaf" | "cesu" | null;
  /** Montant client encaissé (positif) ou prélèvement (négatif). */
  amount: number;
  commission: number;
  net: number;
  status: "settled" | "pending" | "failed";
}

export const txTypeLabel: Record<BcTransaction["type"], string> = {
  session: "Prestation",
  commission: "Commission",
  payout: "Versement",
  subscription: "Abonnement",
};

export const txStatusLabel: Record<BcTransaction["status"], string> = {
  settled: "Réglé",
  pending: "En attente",
  failed: "Échec",
};

export const txStatusTone: Record<BcTransaction["status"], BadgeTone> = {
  settled: "success",
  pending: "warning",
  failed: "danger",
};

export const paymentMethodLabel: Record<"card" | "urssaf" | "cesu", string> = {
  card: "Carte bancaire",
  urssaf: "Avance immédiate",
  cesu: "CESU préfinancé",
};

const iso = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

export const BATCH_COOKERS: BatchCooker[] = [
  {
    id: "bc_001",
    name: "Ivy Siyaptze",
    email: "ivy@labsfood.fr",
    phone: "+33 6 11 22 33 44",
    city: "Nice",
    zone: "Nice · Cannes · Antibes (30 km)",
    sapPath: "type-b",
    acceptsCesu: true,
    registered: true,
    dossier: "reviewing",
    appliedAt: iso(-40),
    rating: 4.8,
    missionsCount: 37,
    documents: [
      { id: "identity", label: "Pièce d'identité", family: "blocking", status: "valid", submittedAt: iso(-40), expiresAt: iso(540) },
      { id: "registration", label: "Justificatif d'immatriculation", family: "blocking", status: "valid", submittedAt: iso(-38) },
      { id: "cgu", label: "CGU + mandat de facturation", family: "blocking", status: "valid", submittedAt: iso(-38) },
      { id: "sepa-b2b", label: "Mandat SEPA B2B", family: "blocking", status: "valid", submittedAt: iso(-38) },
      { id: "psp-kyc", label: "Vérification d'identité PSP", family: "blocking", status: "reviewing", submittedAt: iso(-2) },
      { id: "sap-coop", label: "Rattachement à la coopérative", family: "conditional", status: "valid", submittedAt: iso(-30) },
      { id: "crcesu", label: "Affiliation CRCESU", family: "conditional", status: "submitted", submittedAt: iso(-1) },
      { id: "haccp", label: "Formation HACCP", family: "recommended", status: "expiring", submittedAt: iso(-700), expiresAt: iso(24) },
      { id: "rc-pro", label: "Assurance RC Pro", family: "recommended", status: "valid", submittedAt: iso(-160), expiresAt: iso(200) },
      { id: "ddpp", label: "Récépissé DDPP", family: "recommended", status: "rejected", submittedAt: iso(-6), rejectionReason: "Document illisible — scan incomplet." },
    ],
  },
  {
    id: "bc_002",
    name: "Marc Lefèvre",
    email: "marc.lefevre@gmail.com",
    phone: "+33 6 45 78 12 90",
    city: "Cannes",
    zone: "Cannes · Mandelieu (20 km)",
    sapPath: "type-b",
    acceptsCesu: false,
    registered: false,
    dossier: "awaiting-registration",
    appliedAt: iso(-9),
    rating: null,
    missionsCount: 0,
    documents: [
      { id: "identity", label: "Pièce d'identité", family: "blocking", status: "valid", submittedAt: iso(-9), expiresAt: iso(900) },
      { id: "registration", label: "Justificatif d'immatriculation", family: "blocking", status: "missing" },
      { id: "cgu", label: "CGU + mandat de facturation", family: "blocking", status: "valid", submittedAt: iso(-8) },
      { id: "sepa-b2b", label: "Mandat SEPA B2B", family: "blocking", status: "valid", submittedAt: iso(-8) },
      { id: "psp-kyc", label: "Vérification d'identité PSP", family: "blocking", status: "valid", submittedAt: iso(-7) },
      { id: "sap-coop", label: "Rattachement à la coopérative", family: "conditional", status: "submitted", submittedAt: iso(-3) },
    ],
  },
  {
    id: "bc_003",
    name: "Lina Bertrand",
    email: "lina.b@outlook.fr",
    phone: "+33 7 12 98 45 22",
    city: "Antibes",
    zone: "Antibes · Biot (15 km)",
    sapPath: "type-b",
    acceptsCesu: true,
    registered: true,
    dossier: "validated",
    appliedAt: iso(-120),
    rating: 4.6,
    missionsCount: 21,
    documents: [
      { id: "identity", label: "Pièce d'identité", family: "blocking", status: "valid", submittedAt: iso(-120), expiresAt: iso(700) },
      { id: "registration", label: "Justificatif d'immatriculation", family: "blocking", status: "valid", submittedAt: iso(-118) },
      { id: "cgu", label: "CGU + mandat de facturation", family: "blocking", status: "valid", submittedAt: iso(-118) },
      { id: "sepa-b2b", label: "Mandat SEPA B2B", family: "blocking", status: "valid", submittedAt: iso(-118) },
      { id: "psp-kyc", label: "Vérification d'identité PSP", family: "blocking", status: "valid", submittedAt: iso(-117) },
      { id: "sap-coop", label: "Rattachement à la coopérative", family: "conditional", status: "valid", submittedAt: iso(-110) },
      { id: "crcesu", label: "Affiliation CRCESU", family: "conditional", status: "valid", submittedAt: iso(-100) },
      { id: "haccp", label: "Formation HACCP", family: "recommended", status: "valid", submittedAt: iso(-90), expiresAt: iso(600) },
    ],
  },
  {
    id: "bc_004",
    name: "Sofiane Réault",
    email: "sofiane.r@gmail.com",
    phone: "+33 6 33 55 77 11",
    city: "Nice",
    zone: "Nice (10 km)",
    sapPath: "type-b",
    acceptsCesu: false,
    registered: true,
    dossier: "suspended",
    appliedAt: iso(-300),
    rating: 4.2,
    missionsCount: 8,
    documents: [
      { id: "identity", label: "Pièce d'identité", family: "blocking", status: "expired", submittedAt: iso(-300), expiresAt: iso(-12) },
      { id: "registration", label: "Justificatif d'immatriculation", family: "blocking", status: "valid", submittedAt: iso(-298) },
      { id: "cgu", label: "CGU + mandat de facturation", family: "blocking", status: "valid", submittedAt: iso(-298) },
      { id: "sepa-b2b", label: "Mandat SEPA B2B", family: "blocking", status: "valid", submittedAt: iso(-298) },
      { id: "psp-kyc", label: "Vérification d'identité PSP", family: "blocking", status: "valid", submittedAt: iso(-297) },
      { id: "sap-coop", label: "Rattachement à la coopérative", family: "conditional", status: "valid", submittedAt: iso(-290) },
    ],
  },
  {
    id: "bc_005",
    name: "Chloé Mensah",
    email: "chloe.mensah@gmail.com",
    phone: "+33 6 88 21 09 43",
    city: "Grasse",
    zone: "Grasse · Mouans-Sartoux (25 km)",
    sapPath: "type-b",
    acceptsCesu: true,
    registered: true,
    dossier: "incomplete",
    appliedAt: iso(-4),
    rating: null,
    missionsCount: 0,
    documents: [
      { id: "identity", label: "Pièce d'identité", family: "blocking", status: "valid", submittedAt: iso(-4), expiresAt: iso(1200) },
      { id: "registration", label: "Justificatif d'immatriculation", family: "blocking", status: "rejected", submittedAt: iso(-3), rejectionReason: "SIRET illisible sur le document fourni." },
      { id: "cgu", label: "CGU + mandat de facturation", family: "blocking", status: "missing" },
      { id: "sepa-b2b", label: "Mandat SEPA B2B", family: "blocking", status: "missing" },
      { id: "psp-kyc", label: "Vérification d'identité PSP", family: "blocking", status: "missing" },
      { id: "sap-coop", label: "Rattachement à la coopérative", family: "conditional", status: "missing" },
    ],
  },
];

export function batchCookerById(id: string): BatchCooker | undefined {
  return BATCH_COOKERS.find((b) => b.id === id);
}

/** Score de complétude sur les seules pièces bloquantes. */
export function completion(bc: BatchCooker): number {
  const blocking = bc.documents.filter((d) => d.family === "blocking");
  if (blocking.length === 0) return 0;
  const ok = blocking.filter((d) => d.status === "valid" || d.status === "expiring").length;
  return Math.round((ok / blocking.length) * 100);
}

/** File de revue : pièces effectivement en attente d'une décision admin. */
export function pendingReview(bc: BatchCooker): BcDocument[] {
  return bc.documents.filter((d) => d.status === "submitted" || d.status === "reviewing");
}

/* ── Vitrine, menus, prestations et transactions (données simulées) ──────────
   Ces champs n'existent pas encore côté API : ils sont listés dans les tâches
   backend (voir l'artefact « Tâches API »). */

export const BC_SHOWCASE: Record<string, Partial<BatchCooker>> = {
  bc_001: {
    displayName: "Chef Ivy",
    bio: "Cheffe à domicile depuis 8 ans, spécialiste du batch cooking méditerranéen et africain.",
    languages: ["Français", "Anglais"],
    specialties: ["Méditerranéen", "Africain"],
    acceptedPayments: ["card", "urssaf", "cesu"],
    shoppingIncluded: true,
    isVerified: false,
    isActive: false,
  },
  bc_003: {
    displayName: "Lina B.",
    bio: "Cuisine végétarienne et italienne, formée à Turin.",
    languages: ["Français"],
    specialties: ["Végétarien", "Italien"],
    acceptedPayments: ["card", "urssaf"],
    shoppingIncluded: false,
    isVerified: true,
    isActive: true,
  },
};

export const BC_MENUS: BcMenu[] = [
  { id: "m1", chefId: "bc_001", name: "Poulet rôti aux herbes", country: "France", category: "Plat", portions: 3, allergens: [], origin: "chef", published: true, status: "published" },
  { id: "m2", chefId: "bc_001", name: "Risotto aux champignons", country: "Italie", category: "Plat", portions: 3, allergens: ["Lait"], origin: "chef", published: true, status: "published" },
  { id: "m3", chefId: "bc_001", name: "Curry de lentilles corail", country: "Inde", category: "Plat", portions: 3, allergens: [], origin: "chef", published: false, status: "pending" },
  { id: "m4", chefId: "bc_001", name: "Chili sin carne", country: "Mexique", category: "Plat", portions: 3, allergens: [], origin: "ai", published: true, status: "published" },
  { id: "m5", chefId: "bc_003", name: "Lasagnes végétariennes", country: "Italie", category: "Plat", portions: 4, allergens: ["Gluten", "Lait"], origin: "chef", published: true, status: "published" },
];

export const BC_SESSIONS: BcSession[] = [
  { id: "s1", chefId: "bc_001", reference: "LF-2026-0142", client: "Sophie M.", date: iso(3), persons: 3, meals: 4, amountTTC: 220, commission: 22, net: 198, paymentMethod: "urssaf", status: "upcoming" },
  { id: "s2", chefId: "bc_001", reference: "LF-2026-0119", client: "Camille F.", date: iso(-14), persons: 4, meals: 3, amountTTC: 300, commission: 30, net: 270, paymentMethod: "cesu", status: "done" },
  { id: "s3", chefId: "bc_001", reference: "LF-2026-0094", client: "Marc D.", date: iso(-30), persons: 2, meals: 2, amountTTC: 180, commission: 18, net: 162, paymentMethod: "card", status: "disputed" },
  { id: "s4", chefId: "bc_001", reference: "LF-2026-0071", client: "Nadia L.", date: iso(-52), persons: 3, meals: 4, amountTTC: 240, commission: 24, net: 216, paymentMethod: "card", status: "done" },
  { id: "s5", chefId: "bc_003", reference: "LF-2026-0130", client: "Paul V.", date: iso(-8), persons: 2, meals: 3, amountTTC: 180, commission: 18, net: 162, paymentMethod: "card", status: "done" },
];

export const BC_TRANSACTIONS: BcTransaction[] = [
  { id: "t1", chefId: "bc_001", chefName: "Ivy Siyaptze", date: iso(-14), reference: "LF-2026-0119", type: "session", paymentMethod: "cesu", amount: 300, commission: 30, net: 270, status: "pending" },
  { id: "t2", chefId: "bc_001", chefName: "Ivy Siyaptze", date: iso(-30), reference: "LF-2026-0094", type: "session", paymentMethod: "card", amount: 180, commission: 18, net: 162, status: "settled" },
  { id: "t3", chefId: "bc_001", chefName: "Ivy Siyaptze", date: iso(-52), reference: "LF-2026-0071", type: "session", paymentMethod: "card", amount: 240, commission: 24, net: 216, status: "settled" },
  { id: "t4", chefId: "bc_001", chefName: "Ivy Siyaptze", date: iso(-28), reference: "COM-2026-03", type: "commission", paymentMethod: null, amount: -128, commission: 128, net: 0, status: "settled" },
  { id: "t5", chefId: "bc_001", chefName: "Ivy Siyaptze", date: iso(-25), reference: "VER-2026-0311", type: "payout", paymentMethod: null, amount: -846, commission: 0, net: 846, status: "settled" },
  { id: "t6", chefId: "bc_003", chefName: "Lina Bertrand", date: iso(-8), reference: "LF-2026-0130", type: "session", paymentMethod: "card", amount: 180, commission: 18, net: 162, status: "settled" },
  { id: "t7", chefId: "bc_003", chefName: "Lina Bertrand", date: iso(-2), reference: "COM-2026-04", type: "commission", paymentMethod: null, amount: -18, commission: 18, net: 0, status: "pending" },
  { id: "t8", chefId: "bc_002", chefName: "Marc Lefèvre", date: iso(-1), reference: "ABO-2026-04", type: "subscription", paymentMethod: null, amount: -39, commission: 0, net: 0, status: "failed" },
];

export const menusOf = (chefId: string) => BC_MENUS.filter((m) => m.chefId === chefId);
export const sessionsOf = (chefId: string) => BC_SESSIONS.filter((s) => s.chefId === chefId);
export const transactionsOf = (chefId: string) =>
  BC_TRANSACTIONS.filter((t) => t.chefId === chefId);

/** Agrégats financiers d'un batch cooker. */
export function financials(chefId: string) {
  const tx = transactionsOf(chefId);
  const sessions = tx.filter((t) => t.type === "session");
  return {
    grossRevenue: sessions.reduce((n, t) => n + t.amount, 0),
    commission: sessions.reduce((n, t) => n + t.commission, 0),
    net: sessions.reduce((n, t) => n + t.net, 0),
    pending: tx.filter((t) => t.status === "pending").length,
  };
}

/* ── Agenda du batch cooker ─────────────────────────────────────────────── */

export interface BcAvailability {
  chefId: string;
  zone: string;
  slots: { day: string; ranges: string[] }[];
}

export const BC_AVAILABILITY: BcAvailability[] = [
  {
    chefId: "bc_001",
    zone: "Nice · Cannes · Antibes (30 km)",
    slots: [
      { day: "Lundi", ranges: ["9h – 13h"] },
      { day: "Mardi", ranges: ["9h – 13h", "14h – 18h"] },
      { day: "Mercredi", ranges: [] },
      { day: "Jeudi", ranges: ["9h – 13h"] },
      { day: "Vendredi", ranges: ["9h – 13h", "14h – 17h"] },
      { day: "Samedi", ranges: ["10h – 15h"] },
      { day: "Dimanche", ranges: [] },
    ],
  },
  {
    chefId: "bc_003",
    zone: "Antibes · Biot (15 km)",
    slots: [
      { day: "Lundi", ranges: [] },
      { day: "Mardi", ranges: ["10h – 16h"] },
      { day: "Mercredi", ranges: ["10h – 16h"] },
      { day: "Jeudi", ranges: ["10h – 16h"] },
      { day: "Vendredi", ranges: [] },
      { day: "Samedi", ranges: ["9h – 14h"] },
      { day: "Dimanche", ranges: [] },
    ],
  },
];

export const availabilityOf = (chefId: string) =>
  BC_AVAILABILITY.find((a) => a.chefId === chefId);

/* ── Statut de publication des menus / plats ────────────────────────────── */

export type ContentStatus = "draft" | "pending" | "published" | "rejected";

export const contentStatusLabel: Record<ContentStatus, string> = {
  draft: "Brouillon",
  pending: "En validation",
  published: "Publié",
  rejected: "Refusé",
};

export const contentStatusTone: Record<ContentStatus, BadgeTone> = {
  draft: "neutral",
  pending: "warning",
  published: "success",
  rejected: "danger",
};
