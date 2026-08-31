import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Noto_Sans,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Noto_Sans_Kannada,
  Geist_Mono,
} from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SkipLink } from "@/components/chrome/skip-link";
import { AmbientBackdrop } from "@/components/chrome/ambient-backdrop";
import { PrototypeBanner } from "@/components/chrome/prototype-banner";
import { SiteHeader } from "@/components/chrome/site-header";
import { SiteFooter } from "@/components/chrome/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import "./globals.css";

// §19.3 — one family, weight contrast instead of family contrast. Genuine
// One typeface family across every script, so switching language never changes
// how the page feels (§19.3). Devanagari covers both Hindi and Marathi; Tamil,
// Telugu and Kannada are separate Noto families rather than subsets, because
// they are separate scripts.
//
// They are stacked in one font-family rather than swapped per locale: the
// browser already picks the first family containing a given glyph, so this
// needs no locale-aware logic and degrades correctly if one fails to load.
// Weights are trimmed on the non-Latin families to keep the payload sane on a
// 3G connection (§ mobile-first).
const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-tamil",
  subsets: ["tamil"],
  weight: ["400", "500", "600"],
});

const notoTelugu = Noto_Sans_Telugu({
  variable: "--font-telugu",
  subsets: ["telugu"],
  weight: ["400", "500", "600"],
});

const notoKannada = Noto_Sans_Kannada({
  variable: "--font-kannada",
  subsets: ["kannada"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: "Cybercrime Report & Tracking",
  description:
    "A calmer, faster way to report cybercrime and track a complaint. Hackathon prototype, not an official government service.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // §17.3.4 / §16.3 #2 — `lang` on <html> switches with the active locale
  // (the incumbent's own observed failure, fixed here structurally: it's
  // derived from the URL segment, not a client-side afterthought).
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      // next-themes sets class="dark" client-side before hydration paints,
      // which is an expected, one-time mismatch against the server markup.
      suppressHydrationWarning
      className={`${notoSans.variable} ${notoTamil.variable} ${notoTelugu.variable} ${notoKannada.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <ThemeProvider>
          <NextIntlClientProvider>
            <AmbientBackdrop />
            <SkipLink />
            <PrototypeBanner />
            <SiteHeader />
            <main id="main-content" className="flex-1 flex flex-col">
              {children}
            </main>
            <SiteFooter />
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
