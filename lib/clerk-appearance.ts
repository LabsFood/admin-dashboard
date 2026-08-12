/**
 * Habillage du composant <SignIn /> de Clerk pour la console admin.
 *
 * On réutilise les classes maison définies dans app/globals.css (`input-base`,
 * `btn btn-primary`) afin que les champs Clerk soient indiscernables des autres
 * formulaires de l'admin. Le titre et le sous-titre sont masqués : la page de
 * connexion les rend déjà elle-même avec la typo Fraunces.
 */
export const clerkAuthAppearance = {
  variables: {
    colorPrimary: "#D96941", // --color-terra
    colorText: "#0F1F2E", // --color-ink
    colorTextSecondary: "#3A4A5A", // --color-ink-mid
    colorBackground: "transparent",
    colorInputBackground: "#FFFFFF",
    colorDanger: "#D14545", // --color-danger
    borderRadius: "0.75rem",
    fontFamily: "var(--font-montserrat)",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-none",
    card: "w-full bg-transparent shadow-none border-none p-0 gap-4",
    header: "hidden",
    footer: "hidden",
    formFieldLabel:
      "font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-1.5",
    formFieldInput: "input-base",
    formButtonPrimary:
      "btn btn-primary w-full normal-case tracking-normal text-sm shadow-none",
    formFieldAction: "text-sm text-terra hover:underline font-medium",
    identityPreviewEditButton: "text-terra",
    formResendCodeLink: "text-terra font-medium",
    otpCodeFieldInput: "input-base text-center",
    dividerRow: "hidden",
    socialButtons: "hidden",
  },
  layout: {
    socialButtonsPlacement: "bottom" as const,
    showOptionalFields: false,
  },
};
