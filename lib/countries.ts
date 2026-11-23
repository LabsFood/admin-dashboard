/**
 * Pays d'origine d'un plat, en code ISO 3166-1 alpha-2.
 *
 * L'API attend ce code, et la carte culinaire du client s'en sert pour colorer
 * un pays : ecrire le nom ne suffit pas, il faut `SN`. La liste est celle du
 * site public — les deux doivent dire la meme chose du meme plat.
 */
import type { Continent } from "@/lib/api/catalog";

const LIST: { code: string; label: string; region: Continent }[] = [
  { code: "FR", label: "France", region: "europe" },
  { code: "IT", label: "Italie", region: "europe" },
  { code: "ES", label: "Espagne", region: "europe" },
  { code: "PT", label: "Portugal", region: "europe" },
  { code: "GR", label: "Grèce", region: "europe" },
  { code: "GB", label: "Royaume-Uni", region: "europe" },
  { code: "DE", label: "Allemagne", region: "europe" },
  { code: "BE", label: "Belgique", region: "europe" },
  { code: "NL", label: "Pays-Bas", region: "europe" },
  { code: "PL", label: "Pologne", region: "europe" },
  { code: "RU", label: "Russie", region: "europe" },
  { code: "TR", label: "Turquie", region: "middle_east" },
  { code: "LB", label: "Liban", region: "middle_east" },
  { code: "SY", label: "Syrie", region: "middle_east" },
  { code: "IL", label: "Israël", region: "middle_east" },
  { code: "IR", label: "Iran", region: "middle_east" },
  { code: "MA", label: "Maroc", region: "africa" },
  { code: "DZ", label: "Algérie", region: "africa" },
  { code: "TN", label: "Tunisie", region: "africa" },
  { code: "EG", label: "Égypte", region: "africa" },
  { code: "ET", label: "Éthiopie", region: "africa" },
  { code: "SN", label: "Sénégal", region: "africa" },
  { code: "ML", label: "Mali", region: "africa" },
  { code: "CI", label: "Côte d'Ivoire", region: "africa" },
  { code: "CM", label: "Cameroun", region: "africa" },
  { code: "CD", label: "Congo (RDC)", region: "africa" },
  { code: "MG", label: "Madagascar", region: "africa" },
  { code: "NG", label: "Nigeria", region: "africa" },
  { code: "IN", label: "Inde", region: "asia" },
  { code: "PK", label: "Pakistan", region: "asia" },
  { code: "TH", label: "Thaïlande", region: "asia" },
  { code: "VN", label: "Vietnam", region: "asia" },
  { code: "KH", label: "Cambodge", region: "asia" },
  { code: "CN", label: "Chine", region: "asia" },
  { code: "JP", label: "Japon", region: "asia" },
  { code: "KR", label: "Corée du Sud", region: "asia" },
  { code: "ID", label: "Indonésie", region: "asia" },
  { code: "PH", label: "Philippines", region: "asia" },
  { code: "MX", label: "Mexique", region: "americas" },
  { code: "PE", label: "Pérou", region: "americas" },
  { code: "BR", label: "Brésil", region: "americas" },
  { code: "AR", label: "Argentine", region: "americas" },
  { code: "US", label: "États-Unis", region: "americas" },
  { code: "CA", label: "Canada", region: "americas" },
];

/** Par ordre alphabétique de leur nom français. `region` : la région culinaire du pays. */
export const COUNTRIES = [...LIST].sort((a, b) => a.label.localeCompare(b.label, "fr"));

/** La région culinaire d'un pays de la liste, ou `null`. */
export const regionOf = (code?: string | null): Continent | null =>
  LIST.find((c) => c.code === code)?.region ?? null;

export const countryLabel = (code?: string | null) =>
  COUNTRIES.find((c) => c.code === code)?.label ?? code ?? "";
