import type { NextConfig } from "next";

// Cible du proxy API (côté serveur). Le navigateur appelle same-origin via
// /lf-api/* → Next relaie vers l'API officielle, ce qui évite les erreurs CORS.
// Surchargée par API_PROXY_TARGET si besoin (ex. API locale).
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? "https://lf-api.labsfood.fr";

const nextConfig: NextConfig = {
  output: "standalone",
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
      {
        source: "/lf-api/:path*",
        destination: `${API_PROXY_TARGET}/:path*`,
      },
    ];
  },
};

export default nextConfig;
