/**
 * Chargé par Next dans le navigateur avant l'hydratation : Sentry remonte les
 * erreurs JavaScript et les rendus cassés (voir app/global-error.tsx). Les 5xx de
 * l'API sont remontés par l'API elle-même. Sans NEXT_PUBLIC_SENTRY_DSN, rien ne part.
 */
import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (!posthogProjectToken || !posthogHost) {
  if (process.env.NODE_ENV !== "production") {
    const missingVariable = !posthogProjectToken
      ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
      : "NEXT_PUBLIC_POSTHOG_HOST";
    throw new Error(
      `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
    );
  }
} else {
  posthog.init(posthogProjectToken, {
    api_host: posthogHost,
    defaults: "2026-01-30",
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
  tracesSampleRate: 0.1,
  // Replay seulement quand une erreur survient, et tout masqué (textes, saisies,
  // images) : la console affiche des fiches clients et des pièces d'identité.
  integrations: [Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true })],
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,
  beforeSend(event, hint) {
    // Un 4xx est une réponse métier (validation, conflit), pas un bug.
    const error = hint.originalException as { name?: string; status?: number } | undefined;
    return error?.name === "ApiError" && (error.status ?? 0) < 500 ? null : event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
