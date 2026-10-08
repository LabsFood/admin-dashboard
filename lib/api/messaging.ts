"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import { ApiError, useApiFetch } from "./client";

/* ─────────────────────────────────────────────────────────────────────────────
   La messagerie vue de la console.

   Deux sortes de conversations :

   - **support** : un client ou un batch cooker écrit à l'équipe. La boîte est
     partagée : aucun admin n'en est « participant », le compteur de non-lus
     vaut pour toute l'équipe, et répondre le remet à zéro ;
   - **chef_client** : un client et un batch cooker. La console les lit pour la
     modération et peut y écrire, signé « Lab's Food ». Chaque ouverture et
     chaque intervention sont tracées côté API.

   L'équipe lit le texte tel qu'il a été écrit : le masquage des numéros et des
   emails ne concerne que les participants. `contactDetected` marque les
   messages qui ont déclenché le signalement de la conversation.
   ───────────────────────────────────────────────────────────────────────────── */

export type ConversationType = "chef_client" | "support";
export type SenderRole = "client" | "chef" | "support";
export type InboxFilter = "support" | "pairs" | "flagged";

export interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AdminMessage {
  id: string;
  conversationId: string;
  senderRole: SenderRole;
  body: string;
  contactDetected: boolean;
  senderName: string | null;
  attachments: Attachment[];
  clientMessageId: string | null;
  createdAt: string;
}

export interface Party {
  userId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
}

export interface AdminConversation {
  id: string;
  type: ConversationType;
  client: Party | null;
  chef: (Party & { chefProfileId: string }) | null;
  supportUser: (Party & { role: SenderRole }) | null;
  booking: {
    id: string;
    reference: string | null;
    status: string;
    startsAt: string;
    endsAt: string;
  } | null;
  contactReleased: boolean;
  contactFlaggedAt: string | null;
  lastMessage: AdminMessage | null;
  lastMessageAt: string | null;
  /** Fils support uniquement. */
  unreadCount: number;
  createdAt: string;
}

interface ConversationPage {
  data: AdminConversation[];
  meta: { total: number; hasNextPage: boolean };
}

export interface MessagePage {
  /** Du plus ancien au plus récent. */
  data: AdminMessage[];
  nextCursor: string | null;
}

export interface AttachmentRef {
  uploadId: string;
  fileName: string;
}

export const ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 3;

const ROOT = ["admin", "conversations"] as const;
const KEYS = {
  root: ROOT,
  lists: [...ROOT, "list"] as const,
  list: (filter: InboxFilter) => [...ROOT, "list", filter] as const,
  counts: [...ROOT, "counts"] as const,
  detail: (id: string) => [...ROOT, "detail", id] as const,
  messages: (id: string) => [...ROOT, "messages", id] as const,
};

/** Le nom à afficher pour une conversation, quelle que soit sa sorte. */
export function conversationTitle(c: AdminConversation): string {
  if (c.type === "support") return c.supportUser?.name ?? "Compte supprimé";
  return `${c.client?.name ?? "Client"} ↔ ${c.chef?.name ?? "Batch cooker"}`;
}

// ── Lectures ────────────────────────────────────────────────────────────────

const FILTER_QUERY: Record<InboxFilter, string> = {
  support: "type=support",
  pairs: "type=chef_client",
  flagged: "filter=flagged",
};

// Le WebSocket rafraîchit ces listes quand il est disponible. La console passe
// souvent par le proxy same-origin `/lf-api`, qui ne relaie pas les WebSockets :
// ce délai garantit que la boîte se met quand même à jour.
const FALLBACK_REFRESH_MS = 20 * 1000;

export function useAdminConversations(filter: InboxFilter) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: KEYS.list(filter),
    queryFn: () =>
      apiFetch<ConversationPage>(
        `/admin/conversations?${FILTER_QUERY[filter]}&limit=100`,
      ),
    refetchInterval: FALLBACK_REFRESH_MS,
  });
}

/** Ce qui attend l'équipe : messages support non lus, conversations signalées. */
export function useAdminConversationCounts() {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: KEYS.counts,
    queryFn: () =>
      apiFetch<{ unread: number; flagged: number }>(
        "/admin/conversations/counts",
      ),
    refetchInterval: FALLBACK_REFRESH_MS,
  });
}

