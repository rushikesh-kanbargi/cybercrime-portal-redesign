import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Noto_Sans, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SkipLink } from "@/components/chrome/skip-link";
import { AmbientBackdrop } from "@/components/chrome/ambient-backdrop";
import { PrototypeBanner } from "@/components/chrome/prototype-banner";
import { SiteHeader } from "@/components/chrome/site-header";
import { SiteFooter } from "@/components/chrome/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import "./globals.css";

// §19.3 — one family, weight contrast instead of family contrast. Genuine
// Devanagari coverage so the EN/HI language switch never changes the typeface.
// Kannada is stretch scope (§17.2) and is added the same way when it lands.
const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
      className={`${notoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
      </body>
    </html>
  );
}
