import type { NextConfig } from "next";

// Cible du proxy API (côté serveur). Le navigateur appelle same-origin via
// /lf-api/* → Next relaie vers l'API officielle, ce qui évite les erreurs CORS.
// Surchargée par API_PROXY_TARGET si besoin (ex. API locale).
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ?? "https://lf-api.labsfood.fr";

const nextConfig: NextConfig = {
  output: "standalone",
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
