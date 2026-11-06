import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Toute la console est privée : on n'autorise sans compte que la page de
// connexion (et ses sous-routes Clerk : vérification, mot de passe oublié…).
const isPublicRoute = createRouteMatcher(['/login(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return

  // 1) Exige une session (redirige les visiteurs anonymes vers /login).
  await auth.protect()

  // 2) Garde par rôle : seuls les comptes marqués `role: "admin"` dans leurs
  //    public_metadata accèdent à la console. Nécessite d'exposer `metadata`
  //    dans le token de session Clerk (Dashboard → Sessions → Customize) :
  //    { "metadata": "{{user.public_metadata}}" }. Tant que ce n'est pas fait,
  //    la garde côté layout (app/(admin)/layout.tsx) prend le relais.
  const { sessionClaims } = await auth()
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
  if (role && role !== 'admin') {
    const url = new URL('/login', req.url)
    url.searchParams.set('error', 'forbidden')
    return NextResponse.redirect(url)
  }
})

export const config = {
  matcher: [
    // Ignore les fichiers statiques et les internals Next, sauf s'ils sont
    // présents dans les search params.
    // Sans `monitoring` : le relais Sentry n'a pas de session, Clerk le renverrait vers /login.
    '/((?!_next|monitoring|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
