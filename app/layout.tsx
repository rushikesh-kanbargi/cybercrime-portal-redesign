import type { Metadata } from "next";
import { Noto_Sans, Geist_Mono } from "next/font/google";
import { SkipLink } from "@/components/chrome/skip-link";
import { PrototypeBanner } from "@/components/chrome/prototype-banner";
import { SiteHeader } from "@/components/chrome/site-header";
import { Toaster } from "@/components/ui/sonner";
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
  title: "Cybercrime Reporting Portal — Prototype",
  description:
    "A calmer, faster way to report cybercrime and track a complaint. Hackathon prototype — not an official government service.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SkipLink />
        <PrototypeBanner />
        <SiteHeader />
        <main id="main-content" className="flex-1 flex flex-col">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
