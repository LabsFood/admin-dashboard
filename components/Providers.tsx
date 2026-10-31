"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { makeQueryClient } from "@/lib/api/query-client";
import Toaster from "@/components/ui/Toaster";

/* L'authentification est fournie par <ClerkProvider> (voir app/layout.tsx).
   Ce composant héberge les providers côté client : TanStack Query, qui
   alimente les appels vers l'API Labs Food, et le Toaster, qui donne à toute
   action son retour. Le Toaster est à l'intérieur du QueryClientProvider pour
   qu'un `onError` de mutation puisse l'appeler. */
export default function Providers({ children }: { children: ReactNode }) {
  // useState garantit un QueryClient stable par montage (pas recréé au re-render).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster>{children}</Toaster>
      {/* Devtools React Query — exclus du bundle de production. */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
