import { describe, it, expect } from "vitest";
import { listIntegrations } from "@/lib/integrations/registry";

describe("integration registry — honest disabled-by-default state (external-dependency pass)", () => {
  it("never claims a real (non-synthetic) integration is healthy or configured", () => {
    const integrations = listIntegrations();
    const real = integrations.filter((i) => i.environment === "production");
    expect(real.length).toBeGreaterThan(0);
    for (const r of real) {
      expect(r.health).toBe("not_configured");
      expect(r.provider).toBe("none");
      expect(r.capabilities).toEqual([]);
    }
  });

  it("synthetic adapters are clearly labelled and never claim to be production", () => {
    const integrations = listIntegrations();
    const synthetic = integrations.filter((i) => i.environment === "synthetic" && i.type !== "ai");
    expect(synthetic.length).toBeGreaterThan(0);
    for (const s of synthetic) {
      expect(s.note.toLowerCase()).toMatch(/synthetic|not connected|fabricated/);
    }
  });

  it("the deterministic AI provider is enabled (no external call), the real AI provider is not", () => {
    const integrations = listIntegrations();
    const deterministic = integrations.find((i) => i.id === "ai-deterministic");
    const real = integrations.find((i) => i.id === "ai-real-provider");
    expect(deterministic?.enabled).toBe(true);
    expect(deterministic?.health).toBe("healthy");
    expect(real?.health).toBe("not_configured");
  });
});
