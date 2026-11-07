<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ce que c'est

Console d'administration interne de Lab's Food (Next.js App Router). Couvre le pilotage
(vue d'ensemble), le batch cooking (reservations, demandes sur-mesure, messagerie, CRM
clients), le catalogue (plats & menus, recettes du monde, moderation, formules & tarifs),
le site principal (messages de contact, avis) et l'organisation (transactions, batch
cookers, utilisateurs, parametres). Voir `lib/nav.tsx` pour la liste exacte des sections.

## Etat actuel (important)

La console est **branchee sur l'API reelle** (`LF-BackEnd`, NestJS + Clerk + Postgres).

- **Auth** : `@clerk/nextjs`, connexion uniquement (pas d'inscription), page `/login`.
  `proxy.ts` (middleware Clerk) exige une session sur toutes les routes sauf `/login(.*)`.
  Le role applicatif vient de `GET /me` (source de verite Postgres, `lib/api/me.ts`) ;
  la garde autoritaire est dans `app/(admin)/layout.tsx`. `lib/auth.tsx` n'est plus
  qu'une facade d'affichage au-dessus de Clerk + `/me`. Contrat :
  `LF-BackEnd/docs/auth/clerk-integration-contract.md`.
- **Donnees** : `lib/api/` — `client.ts` (`apiFetch`, Bearer token Clerk, timeout 15 s,
  `ApiError`), un fichier de hooks TanStack Query par domaine (`bookings`, `quotes`,
  `messaging`, `catalog`, `admin`, ...), `adapt.ts` pour les vues. Les types de
  `lib/api/types.ts` sont **ecrits a la main** d'apres le Swagger de l'API (pas encore
  de client genere depuis `/openapi.json`).
- **Proxy API** : le navigateur appelle `/lf-api/*` (same-origin), relaye par un rewrite
  de `next.config.ts` vers `API_PROXY_TARGET`. Le WebSocket de la messagerie (`/ws`) ne
  passe pas par ce proxy : via `/lf-api`, la messagerie retombe sur un rafraichissement
  periodique.

**Reste mocke** (`lib/mock/`) :

- `/avis` (Avis & temoignages) — `lib/mock/avis.ts`, pas encore d'endpoint branche.
- `/kossam` et `/kossam/[id]` — retires de la nav, routes encore presentes sur mock.
- `lib/mock/types.ts` fournit encore quelques types d'affichage (ex. `ClientStatus`)
  importes par des pages branchees sur l'API.

Pistes restantes : brancher les avis, supprimer les pages Kossam et le reste de
`lib/mock/`, generer les types depuis `/openapi.json` plutot que les maintenir a la main.

## Stack

| Layer | Choix |
|-------|-------|
| Runtime | Node.js 24 (voir `.nvmrc`, doit correspondre aux `FROM` du `Dockerfile`, verifie en CI) |
| Framework | Next.js 16 (App Router) + React 19 |
| Auth | Clerk (`@clerk/nextjs`, `@clerk/localizations`) |
| Data-fetching | TanStack Query (+ devtools en dev) |
| Tableaux | TanStack Table (`components/ui/DataTable.tsx`) |
| Primitives UI | Base UI (`@base-ui/react`) + composants maison dans `components/ui/` |
| Style | Tailwind CSS 4 (`clsx` + `tailwind-merge`) |
| Animations | Framer Motion |
| Icones | Lucide React |

Pas de state manager global ni de lib de formulaires.

## Demarrage local

```bash
cp .env.example .env   # puis renseigner les cles Clerk
npm install
npm run dev
```

Ouvrir http://localhost:8035 (port fixe, voir `package.json`). Il faut un compte Clerk
dont le role (`/me`) est `admin` pour passer la garde.

## Variables d'environnement

Voir `.env.example` (commente). En resume :

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Instance Clerk (partagee avec l'espace client) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `..._SIGN_UP_URL`, `..._SIGN_IN_FALLBACK_REDIRECT_URL` | Routage Clerk (`/login`, pas d'inscription) |
| `NEXT_PUBLIC_API_URL` | Base des appels API ; `/lf-api` (defaut) ou URL directe de l'API |
| `API_PROXY_TARGET` | Cible du rewrite `/lf-api` (defaut `https://lf-api.labsfood.fr`) |
| `NEXT_PUBLIC_SITE_URL` | URL publique de la console |
| `NEXT_PUBLIC_BATCHCOOKING_URL` | Ou renvoyer un compte non admin |
| `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_ENVIRONMENT` | Sentry (region UE) : erreurs JS, rendus casses, replay masque sur erreur. Vide = eteint |
| `SENTRY_ORG`, `SENTRY_AUTH_TOKEN` | Build seulement : envoi des source maps (sans jeton, le build passe sans elles) |

`NEXT_PUBLIC_API_URL` et `API_PROXY_TARGET` sont figees **au build** (inlining Next /
routes-manifest) : dans l'image Docker, elles passent en `ARG`.

## Qualite / hooks

```bash
npm run lint       # eslint (flat config, eslint.config.mjs)
npm run typecheck  # tsc --noEmit
npm run build      # next build
```

Un hook pre-commit (Husky + lint-staged) lance `eslint --fix` sur les fichiers
stages. Installe automatiquement via `npm install` (`scripts.prepare`).

CI (`.github/workflows/`) : `ci.yml` (lint, typecheck, SAST Semgrep, audit des
dependances, aussi en hebdo) gate `docker.yml`, qui construit l'image et verifie
qu'elle demarre, sur push/PR vers `develop` et `main`. Les titres de PR suivent
Conventional Commits (`pr-title.yml`).

## Branches, release et deploiement

- `develop` est la branche par defaut et d'integration ; `main` est la branche de release.
- Un push sur `main` declenche semantic-release (`release.yml`, `.releaserc.json`) :
  tag `vX.Y.Z`, GitHub Release, `CHANGELOG.md` + `package.json` recommites sur `main`.
- Deploiement sur Railway depuis le `Dockerfile` (`output: 'standalone'`). Pas de
  Vercel pour cette app.
