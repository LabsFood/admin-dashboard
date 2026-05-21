/* Statistiques agrégées pour la vue d'ensemble du dashboard. */

export const DASHBOARD_STATS = {
  revenueMonth: 4280,
  revenuePrevMonth: 3640,
  sessionsMonth: 18,
  sessionsPrevMonth: 14,
  activeClients: 7,
  newClientsMonth: 3,
  pendingQuotes: 2,
  kossamRevenueMonth: 612,
};

/** Chiffre d'affaires des 7 derniers mois (batch cooking + Kossam). */
export const REVENUE_TREND: { month: string; batch: number; kossam: number }[] =
  [
    { month: "Nov", batch: 1880, kossam: 210 },
    { month: "Déc", batch: 2640, kossam: 380 },
    { month: "Jan", batch: 2200, kossam: 290 },
    { month: "Fév", batch: 2980, kossam: 340 },
    { month: "Mar", batch: 3420, kossam: 460 },
    { month: "Avr", batch: 3640, kossam: 520 },
    { month: "Mai", batch: 4280, kossam: 612 },
  ];

/** Répartition des sessions par formule (mois en cours). */
export const FORMULA_SPLIT: { name: string; value: number }[] = [
  { name: "Essentiel", value: 6 },
  { name: "Confort", value: 8 },
  { name: "Premium", value: 2 },
  { name: "Sur-mesure", value: 2 },
];

/** Top plats commandés ce mois-ci. */
export const TOP_MEALS: { name: string; count: number }[] = [
  { name: "Poulet rôti aux herbes", count: 38 },
  { name: "Risotto champignons", count: 31 },
  { name: "Tajine d'agneau", count: 29 },
  { name: "Curry lentilles corail", count: 27 },
  { name: "Gratin de légumes", count: 24 },
];
