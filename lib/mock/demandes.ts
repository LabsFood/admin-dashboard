import type { Demande, DemandeStatus } from "./types";

export const DEMANDE_STATUS_LABEL: Record<DemandeStatus, string> = {
  submitted: "Nouvelle",
  "in-review": "En analyse",
  quoted: "Devis envoyé",
  accepted: "Acceptée",
  declined: "Refusée",
};

export const DEMANDES: Demande[] = [
  {
    id: "req_001",
    reference: "DEM-2026-031",
    clientId: "cli_010",
    clientName: "Boris Da Silva",
    title: "Brunch d'anniversaire — 8 personnes",
    createdAt: "2026-05-16",
    status: "submitted",
    persons: 8,
    mealsCount: 6,
    cuisine: "Méditerranéen",
    diet: ["Végétarien", "Sans-gluten"],
    brief:
      "Un brunch dimanche pour mes 30 ans, autour de 8 personnes, ambiance méditerranéenne. Deux convives sans gluten et une végétarienne stricte. Un dessert « wow » attendu.",
    assignedChefId: null,
    quote: null,
  },
  {
    id: "req_002",
    reference: "DEM-2026-029",
    clientId: "cli_006",
    clientName: "Antoine Mercier",
    title: "Régime sportif — programme 2 semaines",
    createdAt: "2026-05-10",
    status: "in-review",
    persons: 2,
    mealsCount: 14,
    cuisine: "Cuisine du monde",
    diet: ["High-protein"],
    brief:
      "Programme musculation en phase de prise. 2200 kcal/jour, 180 g de protéines. Variété de cuisines (asiatique, mexicain, libanais).",
    assignedChefId: "chef_marc",
    quote: null,
  },
  {
    id: "req_003",
    reference: "DEM-2026-027",
    clientId: "cli_004",
    clientName: "Karim Haddad",
    title: "Repas de l'Aïd — grande tablée",
    createdAt: "2026-05-04",
    status: "quoted",
    persons: 12,
    mealsCount: 8,
    cuisine: "Maghrébin",
    diet: ["Halal"],
    brief:
      "Repas familial pour l'Aïd, 12 personnes. Tajines, couscous royal, pâtisseries orientales. Tout halal, prévoir des plats végétariens pour deux convives.",
    assignedChefId: "chef_lina",
    quote: {
      amountTTC: 480,
      amountAfterTax: 240,
      note: "Inclut 1 h de service supplémentaire et la pâtisserie.",
    },
  },
  {
    id: "req_004",
    reference: "DEM-2026-024",
    clientId: "cli_002",
    clientName: "Thomas Rivière",
    title: "Dîner découverte cuisine asiatique",
    createdAt: "2026-04-22",
    status: "accepted",
    persons: 4,
    mealsCount: 5,
    cuisine: "Asiatique",
    diet: ["Végétarien"],
    brief:
      "Soirée découverte entre amis autour des cuisines d'Asie : Vietnam, Corée, Thaïlande. Tout végétarien.",
    assignedChefId: "chef_ivy",
    quote: {
      amountTTC: 290,
      amountAfterTax: 145,
      note: "Forfait confort + ajustement recettes spécifiques.",
    },
  },
  {
    id: "req_005",
    reference: "DEM-2026-019",
    clientId: "cli_008",
    clientName: "Julien Petit",
    title: "Batch cooking petit budget",
    createdAt: "2026-04-02",
    status: "declined",
    persons: 3,
    mealsCount: 4,
    cuisine: "Cuisine familiale",
    diet: [],
    brief:
      "Demande de session à très petit budget, en dessous du forfait Essentiel.",
    assignedChefId: null,
    quote: {
      amountTTC: 150,
      amountAfterTax: 75,
      note: "Devis au tarif Essentiel — le client recherchait moins cher.",
    },
  },
];

export function demandeById(id: string): Demande | undefined {
  return DEMANDES.find((d) => d.id === id);
}
