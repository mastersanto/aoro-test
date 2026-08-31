import { describe, expect, it } from "vitest";
import { BLOCKED_COUNTRIES, CLOSE_ONLY_COUNTRIES, evaluateGeo } from "@/lib/geo";

describe("evaluateGeo", () => {
  it("allows real betting from an unrestricted region", () => {
    const d = evaluateGeo("BR");
    expect(d.bettingAllowed).toBe(true);
    expect(d.country).toBe("BR");
  });

  it("blocks real betting in the US, which is close-only on the main platform", () => {
    const d = evaluateGeo("US");
    expect(d.bettingAllowed).toBe(false);
    expect(d.reason).toMatch(/region|available/i);
  });

  it("blocks every close-only jurisdiction", () => {
    for (const c of CLOSE_ONLY_COUNTRIES) {
      expect(evaluateGeo(c).bettingAllowed).toBe(false);
    }
  });

  it("blocks sanctioned jurisdictions", () => {
    for (const c of BLOCKED_COUNTRIES) {
      expect(evaluateGeo(c).bettingAllowed).toBe(false);
    }
  });

  it("fails closed when the region cannot be determined", () => {
    // Real money: an unknown region must not be treated as permission.
    for (const v of [null, undefined, ""]) {
      const d = evaluateGeo(v);
      expect(d.bettingAllowed).toBe(false);
      expect(d.reason).toBeTruthy();
    }
  });

  it("is case-insensitive about the country code", () => {
    expect(evaluateGeo("us").bettingAllowed).toBe(false);
    expect(evaluateGeo("br").bettingAllowed).toBe(true);
  });

  it("always explains why betting is unavailable", () => {
    for (const c of ["US", "IR", null]) {
      const d = evaluateGeo(c);
      expect(d.bettingAllowed).toBe(false);
      expect(typeof d.reason).toBe("string");
      expect(d.reason!.length).toBeGreaterThan(10);
    }
  });
});
