"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/api/query-client";

/* L'authentification est fournie par <ClerkProvider> (voir app/layout.tsx).
   Ce composant héberge les providers côté client — aujourd'hui TanStack Query,
   qui alimente les appels vers l'API Labs Food. */
export default function Providers({ children }: { children: ReactNode }) {
  // useState garantit un QueryClient stable par montage (pas recréé au re-render).
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
