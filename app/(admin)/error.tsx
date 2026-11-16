"use client";

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";

/**
 * Filet d'une page de la console : le layout (menu, barre du haut) reste en
 * place, seule la page est remplacée. L'erreur part à Sentry et PostHog.
 */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
    posthog.captureException(error);
  }, [error]);

  return (
    <div className="card">
      <EmptyState
        Icon={TriangleAlert}
        title="Cette page n'a pas pu s'afficher"
        text="L'erreur est remontée à l'équipe technique. Réessayez, ou revenez plus tard."
      />
      <div className="flex justify-center pb-10">
        <button onClick={retry} className="btn btn-primary">
          Réessayer
        </button>
      </div>
    </div>
  );
}
