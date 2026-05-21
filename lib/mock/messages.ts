import type { ChatThread } from "./types";

export const THREADS: ChatThread[] = [
  {
    id: "thr_001",
    clientId: "cli_001",
    clientName: "Sophie Marchand",
    topic: "Session du 23 mai",
    lastMessageAt: "2026-05-19T08:32:00.000Z",
    unreadCount: 2,
    messages: [
      {
        id: "m_101",
        from: "admin",
        text: "Bonjour Sophie ! Pour samedi, je préfère arriver à 9 h pétantes — ça vous va ?",
        at: "2026-05-18T14:02:00.000Z",
        read: true,
      },
      {
        id: "m_102",
        from: "client",
        text: "Parfait pour 9 h. Vous voulez la liste de courses mise à jour avant ou après ?",
        at: "2026-05-18T14:08:00.000Z",
        read: true,
      },
      {
        id: "m_103",
        from: "admin",
        text: "Avant, idéalement vendredi soir — je passe commande chez le poissonnier le matin.",
        at: "2026-05-18T14:11:00.000Z",
        read: true,
      },
      {
        id: "m_104",
        from: "client",
        text: "Top. Et est-ce qu'on peut ajouter un dahl coco-curcuma pour ma fille Lina ?",
        at: "2026-05-19T08:30:00.000Z",
        read: false,
      },
      {
        id: "m_105",
        from: "client",
        text: "C'est doux et sans gluten, ça devrait lui plaire 🙂",
        at: "2026-05-19T08:32:00.000Z",
        read: false,
      },
    ],
  },
  {
    id: "thr_002",
    clientId: "cli_004",
    clientName: "Karim Haddad",
    topic: "Devis repas de l'Aïd",
    lastMessageAt: "2026-05-18T17:45:00.000Z",
    unreadCount: 1,
    messages: [
      {
        id: "m_201",
        from: "client",
        text: "Bonjour, j'ai bien reçu le devis pour l'Aïd. La pâtisserie est-elle comprise ?",
        at: "2026-05-18T17:10:00.000Z",
        read: true,
      },
      {
        id: "m_202",
        from: "admin",
        text: "Bonjour Karim ! Oui, cornes de gazelle et baklavas sont inclus dans les 480 €.",
        at: "2026-05-18T17:28:00.000Z",
        read: true,
      },
      {
        id: "m_203",
        from: "client",
        text: "Parfait, je valide alors. On confirme la date du 24 ?",
        at: "2026-05-18T17:45:00.000Z",
        read: false,
      },
    ],
  },
  {
    id: "thr_003",
    clientId: "cli_006",
    clientName: "Antoine Mercier",
    topic: "Programme sportif",
    lastMessageAt: "2026-05-17T11:20:00.000Z",
    unreadCount: 0,
    messages: [
      {
        id: "m_301",
        from: "client",
        text: "Salut ! Vous avez pu chiffrer le programme 2 semaines ?",
        at: "2026-05-17T10:50:00.000Z",
        read: true,
      },
      {
        id: "m_302",
        from: "admin",
        text: "Bonjour Antoine, Marc finalise le menu protéiné, devis pour demain midi 💪",
        at: "2026-05-17T11:20:00.000Z",
        read: true,
      },
    ],
  },
  {
    id: "thr_004",
    clientId: "cli_003",
    clientName: "Camille Fontaine",
    topic: "Conservation des plats",
    lastMessageAt: "2026-05-15T19:05:00.000Z",
    unreadCount: 0,
    messages: [
      {
        id: "m_401",
        from: "client",
        text: "Combien de temps se garde le curry de lentilles au frigo ?",
        at: "2026-05-15T18:40:00.000Z",
        read: true,
      },
      {
        id: "m_402",
        from: "admin",
        text: "3 à 4 jours au frigo dans une boîte hermétique, ou 2 mois au congélateur 👍",
        at: "2026-05-15T19:05:00.000Z",
        read: true,
      },
    ],
  },
  {
    id: "thr_005",
    clientId: "cli_009",
    clientName: "Inès Moreau",
    topic: "Première session",
    lastMessageAt: "2026-05-13T09:15:00.000Z",
    unreadCount: 1,
    messages: [
      {
        id: "m_501",
        from: "client",
        text: "Bonjour, c'est ma première session vendredi, je dois préparer quelque chose ?",
        at: "2026-05-13T09:15:00.000Z",
        read: false,
      },
    ],
  },
];

export function threadById(id: string): ChatThread | undefined {
  return THREADS.find((t) => t.id === id);
}
