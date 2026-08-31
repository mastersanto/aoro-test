/**
 * VR-5: the palette is checked by arithmetic, not by looking at it — and not by
 * "surfaces already styled", of which there are none when the tokens land.
 */
import { describe, expect, it } from "vitest";
import { REJECTED_DIM, TEXT_PAIRS, color, contrastRatio } from "@/lib/tokens";

describe("design tokens", () => {
  it("every text pair meets WCAG AA for body text", () => {
    const failures = TEXT_PAIRS.filter((p) => !p.large).flatMap((p) => {
      const r = contrastRatio(p.fg, p.bg);
      return r >= 4.5 ? [] : [`${p.name}: ${r.toFixed(2)}:1`];
    });
    expect(failures, "pairs below 4.5:1").toEqual([]);
  });

  it("never ships the dim grey the audit rejected", () => {
    expect(Object.values(color)).not.toContain(REJECTED_DIM);
    // ...and the rejected value is genuinely the reason: it fails the bar.
    expect(contrastRatio(REJECTED_DIM, color.ground)).toBeLessThan(4.5);
    expect(contrastRatio(REJECTED_DIM, color.panel)).toBeLessThan(4.5);
  });

  it("the replacement clears the bar it was chosen for", () => {
    expect(contrastRatio(color.dim, color.ground)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(color.dim, color.panel)).toBeGreaterThanOrEqual(4.5);
  });

  it("computes known contrast ratios correctly", () => {
    // Anchors: identical colours are 1:1, black on white is 21:1.
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
  });

  it("keeps the demo colour distinct from the outcome colours", () => {
    expect(color.demo).not.toBe(color.up);
    expect(color.demo).not.toBe(color.down);
  });
});
