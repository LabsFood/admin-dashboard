import type { ContactMessage, ContactStatus } from "./types";

export const CONTACT_STATUS_LABEL: Record<ContactStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

export const CONTACT_MESSAGES: ContactMessage[] = [
  {
    id: "msg_001",
    name: "Nadia Lopez",
    email: "nadia.lopez@gmail.com",
    subject: "Première session de batch cooking",
    message:
      "Bonjour, je suis végane et j'aimerais savoir si vous proposez des menus 100 % végétaux pour une première session à Menton. Merci !",
    channel: "form",
    status: "new",
    createdAt: "2026-05-19T09:12:00.000Z",
  },
  {
    id: "msg_002",
    name: "Boris Da Silva",
    email: "boris.dasilva@gmail.com",
    subject: "Devis brunch d'anniversaire",
    message:
      "Bonjour, je souhaiterais un devis pour un brunch de 8 personnes. Comment procéder ?",
    channel: "whatsapp",
    status: "read",
    createdAt: "2026-05-18T15:40:00.000Z",
  },
  {
    id: "msg_003",
    name: "Restaurant Le Comptoir",
    email: "contact@lecomptoir-nice.fr",
    subject: "Partenariat distribution Kossam",
    message:
      "Nous serions intéressés pour distribuer le Kossam dans notre établissement. Pouvons-nous échanger ?",
    channel: "email",
    status: "replied",
    createdAt: "2026-05-16T11:05:00.000Z",
  },
  {
    id: "msg_004",
    name: "Sandra Klein",
    email: "sandra.klein@gmail.com",
    subject: "Atelier culinaire en groupe",
    message:
      "Bonjour, possible d'organiser un atelier cuisine du monde pour 10 personnes pour un EVJF ?",
    channel: "form",
    status: "new",
    createdAt: "2026-05-19T18:22:00.000Z",
  },
  {
    id: "msg_005",
    name: "Olivier Faure",
    email: "o.faure@free.fr",
    subject: "Zone de service Saint-Tropez",
    message:
      "Intervenez-vous à Saint-Tropez ? Je n'ai pas trouvé l'info sur le site.",
    channel: "form",
    status: "archived",
    createdAt: "2026-05-12T08:50:00.000Z",
  },
  {
    id: "msg_006",
    name: "Fatou Sow",
    email: "fatou.sow@gmail.com",
    subject: "Question crédit d'impôt",
    message:
      "Le crédit d'impôt de 50 % s'applique-t-il dès la première session ? Comment ça marche concrètement ?",
    channel: "whatsapp",
    status: "read",
    createdAt: "2026-05-17T14:30:00.000Z",
  },
];

export function contactById(id: string): ContactMessage | undefined {
  return CONTACT_MESSAGES.find((c) => c.id === id);
}
