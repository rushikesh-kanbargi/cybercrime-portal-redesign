import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  // ponytail: this repo has its own CLAUDE.md conventions; don't let every
  // `next dev` regenerate AGENTS.md/CLAUDE.md scaffolding.
  agentRules: false,
  // No remotePatterns — every PhotoBanner image (Unsplash License, not
  // Unsplash+) is downloaded once into public/images/photo-banner/ and
  // served locally, not fetched live from images.unsplash.com. Zero runtime
  // third-party dependency, matches the low-bandwidth/mobile-first design
  // rule, and nothing to disclose since nothing is fetched externally.
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
