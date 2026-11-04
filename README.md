# Admin Labs Food

This is the administration dashboard for **Labs Food Batch Cooking**.
It is a [Next.js](https://nextjs.org) project bootstrapped with `create-next-app` and styled with Tailwind CSS.

## Getting Started

First, install the dependencies if you haven't already:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:8035](http://localhost:8035) with your browser to see the result. 
Note: The development server is configured to run on port `8035`.

## Technologies

- **Framework**: [Next.js](https://nextjs.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

## Etat du projet

Branche sur l'API `LF-BackEnd` (auth Clerk, donnees via TanStack Query, proxy `/lf-api`).
Seules les pages Avis et Kossam (retiree de la nav) reposent encore sur `lib/mock/`.
Voir [AGENTS.md](./AGENTS.md) pour le detail du stack, des variables d'environnement
(`.env.example`) et du deploiement.
