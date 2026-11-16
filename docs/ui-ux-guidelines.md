# Guidelines UI/UX — console d'administration

Règles à tenir pour tout écran de `admin-dashboard`. Elles servent à relire une
PR : chaque ligne se vérifie à l'œil ou avec un `grep`.

La console se lit comme **un outil**, pas comme une page produit : angles
francs, surfaces plates, c'est le fond qui sépare les blocs. Sa palette
(marine `#00234B`, terra `#D96941`) est **volontairement différente** de celle
du site public. Le site a son propre document, `batchcooking-web/docs/ui-ux-guidelines.md`.
Ne jamais copier des valeurs de l'un à l'autre.

## 1. Le budget de mouvement dépend de la fréquence d'usage

Une console s'ouvre toute la journée. Chaque entrée animée se paie à chaque
clic, des centaines de fois.

- Changement de page : fondu de 120 ms, sans déplacement
  ([PageTransition.tsx](../components/ui/PageTransition.tsx)).
- Pas d'animation d'entrée sur les tableaux, les tuiles de chiffres et les
  listes.
- Le mouvement est réservé aux **retours d'action** (toast, bouton en cours,
  ligne mise à jour) et à l'ouverture des tiroirs et dialogues.

## 2. Mouvement

- **Durées** : 120–200 ms. Aucun délai devant une action (Doherty : réponse en
  moins de 400 ms).
- **Courbes** : tout vient de `lib/motion.ts`. Entrée = slow-out, sortie =
  slow-in. Pas de `linear` hors loaders.
