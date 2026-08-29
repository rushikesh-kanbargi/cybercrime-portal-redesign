import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Phone, ChevronDown, Menu, ExternalLink, LogIn } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteMark } from "./site-mark";
import { ScrollProgress } from "./scroll-progress";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getSessionUser } from "@/lib/session";
import { SignOutButton } from "./sign-out-button";

// §13.3 / §19.5 — the tel:1930 action is persistent chrome and must never
// scroll away. `sticky top-0` keeps it pinned through every screen in the
// app, including the reporting flow, without duplicating it per-page.
//
// D54 (§33) — nav restructured for full structural parity with the real
// portal's grouping ("Register a Complaint" / "Report & Check Suspect" /
// "Cyber Volunteers" / "Resources", the last standing in for "Learning
// Corner"), while every leaf link stays real (D25): finished flows link
// straight to their real routes, informational pages are genuinely useful
// content, unbuildable items are honest /not-built stubs, and the two
// items with a real external government service (TAFCOP, GAC) open in a
// new tab with an ExternalLink icon and are announced via sr-only text.
// The desktop bar uses horizontal scroll as a safety net at narrow desktop
// widths rather than wrapping or truncating labels.
const EXTERNAL_LINK_CLASSES =
  "flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-foreground outline-none select-none focus:bg-muted focus:text-foreground";

