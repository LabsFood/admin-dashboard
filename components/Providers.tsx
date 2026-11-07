"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import * as Sentry from "@sentry/nextjs";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { makeQueryClient } from "@/lib/api/query-client";
import Toaster from "@/components/ui/Toaster";

/* L'authentification est fournie par <ClerkProvider> (voir app/layout.tsx).
   Ce composant héberge les providers côté client : TanStack Query, qui
   alimente les appels vers l'API Labs Food, et le Toaster, qui donne à toute
   action son retour. Le Toaster est à l'intérieur du QueryClientProvider pour
   qu'un `onError` de mutation puisse l'appeler. */
/** Rattache les erreurs Sentry au compte Clerk : l'id seulement, jamais l'email. */
function SentryUser() {
  const { isLoaded, userId } = useAuth();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;

    Sentry.setUser(userId ? { id: userId } : null);

    if (userId) {
      if (previousUserId.current && previousUserId.current !== userId) {
        posthog.reset();
      }
      if (previousUserId.current !== userId) {
        posthog.identify(userId);
      }
    } else if (previousUserId.current) {
      posthog.reset();
    }

    previousUserId.current = userId ?? null;
  }, [isLoaded, userId]);

  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  // useState garantit un QueryClient stable par montage (pas recréé au re-render).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <SentryUser />
      <Toaster>{children}</Toaster>
      {/* Devtools React Query — exclus du bundle de production. */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