export function useAdminMessages(id: string | null) {
  const apiFetch = useApiFetch();
  return useInfiniteQuery({
    queryKey: KEYS.messages(id ?? ""),
    queryFn: ({ pageParam }) =>
      apiFetch<MessagePage>(
        `/admin/conversations/${id}/messages?limit=30` +
          (pageParam ? `&before=${pageParam}` : ""),
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!id,
    // Lire un fil entre un client et un batch cooker est tracé côté API : on ne
    // le relit donc ni au retour sur l'onglet ni à intervalle fixe, seulement
    // quand un message manque (`useKeepThreadFresh`).
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/**
 * Relit le fil ouvert quand la liste annonce un message qu'il n'a pas. C'est ce
 * qui tient le fil à jour sans WebSocket, la liste étant rafraîchie toute seule.
 */
export function useKeepThreadFresh(conversation: AdminConversation | null): void {
  const qc = useQueryClient();
  const id = conversation?.id;
  const lastId = conversation?.lastMessage?.id;
  useEffect(() => {
    if (!id || !lastId) return;
    const cached = qc.getQueryData<InfiniteData<MessagePage>>(KEYS.messages(id));
    const known = cached?.pages.some((p) => p.data.some((m) => m.id === lastId));
    if (cached && !known) {
      void qc.invalidateQueries({ queryKey: KEYS.messages(id) });
    }
  }, [id, lastId, qc]);
}

export function flattenMessages(
  data: InfiniteData<MessagePage> | undefined,
): AdminMessage[] {
  if (!data) return [];
  return [...data.pages].reverse().flatMap((page) => page.data);
}

/**
 * Ajoute un message au fil en cache s'il n'y est pas déjà : il peut arriver par
 * la réponse de l'envoi et par le WebSocket, dans n'importe quel ordre.
 */
function upsertMessage(qc: QueryClient, message: AdminMessage): void {
  qc.setQueryData<InfiniteData<MessagePage>>(
    KEYS.messages(message.conversationId),
    (old) => {
      if (!old) return old;
      if (old.pages.some((p) => p.data.some((m) => m.id === message.id))) {
        return old;
      }
      const [newest, ...older] = old.pages;
      return {
        ...old,
        pages: [{ ...newest, data: [...newest.data, message] }, ...older],
      };
    },
  );
}

function refreshInbox(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: KEYS.lists });
  void qc.invalidateQueries({ queryKey: KEYS.counts });
}

// ── Écritures ───────────────────────────────────────────────────────────────

export function useAdminSendMessage(id: string) {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { body: string; attachments?: AttachmentRef[] }) =>
      apiFetch<AdminMessage>(`/admin/conversations/${id}/messages`, {
        method: "POST",
        // Un identifiant par envoi : une relance réseau ne poste pas deux fois.
        body: { ...input, clientMessageId: crypto.randomUUID() },
      }),
    onSuccess: (message) => {
      upsertMessage(qc, message);
      refreshInbox(qc);
    },
  });
}

/** Boîte partagée : marquer comme lu vaut pour toute l'équipe. */
export function useAdminMarkRead() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/admin/conversations/${id}/read`, { method: "POST" }),
    onSuccess: () => refreshInbox(qc),
  });
}

/** « Vu, rien à faire » : sort la conversation de la file des signalements. */
export function useDismissFlag() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<null>(`/admin/conversations/${id}/dismiss-flag`, {
        method: "POST",
      }),
    onSuccess: () => refreshInbox(qc),
  });
}

/** L'équipe écrit la première : ouvre (ou retrouve) le fil support d'un compte. */
export function useOpenSupportConversation() {
  const apiFetch = useApiFetch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<AdminConversation>("/admin/conversations/support", {
        method: "POST",
        body: { userId },
      }),
    onSuccess: (conversation) => {
      qc.setQueryData(KEYS.detail(conversation.id), conversation);
      refreshInbox(qc);
    },
  });
}

/** Un fil par son id, pour l'ouvrir alors qu'il n'est dans aucune liste chargée. */
export function useAdminConversation(id: string | null) {
  const apiFetch = useApiFetch();
  return useQuery({
    queryKey: KEYS.detail(id ?? ""),
    queryFn: () => apiFetch<AdminConversation>(`/admin/conversations/${id}`),
    enabled: !!id,
  });
}

// ── Pièces jointes ──────────────────────────────────────────────────────────

export function attachmentError(file: File): string | null {
  if (!ATTACHMENT_TYPES.includes(file.type)) {
    return `${file.name} : format non accepté (PDF, JPEG, PNG ou WebP).`;
  }
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name} : 10 Mo maximum.`;
  return null;
}

