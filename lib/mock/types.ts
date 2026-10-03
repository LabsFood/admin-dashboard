/* ─────────────────────────────────────────────────────────────────────────────
   Modèle de données — Console admin Lab's Food
   Toutes les entités sont ici, partagées par les fichiers de données mock.
   ───────────────────────────────────────────────────────────────────────────── */

// ─── Équipe (chefs & staff) ──────────────────────────────────────────────────
export type TeamRole = "founder" | "chef" | "staff";
export type TeamStatus = "active" | "inactive";

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: TeamRole;
  specialty: string;
  city: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  sessionsDone: number;
  status: TeamStatus;
  joinedAt: string;
  badges: string[];
  bio: string;
}

// ─── Clients ─────────────────────────────────────────────────────────────────
export type ClientStatus = "vip" | "active" | "prospect" | "inactive";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  address: { street: string; city: string; postalCode: string };
  dietaryPreferences: string[];
  allergies: string[];
  household: { adults: number; kids: number };
  status: ClientStatus;
  totalSpent: number;
  ordersCount: number;
  createdAt: string;
  lastOrderAt: string | null;
  notes: string;
}

// ─── Formules ────────────────────────────────────────────────────────────────
export interface Formule {
  id: string;
  name: string;
  price: number;
  priceAfterTax: number;
  duration: string;
  mealsCount: number;
  persons: string;
  description: string;
  features: string[];
  popular: boolean;
  active: boolean;
  sessionsSold: number;
}

// ─── Réservations batch cooking ──────────────────────────────────────────────
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "shopping"
  | "cooking"
  | "delivered"
  | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";

export interface ReservationMeal {
  name: string;
  portions: number;
}

export interface ShoppingAisle {
  aisle: string;
  items: { name: string; qty: string }[];
}

export interface Reservation {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  chefId: string;
  chefName: string;
  date: string;
  timeSlot: string;
  formula: string;
  meals: ReservationMeal[];
  persons: number;
  amountTTC: number;
  amountAfterTax: number;
  status: ReservationStatus;
  paymentStatus: PaymentStatus;
  shoppingByClient: boolean;
  shoppingList?: ShoppingAisle[];
  address: string;
  notes?: string;
  createdAt: string;
}

// ─── Demandes sur-mesure (devis) ─────────────────────────────────────────────
export type DemandeStatus =
  | "submitted"
  | "in-review"
  | "quoted"
  | "accepted"
  | "declined";

export interface Demande {
  id: string;
  reference: string;
  clientId: string;
  clientName: string;
  title: string;
  createdAt: string;
  status: DemandeStatus;
  persons: number;
  mealsCount: number;
  cuisine: string;
  diet: string[];
  brief: string;
  assignedChefId: string | null;
  quote: { amountTTC: number; amountAfterTax: number; note?: string } | null;
}

// ─── Messagerie ──────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  from: "client" | "admin";
  text: string;
  at: string;
  read: boolean;
}

export interface ChatThread {
  id: string;
  clientId: string;
  clientName: string;
  topic: string;
  lastMessageAt: string;
  unreadCount: number;
  messages: ChatMessage[];
}

// ─── Commandes produit Kossam (site principal) ───────────────────────────────
export type KossamStatus =
  | "new"
  | "preparing"
  | "delivering"
  | "delivered"
  | "cancelled";

export interface KossamOrder {
  id: string;
  reference: string;
  customerName: string;
  email: string;
  phone: string;
  items: { format: string; qty: number; unitPrice: number }[];
  total: number;
  deliveryFee: number;
  status: KossamStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  deliveryZone: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliverySlot: string;
  notes?: string;
  createdAt: string;
}

// ─── Candidatures « Devenir chef » ───────────────────────────────────────────
export type CandidatureStatus =
  | "new"
  | "reviewing"
  | "interview"
  | "accepted"
  | "rejected";

export type DocumentType =
  | "cv"
  | "cover-letter"
  | "haccp"
  | "diploma"
  | "id-card"
  | "portfolio";
export type DocumentFormat = "pdf" | "image";

export interface CandidatureDocument {
  id: string;
  type: DocumentType;
  name: string;
  format: DocumentFormat;
  sizeKb: number;
  uploadedAt: string;
  /** Aperçu image (pour les documents de type image). */
  previewUrl?: string;
  pages?: number;
}

export interface Candidature {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  birthYear: number;
  experienceYears: number;
  currentRole: string;
  specialties: string[];
  cuisines: string[];
  languages: string[];
  availability: string;
  hasVehicle: boolean;
  expectedRate: number;
  motivation: string;
  hasHaccp: boolean;
  status: CandidatureStatus;
  interviewDate: string | null;
  internalNotes: string;
  documents: CandidatureDocument[];
  createdAt: string;
}

// ─── Messages de contact (site principal) ────────────────────────────────────
export type ContactStatus = "new" | "read" | "replied" | "archived";
export type ContactChannel = "form" | "whatsapp" | "email";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  channel: ContactChannel;
  status: ContactStatus;
  createdAt: string;
}

// ─── Avis / témoignages ──────────────────────────────────────────────────────
export type AvisService = "batch-cooking" | "atelier" | "kossam";

export interface Avis {
  id: string;
  author: string;
  city: string;
  rating: number;
  text: string;
  service: AvisService;
  date: string;
  verified: boolean;
  published: boolean;
  source: string;
}

// ─── Zones de service ────────────────────────────────────────────────────────
export interface ServiceZone {
  id: string;
  name: string;
  region: string;
  postalCodes: string[];
  active: boolean;
  chefsCount: number;
  clientsCount: number;
}
