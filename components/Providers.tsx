"use client";

import type { ReactNode } from "react";

/* Le contexte d'authentification est désormais fourni par <ClerkProvider>
   (voir app/layout.tsx). Ce composant reste le point d'accroche pour de
   futurs providers côté client. */
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