/** Dépôt direct au stockage par lien signé ; rattaché au message à l'envoi. */
export function useAdminUploadAttachment(id: string) {
  const apiFetch = useApiFetch();
  return async (file: File): Promise<AttachmentRef> => {
    const signed = await apiFetch<{
      uploadId: string;
      url: string;
      headers: Record<string, string>;
    }>(`/admin/conversations/${id}/attachments/upload-url`, {
      method: "POST",
      body: { mimeType: file.type, sizeBytes: file.size },
    });
    const res = await fetch(signed.url, {
      method: "PUT",
      headers: signed.headers,
      body: file,
    });
    if (!res.ok) {
      throw new ApiError(res.status, `L'envoi de ${file.name} a échoué.`);
    }
    return { uploadId: signed.uploadId, fileName: file.name };
  };
}

/** Ouvre une pièce jointe dans un nouvel onglet (lien valable 5 minutes). */
export function useAdminOpenAttachment(id: string) {
  const apiFetch = useApiFetch();
  return async (attachmentId: string): Promise<void> => {
    // Ouvert avant l'appel : après un `await`, le navigateur bloque la fenêtre.
    const tab = window.open("", "_blank");
    try {
      const { url } = await apiFetch<{ url: string }>(
        `/admin/conversations/${id}/attachments/${attachmentId}/download-url`,
      );
      if (tab) tab.location.href = url;
      else window.location.href = url;
    } catch (error) {
      tab?.close();
      throw error;
    }
  };
}

export function messagingErrorText(error: unknown): string {
  const code =
    error instanceof ApiError
      ? (error.body as { code?: string } | null)?.code
      : undefined;
  switch (code) {
    case "EMPTY_MESSAGE":
      return "Écrivez un message ou joignez un fichier.";
    case "UNSUPPORTED_MEDIA_TYPE":
      return "Format non accepté : PDF, JPEG, PNG ou WebP.";
    case "FILE_TOO_LARGE":
      return "Fichier trop lourd : 10 Mo maximum.";
    case "ATTACHMENTS_UNAVAILABLE":
      return "Le stockage des pièces jointes n'est pas configuré sur l'API.";
    case "UPLOAD_NOT_CONFIRMED":
      return "Le fichier n'a pas été reçu. Joignez-le à nouveau.";
    default:
      return error instanceof Error
        ? error.message
        : "L'action n'a pas abouti.";
  }
}

// ── Temps réel ──────────────────────────────────────────────────────────────

type ServerEvent =
  | { event: "ready" }
  | {
      event: "message.created";
      data: { conversationId: string; message: AdminMessage };
    }
  | { event: "conversation.updated"; data: { conversationId: string } };

/**
 * L'adresse du WebSocket, ou `null` s'il n'est pas joignable : il lui faut
 * l'adresse réelle de l'API, le proxy `/lf-api` ne relayant pas les WebSockets.
 * Les listes se rafraîchissent alors seules, toutes les 20 secondes.
 */
function socketUrl(): string | null {
  const api = process.env.NEXT_PUBLIC_API_URL;
  if (!api || !/^https?:\/\//.test(api)) return null;
  return `${api.replace(/^http/, "ws").replace(/\/$/, "")}/ws`;
}

/**
 * Écoute les événements de toutes les conversations (un socket admin les reçoit
 * toutes). À monter une fois, dans le layout de la console.
 */
export function useAdminMessagingSocket(): void {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const qc = useQueryClient();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    const url = socketUrl();
    if (!isLoaded || !isSignedIn || !url) return;

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1_000;
    let stopped = false;

    const scheduleRetry = () => {
      if (stopped) return;
      retryTimer = setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    };

    const onEvent = (event: ServerEvent) => {
      if (event.event === "ready") {
        retryDelay = 1_000;
        // Rien n'a été poussé pendant la coupure : on relit tout.
        void qc.invalidateQueries({ queryKey: KEYS.root });
        return;
      }
      if (event.event === "message.created") {
        upsertMessage(qc, event.data.message);
      }
      refreshInbox(qc);
    };

    async function connect() {
      // Jeton frais à chaque tentative : celui de Clerk ne vit qu'une minute.
      const token = await getTokenRef.current().catch(() => null);
      if (stopped) return;
      if (!token) return scheduleRetry();

      const ws = new WebSocket(url as string);
      socket = ws;
      ws.onopen = () =>
        ws.send(JSON.stringify({ event: "auth", data: { token } }));
      ws.onmessage = (raw) => {
        try {
          onEvent(JSON.parse(String(raw.data)) as ServerEvent);
        } catch {
          // Trame illisible : ignorée, le prochain rafraîchissement rattrapera.
        }
      };
      ws.onclose = () => {
        if (socket === ws) socket = null;
        scheduleRetry();
      };
    }

    void connect();

    return () => {
      stopped = true;
      clearTimeout(retryTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [isLoaded, isSignedIn, qc]);
}
