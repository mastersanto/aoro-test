import { describe, expect, it } from "vitest";
import { realBettingAvailability } from "@/lib/betting-availability";

const ALLOWED = { country: "BR", bettingAllowed: true };
const BLOCKED = {
  country: "US",
  bettingAllowed: false,
  reason: "New bets are not available in your region — close-only here.",
};

describe("realBettingAvailability", () => {
  it("allows real betting only when region, market and wallet all permit it", () => {
    expect(realBettingAvailability({ geo: ALLOWED, realBettingBuilt: true })).toEqual({ allowed: true });
  });

  it("blocks on a restricted region even when the wallet is ready", () => {
    // The regression this function exists to prevent: geo must gate the control,
    // not just the message shown next to it.
    const a = realBettingAvailability({ geo: BLOCKED, realBettingBuilt: true });
    expect(a.allowed).toBe(false);
    expect(a.reason).toContain("region");
  });

  it("blocks while the region is still unknown", () => {
    expect(realBettingAvailability({ geo: null, realBettingBuilt: true }).allowed).toBe(false);
  });

  it("blocks a market Gamma marks restricted, even in an allowed region", () => {
    const a = realBettingAvailability({ geo: ALLOWED, marketRestricted: true, realBettingBuilt: true });
    expect(a.allowed).toBe(false);
    expect(a.reason).toMatch(/market/i);
  });

  it("blocks while the wallet is not wired up", () => {
    const a = realBettingAvailability({ geo: ALLOWED, realBettingBuilt: false });
    expect(a.allowed).toBe(false);
    expect(a.reason).toMatch(/not enabled|demo/i);
  });

  it("reports the region reason first, since it outlives the wallet work", () => {
    const a = realBettingAvailability({ geo: BLOCKED, marketRestricted: true, realBettingBuilt: false });
    expect(a.reason).toContain("region");
  });

  it("always explains a block", () => {
    for (const input of [
      { geo: BLOCKED, realBettingBuilt: true },
      { geo: null, realBettingBuilt: true },
      { geo: ALLOWED, marketRestricted: true, realBettingBuilt: true },
      { geo: ALLOWED, realBettingBuilt: false },
    ]) {
      const a = realBettingAvailability(input);
      expect(a.allowed).toBe(false);
      expect(a.reason && a.reason.length).toBeGreaterThan(10);
    }
  });
});