- **Appui** : bouton, onglet et pastille se compriment à `0.97` puis reviennent.
- **Anticipation** : seulement sur les actions destructives et les paiements
  (confirmation avant exécution, pas d'animation de plus).
- **Suite du geste et exagération** : une erreur reste jusqu'à fermeture, une
  réussite s'efface (règle de [Toaster.tsx](../components/ui/Toaster.tsx)) ; un
  champ invalide vibre une fois.
- **Mise en scène** : on assombrit derrière un tiroir ou un dialogue ; une seule
  chose bouge à la fois.
- **Pas de boucle décorative** hors indicateurs de chargement.
- **`prefers-reduced-motion`** : `MotionConfig reducedMotion="user"` dans
  `Providers`, et `motion-reduce:animate-none` sur toute animation CSS.
- **Commenter chaque bloc de mouvement** d'une ligne qui nomme le principe et la
  durée : `// slow-out : se pose en 160 ms`. Sans commentaire, on le supprime.
- Écartés volontairement : pose-to-pose, arcs, dessin 3D, squash sur le contenu.

## 3. Lois d'UX

- **Fitts** : toute cible fait au moins 40 × 40 px. On étend la zone cliquable
  (`.hit`) sans grossir l'icône. Cases de tableau et boutons icône compris.
- **Hick et Miller** : la barre latérale compte 18 entrées ; elle se range en 4 à
  5 groupes nommés. Une rangée de tuiles : 5 chiffres au plus.
- **Jacob** : tableau, filtre, tiroir de détail, palette de commandes : on garde
  les conventions des consoles que les équipes connaissent déjà.
- **Postel** : recherche et filtres tolèrent casse, accents et espaces. Les
  champs téléphone et date acceptent plusieurs formats.
- **Doherty** : tout ce qui dépasse 400 ms montre un squelette.

## 4. Anti-slop : ce qu'on ne met pas

- Pas de badge rempli ou décoratif : [Badge.tsx](../components/ui/Badge.tsx) est
  déjà un texte coloré et un point. On garde ce principe.
- Pas d'étiquette qui répète son titre.
- Pas de mot italique en couleur dans un titre.
- **Mono** pour identifiants, références, montants alignés, heures. Pas pour les
  libellés et en-têtes de section.
- Pas de `Sparkles` ni d'icône de « magie ».
- Pas d'ombre ni de bordure décorative : la hiérarchie vient du fond et de
  l'espacement.
- Un seul bouton principal par vue (`.btn-primary`).
- La couleur d'alerte (`danger`, `warning`) sert à un **état**, jamais à décorer.
- Icônes : `lucide-react`, 16 px dans le texte, 20 px en navigation, un seul
  trait.
- Titres précis, sans `<br />` forcé, `text-wrap: balance`.
- On aligne à l'œil : icônes à côté de texte, flèches, colonnes de montants.

## 5. Système visuel

- **Rayons concentriques** : rayon intérieur = rayon extérieur − padding. `.card`
  vaut 10 px : un élément posé dedans avec `p-2` prend 2 px, avec `p-3` il
  n'a plus de rayon.
- `rounded-full` reste pour avatars, points de statut, interrupteurs.
- **Contraste** : texte courant ≥ 4,5:1, grand texte ≥ 3:1. Le texte terra passe
  par `--color-terra-ink`, jamais `--color-terra`.
- **Chiffres** : `tabular-nums` dans `StatCard`, `DataTable`, montants,
  dates, compteurs, identifiants.
- **Tailles** : pas de texte porteur de sens sous 12 px.
- Groupes séparés par l'espacement ; `.hairline` seulement quand deux zones de
  même fond doivent se distinguer.

## 6. États : chargement, vide, erreur

Tout écran qui lit des données a ses trois états. Aucun n'est un spinner seul.

- **Chargement = squelette** de la forme finale, via
  [Skeleton.tsx](../components/ui/Skeleton.tsx). Même hauteur de ligne et même
  nombre de colonnes que le contenu : zéro décalage.
- `DataTable` prend `loading` et `rowCount` et affiche des lignes à la largeur
  réelle des colonnes ; une erreur s'affiche dans le tableau avec « Réessayer ».
- `StatCard` prend `loading` : chiffre à hauteur fixe, plus de `…`.
- Fond du squelette : `cream-deep` (déjà dans `Skeleton`), qui se voit sur le
  blanc d'une carte ou d'un tableau. Un squelette posé directement sur la page
  crème va dans un `.card` blanc. `cream-soft` ne se voit ni sur `paper` ni sur
  `cream`.
- Chaque squelette est `aria-hidden` ; le conteneur porte `role="status"` et
  `aria-busy`, avec un « Chargement » réservé aux lecteurs d'écran
  (`SkeletonGroup`). Statique en `prefers-reduced-motion`.
- Au-delà de 12 s, on propose une issue (`lib/use-too-long.ts`).
- **Routes** : `loading.tsx` et `error.tsx` dans `app/(admin)/`. Un `Suspense`
  n'a jamais `fallback={null}`.
- **Vide** : [EmptyState.tsx](../components/ui/EmptyState.tsx), avec une
  consigne claire.
- **Boutons d'action** : état « en cours » visible, désactivé, texte conservé.
- **Actions fréquentes** (envoi de message, statut, modération) : mise à jour
  optimiste, retour arrière si l'API refuse.

## 7. Tokens de ce front

Source : bloc `@theme` de [app/globals.css](../app/globals.css) (Tailwind 4, pas
de `tailwind.config`).

| Rôle | Token | Valeur |
|---|---|---|
| Texte | `--color-ink` | `#0F1F2E` |
| Texte secondaire | `--color-ink-mid` | `#3A4A5A` |
| Texte discret (≥ 4,5:1) | `--color-ink-soft` | `#5F6B7A` |
| Titres, primaire | `--color-navy` | `#00234B` |
| Accent (fonds, CTA) | `--color-terra` | `#D96941` |
| Accent **texte** | `--color-terra-ink` | `#A24A28` |
| Page | `--color-cream` | `#F7F1E8` |
| Carte | `--color-paper` | `#FFFFFF` |
| Rayons | `--radius-xs` … `--radius-4xl` | 3 px … 14 px |

Statuts : `success`, `warning`, `danger`, `info`, chacun avec une variante
`-soft`. Le corps de texte fait 15 px.

## 8. Checklist de revue

- [ ] Un seul bouton principal par vue.
- [ ] Aucun mot italique, `Sparkles`, badge rempli, ombre décorative.
- [ ] Mono seulement pour identifiants, montants et heures.
- [ ] Texte ≥ 4,5:1, rien sous 12 px qui porte du sens.
- [ ] Cibles ≥ 40 px.
- [ ] Chiffres en `tabular-nums`.
- [ ] Squelette, vide et erreur présents ; pas de décalage.
- [ ] Mouvement ≤ 200 ms, commenté, coupé en reduced-motion.
- [ ] Testé à 375, 768 et 1280 px, au clavier, réseau lent.
