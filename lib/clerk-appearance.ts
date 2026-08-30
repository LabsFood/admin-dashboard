/**
 * Habillage du <SignIn> Clerk — console admin.
 *
 * Principe : on thématise via les **variables** de Clerk et on le laisse gérer
 * sa mise en page. On n'injecte volontairement PAS nos classes maison
 * (`input-base`, `btn btn-primary`) sur `formFieldInput` / `formButtonPrimary` :
 * ces sélecteurs visent *tous* les champs, y compris les cases à cocher et les
 * champs de code — ce qui déformait les écrans « mot de passe oublié »,
 * « vérification » et « réinitialisation ».
 *
 * Les ajustements restants (carte à plat, boutons en pilule, masquage des
 * connexions sociales) sont faits en CSS ciblé dans app/globals.css.
 */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#D96941", // --color-terra
    colorText: "#0F1F2E", // --color-ink
    colorTextSecondary: "#3A4A5A", // --color-ink-mid
    colorBackground: "transparent",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#0F1F2E",
    colorDanger: "#D14545",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-montserrat)",
    fontSize: "0.875rem",
  },
  elements: {
    // La page rend déjà son titre et son sous-titre.
    header: "hidden",
    footer: "hidden",
  },
  layout: {
    showOptionalFields: false,
  },
};
