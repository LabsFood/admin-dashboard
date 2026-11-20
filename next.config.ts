import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Cible du proxy API (côté serveur). Le navigateur appelle same-origin via
// /lf-api/* → Next relaie vers l'API officielle, ce qui évite les erreurs CORS.
// Surchargée par API_PROXY_TARGET si besoin (ex. API locale).
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? "https://lf-api.labsfood.fr";

const nextConfig: NextConfig = {
  output: "standalone",
  // Les chemins de l'API PostHog finissent par « / » : pas de redirection.
  skipTrailingSlashRedirect: true,
  /*
   * « Équipe & chefs » a été retirée : les batch cookers ont leur propre
   * section, les comptes et les rôles vivent dans Utilisateurs, et les zones
   * d'intervention sur la fiche de chaque batch cooker. Les liens déjà
   * partagés continuent d'arriver quelque part.
   */
  async redirects() {
    return [
      { source: "/equipe", destination: "/batchcookers", permanent: false },
      { source: "/equipe/:id", destination: "/batchcookers", permanent: false },
    ];
  },

  async rewrites() {
    return [
      // PostHog (UE) relayé same-origin : les bloqueurs de pub laissent passer.
      // Tout passe par eu.i.posthog.com : eu-assets est derrière Cloudflare (erreur 1000 depuis un site Cloudflare).
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
      {
        source: "/lf-api/:path*",
        destination: `${API_PROXY_TARGET}/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT ?? "admin-dashboard",
  // Sans jeton, le build passe : seul l'envoi des source maps est sauté.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // `.git` n'est pas dans le contexte Docker : Railway fournit le commit.
  release: { name: process.env.RAILWAY_GIT_COMMIT_SHA },
  // Les événements passent par la console : les bloqueurs ne les coupent pas.
  // Exclu du matcher de proxy.ts, sinon Clerk le renverrait vers /login.
  tunnelRoute: "/monitoring",
  widenClientFileUpload: true,
  silent: !process.env.CI,
});
