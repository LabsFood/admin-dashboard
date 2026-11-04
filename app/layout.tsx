import type { Metadata, Viewport } from "next";
import { Montserrat, DM_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";
import Providers from "@/components/Providers";

const fraunces = localFont({
  src: [
    { path: "../public/fonts/Fraunces.ttf", style: "normal", weight: "100 900" },
    { path: "../public/fonts/Fraunces-Italic.ttf", style: "italic", weight: "100 900" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-dm",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lab's Food — Console d'administration",
  description:
    "Console d'administration Lab's Food : batch cooking, demandes sur-mesure, clients et site principal.",
  icons: { icon: "/favicon.png" },
};

export const viewport: Viewport = {
  themeColor: "#00234B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${montserrat.variable} ${dmMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <ClerkProvider localization={frFR}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
