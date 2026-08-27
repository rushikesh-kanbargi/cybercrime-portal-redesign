import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  // ponytail: this repo has its own CLAUDE.md conventions; don't let every
  // `next dev` regenerate AGENTS.md/CLAUDE.md scaffolding.
  agentRules: false,
  images: {
    // Real, free-licensed (Unsplash License, not Unsplash+) photography on
    // /safety-tips and /cyber-awareness — see those pages for credit.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
