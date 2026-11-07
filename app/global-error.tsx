"use client";

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { useEffect } from "react";

import "./globals.css";

/**
 * Dernier filet : un rendu qui casse remplace toute la page, layout racine
 * compris (d'où <html> et <body>). L'erreur part à Sentry, avec son replay.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold text-navy">La console a rencontré une erreur.</h1>
          <p className="max-w-md text-sm text-navy/70">
            Elle est remontée à l&apos;équipe technique. Réessayez, ou revenez au tableau de bord.
          </p>
          <div className="flex gap-3">
            <button
              onClick={retry}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium"
            >
              Réessayer
            </button>
            {/* Rechargement complet voulu : l'état de l'app vient de casser. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="px-4 py-2 rounded-lg border border-navy/20 text-navy text-sm font-medium">
              Tableau de bord
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
