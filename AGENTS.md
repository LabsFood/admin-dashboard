<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ce que c'est

Console d'administration interne de Lab's Food (Next.js App Router). Couvre le pilotage
du batch cooking (reservations, demandes sur-mesure, messagerie, CRM clients), le
catalogue (plats/menus, recettes du monde, formules & tarifs), le site principal
(commandes Kossam, candidatures chef, messages de contact, avis) et l'organisation
(equipe & chefs, parametres). Voir `lib/nav.tsx` pour la liste exacte des sections.

## Etat actuel (important)

Ce repo est un scaffold recent : **toutes les donnees sont mockees** (`lib/mock/`,
14 fichiers, barrel `lib/mock/index.ts`) et **l'authentification est simulee**
(`lib/auth.tsx` — session `localStorage`, `DEMO_USER` fixe, n'importe quel email/mot
de passe non vide fonctionne). Aucun appel reseau n'existe dans le code (pas de
`fetch`/`axios`, pas de `NEXT_PUBLIC_API_URL`). Rien ici n'est encore branche sur
l'API reelle (`LF-BackEnd`, NestJS + Clerk + Postgres).

Prochaine etape fonctionnelle (hors perimetre de ce fichier) : remplacer
`lib/auth.tsx` par `@clerk/nextjs` en suivant le contrat documente dans
`LF-BackEnd/docs/auth/clerk-integration-contract.md`, puis remplacer `lib/mock/*`
par des appels a l'API via un client type genere depuis `LF-BackEnd`'s `/openapi.json`.

## Stack

| Layer | Choix |
|-------|-------|
| Runtime | Node.js 20 (voir `.nvmrc`) |
| Framework | Next.js 16 (App Router) + React 19 |
| Style | Tailwind CSS 4 |
| Animations | Framer Motion |
| Icones | Lucide React |

Pas encore de kit UI (pas de Radix/shadcn), pas de state manager, pas de lib de
formulaires, pas de lib de data-fetching — a introduire au meme moment que le
branchement API reel (voir plus haut) plutot qu'en amont.

## Demarrage local

```bash
npm install
npm run dev
```

Ouvrir http://localhost:8035 (port fixe, voir `package.json`).

## Variables d'environnement

Aucune a ce jour (tout est mock, `.gitignore` bloque deja `.env*`). La premiere
variable attendue sera `NEXT_PUBLIC_API_URL` (URL publique de `LF-BackEnd`) au
moment du branchement reel, suivie des cles publiques Clerk.

## Qualite / hooks

```bash
npm run lint     # eslint (flat config, eslint.config.mjs)
npm run build    # next build
```

Un hook pre-commit (Husky + lint-staged) lance `eslint --fix` sur les fichiers
stages. Installe automatiquement via `npm install` (`scripts.prepare`).

## Deploiement

Pas encore deploye. Cible : Railway (conteneur Docker, `output: 'standalone'`),
voir le plan de migration global — pas de deploiement Vercel a mettre en place
pour cette app.
