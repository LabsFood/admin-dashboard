import {
  LayoutDashboard,
  CalendarRange,
  Sparkles,
  MessageCircle,
  Users,
  UtensilsCrossed,
  BookOpen,
  Tags,
  Milk,
  UserPlus,
  Mail,
  Star,
  ChefHat,
  Settings,
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
        subtitle: "Conversations avec les clients.",
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
        eyebrow: "Catalogue",
        title: "Plats & menus",
        subtitle: "Le menu de la semaine et la bibliothèque de plats.",
      },
      {
        href: "/recettes",
        label: "Recettes du monde",
        Icon: BookOpen,
        eyebrow: "Inspiration",
        title: "Recettes du monde",
        subtitle: "La carte des cuisines proposées par les chefs.",
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
        href: "/candidatures",
        label: "Candidatures chef",
        Icon: UserPlus,
        eyebrow: "Recrutement",
        title: "Candidatures chef",
        subtitle: "Candidatures reçues via « Devenir chef ».",
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
        href: "/equipe",
        label: "Équipe & chefs",
        Icon: ChefHat,
        eyebrow: "Ressources",
        title: "Équipe & chefs",
        subtitle: "Chefs, staff et zones de service.",
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
