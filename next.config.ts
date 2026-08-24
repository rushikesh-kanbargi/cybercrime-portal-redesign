import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // ponytail: this repo has its own CLAUDE.md conventions; don't let every
  // `next dev` regenerate AGENTS.md/CLAUDE.md scaffolding.
  agentRules: false,
};

export default nextConfig;
