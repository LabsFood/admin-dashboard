/* ─────────────────────────────────────────────────────────────────────────────
   Retrouver un plat dans « Plats & menus » (retour de recette du 26/11).

   Comme le veut la règle Postel des guidelines : casse, accents, espaces, et
   aussi ligatures et apostrophe typographique ne comptent pas (« boeuf » trouve
   « bœuf », « d'arachide » trouve « d’arachide »). On cherche dans le nom, la
   description et le pays. Le texte tapé est cherché tel quel, jamais compilé en
   expression régulière.

   Aucun import : le module se vérifie seul, hors de Next.
   ───────────────────────────────────────────────────────────────────────────── */

function plie(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[’‘ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function chercherPlats<
  T extends { name: string; description?: string | null; country?: string | null },
>(plats: readonly T[], recherche: string, pays: (code: string | null) => string): T[] {
  const q = plie(recherche);
  if (!q) return [...plats];
  return plats.filter(
    (p) =>
      plie(p.name).includes(q) ||
      plie(p.description ?? "").includes(q) ||
      plie(pays(p.country ?? null)).includes(q),
  );
}
