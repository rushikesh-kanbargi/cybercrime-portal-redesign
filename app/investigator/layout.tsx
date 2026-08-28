import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "../[locale]/globals.css";

// Internal investigator area (ADR-001) — its own root layout, deliberately
// not nested under app/[locale]: no citizen chrome (AmbientBackdrop,
// PrototypeBanner, SiteHeader/Footer), no i18n provider. English-only for
// now (middleware.ts excludes /investigator from the locale-prefix
// matcher, same way /api already is).

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Investigator — Cybercrime Portal",
  description: "Internal investigator access. Not a public page.",
  robots: { index: false, follow: false },
};

export default function InvestigatorLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${notoSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