export async function SiteHeader() {
  const t = await getTranslations("common");
  // §7.2 #16 — "My complaints" only appears once there's a session to show
  // a list for (the mocked-OTP account upgrade on the report confirmation
  // screen creates it). Anonymous visitors never see a dead link.
  const user = await getSessionUser();

  const externalLinkLabel = t("nav.opensNewTab");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <ScrollProgress />
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-2 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-foreground"
        >
          <SiteMark className="size-8 shrink-0 text-primary" />
          {/* Stacked rather than strung out in a row: the acronym and its
              expansion together were eating the width the nav needs, and a
              horizontally scrolling nav is a nav people never reach the end
              of. Both strings stay in the accessibility tree at every width
              (never `hidden`), so the link always has a discernible name. */}
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight">{t("siteName")}</span>
            <span className="sr-only text-[11px] font-normal text-muted-foreground lg:not-sr-only">
              {t("siteNameFull")}
            </span>
          </span>
        </Link>

        <nav
          aria-label={t("nav.label")}
          // Scrollbar hidden visually (still scrollable by drag/trackpad/wheel):
          // a visible native scrollbar reserves extra box height, which throws
          // off vertical centering against the button cluster on the right.
          // `py-1` gives keyboard focus rings room to render without being
          // clipped by the same overflow-x-auto (it forces overflow-y to clip
          // too — CSS overflow spec). Full desktop nav only renders at
          // min-[1280px] (see button cluster below): measured to have zero
          // overflow there; below that, every real screen (MacBooks included,
          // ~1280-1728px effective) gets the mobile hamburger instead of a
          // cramped, clipping bar.
          className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto py-1 text-sm [-ms-overflow-style:none] [scrollbar-width:none] min-[1280px]:flex [&::-webkit-scrollbar]:hidden"
        >
          {/* D54 — the persistent logo already links home; the real
              site's separate flat "Home" item is dropped here so six
              substantive nav groups fit at a realistic desktop width
              without clipping (ponytail: trim, don't add a second nav row). */}

          {/* Register a Complaint */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2.5 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
              >
                {t("nav.registerComplaint.trigger")}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/report/harassment">{t("nav.registerComplaint.women")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/report/money">{t("nav.registerComplaint.financial")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/report/hacked">{t("nav.registerComplaint.other")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/track"
            className="shrink-0 rounded-md px-2.5 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("nav.track")}
          </Link>

          {/* Report & Check Suspect */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2.5 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
              >
                {t("nav.reportCheckSuspect.trigger")}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{t("nav.reportCheckSuspect.repositoryLabel")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/check-suspect">{t("nav.reportCheckSuspect.checkContact")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/check-suspect">{t("nav.reportCheckSuspect.checkWebsite")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nav.reportCheckSuspect.reportLabel")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/not-built/report-suspect">{t("nav.reportCheckSuspect.reportI4C")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/report-suspect">{t("nav.reportCheckSuspect.reportSocial")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://tafcop.sancharsaathi.gov.in/telecomUser/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={EXTERNAL_LINK_CLASSES}
                >
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {t("nav.reportCheckSuspect.tafcop")}
                  <span className="sr-only"> ({externalLinkLabel})</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href="https://gac.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={EXTERNAL_LINK_CLASSES}
                >
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {t("nav.reportCheckSuspect.gac")}
                  <span className="sr-only"> ({externalLinkLabel})</span>
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cyber Volunteers */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2.5 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
              >
                {t("nav.cyberVolunteersNav.trigger")}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <Link href="/cyber-volunteers">{t("nav.cyberVolunteersNav.concept")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/unlawful-content">{t("nav.cyberVolunteersNav.unlawfulContent")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/not-built/volunteer-account">{t("nav.cyberVolunteersNav.terms")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/volunteer-account">{t("nav.cyberVolunteersNav.register")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/volunteer-account">{t("nav.cyberVolunteersNav.login")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Resources (real-site "Learning Corner" equivalent) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2.5 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=open]:bg-muted data-[state=open]:text-foreground"
              >
                {t("nav.resources")}
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[75vh] overflow-y-auto">
              <DropdownMenuItem asChild>
                <Link href="/help/just-happened">{t("nav.resourcesItems.help")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/safety-tips">{t("nav.resourcesItems.safetyTips")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/faq">{t("nav.resourcesItems.faq")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/advisories">{t("nav.resourcesExtra.advisories")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/cyber-awareness">{t("nav.resourcesExtra.cyberAwareness")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nav.resourcesExtra.learningLabel")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/not-built/media-gallery">{t("nav.resourcesExtra.mediaGallery")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/daily-digest">{t("nav.resourcesExtra.dailyDigest")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/training-resources">{t("nav.resourcesExtra.trainingResources")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/screen-reader">{t("nav.resourcesExtra.screenReader")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/public-notices">{t("nav.resourcesExtra.publicNotices")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/whats-real">{t("nav.resourcesItems.whatsReal")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accessibility">{t("nav.resourcesItems.accessibility")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/privacy">{t("nav.resourcesItems.privacy")}</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/contact"
            className="shrink-0 rounded-md px-2.5 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("nav.contact")}
          </Link>

          {user && (
            <Link
              href="/profile"
              className="shrink-0 rounded-md px-2.5 py-2 font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t("nav.myComplaints")}
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2 py-1 sm:gap-3">
          {/* py-1 matches the nav's own py-1 above, so both blocks stay the
              same height and centered flush with each other. Sign in/out
              lives here (not in the crowded inline nav) as a real button,
              matching Call 1930's shape but a distinct secondary fill —
              icon-only (accessible name still present, sr-only) to keep the
              full nav fitting from min-[1280px] up rather than a much
              wider, MacBook-hostile threshold. */}
          {user ? (
            <SignOutButton className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-input bg-secondary/60 px-3 py-2 text-sm font-medium whitespace-nowrap text-secondary-foreground transition-colors hover:bg-secondary min-[1280px]:inline-flex" />
          ) : (
            // Signing in is never required to report — it only gets a
            // returning citizen back to their own list (§12). The link is a
            // real destination either way, so it is never a dead affordance.
            <Link
              href="/login"
              className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-md border border-input bg-secondary/60 px-3 py-2 text-sm font-medium whitespace-nowrap text-secondary-foreground transition-colors hover:bg-secondary min-[1280px]:inline-flex"
            >
              <LogIn className="size-3.5" aria-hidden="true" />
              {t("nav.signIn")}
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("nav.label")}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted min-[1280px]:hidden"
              >
                <Menu className="size-4.5" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[80vh] overflow-y-auto">
              <DropdownMenuItem asChild>
                <Link href="/">{t("nav.home")}</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nav.registerComplaint.trigger")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/report/harassment">{t("nav.registerComplaint.women")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/report/money">{t("nav.registerComplaint.financial")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/report/hacked">{t("nav.registerComplaint.other")}</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/track">{t("nav.track")}</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nav.reportCheckSuspect.trigger")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/check-suspect">{t("nav.reportCheckSuspect.checkContact")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/check-suspect">{t("nav.reportCheckSuspect.checkWebsite")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/report-suspect">{t("nav.reportCheckSuspect.reportI4C")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/report-suspect">{t("nav.reportCheckSuspect.reportSocial")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://tafcop.sancharsaathi.gov.in/telecomUser/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={EXTERNAL_LINK_CLASSES}
                >
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {t("nav.reportCheckSuspect.tafcop")}
                  <span className="sr-only"> ({externalLinkLabel})</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://gac.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={EXTERNAL_LINK_CLASSES}
                >
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {t("nav.reportCheckSuspect.gac")}
                  <span className="sr-only"> ({externalLinkLabel})</span>
                </a>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nav.cyberVolunteersNav.trigger")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/cyber-volunteers">{t("nav.cyberVolunteersNav.concept")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/unlawful-content">{t("nav.cyberVolunteersNav.unlawfulContent")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/volunteer-account">{t("nav.cyberVolunteersNav.terms")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/volunteer-account">{t("nav.cyberVolunteersNav.register")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/volunteer-account">{t("nav.cyberVolunteersNav.login")}</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("nav.resources")}</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href="/help/just-happened">{t("nav.resourcesItems.help")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/safety-tips">{t("nav.resourcesItems.safetyTips")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/faq">{t("nav.resourcesItems.faq")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/advisories">{t("nav.resourcesExtra.advisories")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/cyber-awareness">{t("nav.resourcesExtra.cyberAwareness")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/media-gallery">{t("nav.resourcesExtra.mediaGallery")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/daily-digest">{t("nav.resourcesExtra.dailyDigest")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/training-resources">{t("nav.resourcesExtra.trainingResources")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/screen-reader">{t("nav.resourcesExtra.screenReader")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/not-built/public-notices">{t("nav.resourcesExtra.publicNotices")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/whats-real">{t("nav.resourcesItems.whatsReal")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/accessibility">{t("nav.resourcesItems.accessibility")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/privacy">{t("nav.resourcesItems.privacy")}</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/contact">{t("nav.contact")}</Link>
              </DropdownMenuItem>
              {user ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">{t("nav.myComplaints")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <SignOutButton className="flex w-full items-center gap-2" />
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login">{t("nav.signIn")}</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle
            darkLabel={t("themeToggle.toDark")}
            lightLabel={t("themeToggle.toLight")}
            className="border border-input bg-secondary/60 hover:bg-secondary"
          />
          <LanguageSwitcher />
          <a
            href="tel:1930"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Phone className="size-4" aria-hidden="true" />
            {t("header.call1930")}
          </a>
        </div>
      </div>
    </header>
  );
}
