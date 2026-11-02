import {
  LayoutDashboard,
  CalendarRange,
  Sparkles,
  MessageCircle,
  Users,
  UtensilsCrossed,
  BookOpen,
  Carrot,
  Tags,
  Milk,
  Mail,
  Star,
  ClipboardCheck,
  Receipt,
  Settings,
  ShieldCheck,
  UserCog,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Pilotage",
    items: [
      {
        href: "/",
        label: "Vue d'ensemble",
        Icon: LayoutDashboard,
        eyebrow: "Tableau de bord",
        title: "Vue d'ensemble",
        subtitle: "L'activité de Lab's Food en un coup d'œil.",
      },
    ],
  },
  {
    label: "Batch cooking",
    items: [
      {
        href: "/reservations",
        label: "Réservations",
        Icon: CalendarRange,
        eyebrow: "Sessions",
        title: "Réservations",
        subtitle: "Toutes les sessions de batch cooking, à venir et passées.",
      },
      {
        href: "/demandes",
        label: "Demandes sur-mesure",
        Icon: Sparkles,
        eyebrow: "Devis",
        title: "Demandes sur-mesure",
        subtitle: "Briefs clients à analyser et à chiffrer.",
      },
      {
        href: "/messagerie",
        label: "Messagerie",
        Icon: MessageCircle,
        eyebrow: "Communication",
        title: "Messagerie",
        subtitle: "Support, fils clients ↔ batch cookers, signalements.",
      },
      {
        href: "/clients",
        label: "Clients",
        Icon: Users,
        eyebrow: "CRM",
        title: "Clients",
        subtitle: "Fichier clients, préférences et historique.",
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      {
        href: "/menus",
        label: "Plats & menus",
        Icon: UtensilsCrossed,
        eyebrow: "Catalogue Lab's Food",
        title: "Plats & menus",
        subtitle:
          "La bibliothèque de la maison, les menus assemblés et les semaines à l'ardoise.",
      },
      {
        href: "/recettes",
        label: "Recettes du monde",
        Icon: BookOpen,
        eyebrow: "Inspiration",
        title: "Recettes du monde",
        subtitle: "Les plats de la maison, rangés par région culinaire.",
      },
      {
        href: "/ingredients",
        label: "Ingrédients",
        Icon: Carrot,
        eyebrow: "Recettes",
        title: "Liste commune d'ingrédients",
        subtitle:
          "Ce que les batch cookers relient à leurs recettes : régimes et saisons s'en calculent.",
      },
      {
        href: "/moderation",
        label: "Modération",
        Icon: ShieldCheck,
        eyebrow: "Catalogue des batch cookers",
        title: "Modération",
        subtitle:
          "Les plats et menus publiés par les batch cookers, à relire ou à retirer.",
      },
      {
        href: "/formules",
        label: "Formules & tarifs",
        Icon: Tags,
        eyebrow: "Offre",
        title: "Formules & tarifs",
        subtitle: "Forfaits batch cooking et tarification.",
      },
    ],
  },
  {
    label: "Site principal",
    items: [
      {
        href: "/kossam",
        label: "Commandes Kossam",
        Icon: Milk,
        eyebrow: "Produits",
        title: "Commandes Kossam",
        subtitle: "Suivi des commandes de la boisson Kossam.",
      },
      {
        href: "/contact",
        label: "Messages contact",
        Icon: Mail,
        eyebrow: "Boîte de réception",
        title: "Messages de contact",
        subtitle: "Demandes reçues depuis le site principal.",
      },
      {
        href: "/avis",
        label: "Avis & témoignages",
        Icon: Star,
        eyebrow: "Réputation",
        title: "Avis & témoignages",
        subtitle: "Modération des avis affichés sur le site.",
      },
    ],
  },
  {
    label: "Organisation",
    items: [
      {
        href: "/transactions",
        label: "Transactions",
        Icon: Receipt,
        eyebrow: "Finances",
        title: "Transactions",
        subtitle: "Encaissements, commissions et versements, tous circuits confondus.",
      },
      {
        href: "/batchcookers",
        label: "Batch cookers",
        Icon: ClipboardCheck,
        eyebrow: "Recrutement & conformité",
        title: "Batch cookers",
        subtitle:
          "Candidatures, pièces justificatives et validation des comptes.",
      },
      {
        href: "/utilisateurs",
        label: "Utilisateurs",
        Icon: UserCog,
        eyebrow: "Comptes & accès",
        title: "Utilisateurs",
        subtitle: "Création de comptes et attribution des rôles.",
      },
      {
        href: "/parametres",
        label: "Paramètres",
        Icon: Settings,
        eyebrow: "Réglages",
        title: "Paramètres",
        subtitle: "Configuration de la console et du compte.",
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function navItemByPath(pathname: string): NavItem {
  if (pathname === "/") return NAV_ITEMS[0];
  const match = NAV_ITEMS.filter(
    (i) => i.href !== "/" && pathname.startsWith(i.href),
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return match ?? NAV_ITEMS[0];
}
