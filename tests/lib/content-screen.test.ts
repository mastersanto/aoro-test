/**
 * AR-3, feature 003.
 *
 * Two bodies of evidence, deliberately separate:
 *  - the DEFEAT CORPUS (specs/003-scoped-outcome-recommendation/defeat-corpus.md):
 *    sentences that actually beat an earlier draft.
 *  - HELD-OUT sentences, written here and recorded nowhere else, so a screen
 *    that string-matches the corpus fails. Passing the corpus is necessary and
 *    not sufficient, and this file is where that is enforced.
 */
import { describe, expect, it } from "vitest";
import { MAX_PART_CHARS, screenRecommendation, type Parts } from "@/lib/ai/content-screen";

/** A recommendation that must pass. Fixed here, in the RED task, so a screen
 *  that simply refuses everything fails at this gate rather than later. */
const COMPLIANT_A: Parts = {
  resolvesOn: "Resolves on the ATP's published match result for this fixture.",
  priceImplies: "The price reflects where traders are placing this outcome relative to the other.",
  caseFor: "For this outcome, the match must be completed and recorded as a win for the named player.",
  caseAgainst: "It loses if the other player wins, or if the match is abandoned before a result stands.",
};
const COMPLIANT_B: Parts = {
  resolvesOn: "Resolves on the closing price reported by the named source on the stated date.",
  priceImplies: "The price shows how the two outcomes are currently trading against each other.",
  caseFor: "This outcome requires the reported level to be at or above the threshold on that date.",
  caseAgainst: "It fails if the reported level is below the threshold, or the source publishes no figure.",
};

const with_ = (part: keyof Parts, text: string): Parts => ({ ...COMPLIANT_A, [part]: text });

/** Every sentence in defeat-corpus.md. This list only grows. */
const CORPUS: Array<[string, keyof Parts]> = [
  ["the market is badly underpricing this", "caseFor"],
  ["the steps that remain are procedural, and nothing in the record shows them being contested", "caseFor"],
  ["the conditions this outcome needs have held nine times out of ten", "caseFor"],
  ["the current price implies the market has not yet taken account of the most recent steps", "priceImplies"],
  ["little stands in the way of this resolving", "caseFor"],
  // Found in live production output on the first real run (MC-6).
  ["Yes priced as a remote branch of the many possible policy paths", "priceImplies"],
  ["a plausible outcome if the data softens", "caseAgainst"],
];

/** Written for this task; deliberately absent from the corpus file. */
const HELD_OUT: Array<[string, keyof Parts, string]> = [
  ["this outcome is very likely given the schedule", "caseFor", "likelihood"],
  ["it is all but settled at this stage", "caseFor", "likelihood"],
  ["there is no realistic path for the alternative", "caseFor", "likelihood"],
  ["it would be hard to see this going the other way", "caseFor", "likelihood"],
  ["nothing suggests the process will be interrupted", "caseFor", "likelihood"],
  ["the outcome is close to certain on current form", "caseFor", "likelihood"],
  ["this remains a remote possibility", "caseFor", "likelihood"],
  ["a conceivable path exists for the other side", "caseAgainst", "likelihood"],
  ["it is a reasonable prospect at this stage", "caseFor", "likelihood"],
  ["this has happened in four of the last five comparable cases", "caseFor", "quantity"],
  ["the level sits about twenty points below the threshold", "caseFor", "quantity"],
  ["a 3% move would settle it", "caseFor", "quantity"],
  ["it would take $50,000 of volume to shift", "priceImplies", "quantity"],
  ["the price looks cheap for what it covers", "priceImplies", "mispricing"],
  ["traders have not fully absorbed the latest development", "priceImplies", "mispricing"],
  ["this is trading below where it should be", "priceImplies", "mispricing"],
  ["the market has been slow to reprice this", "priceImplies", "mispricing"],
  ["you should take this side while it lasts", "caseFor", "instruction"],
  ["consider backing this outcome today", "caseFor", "instruction"],
  ["this outcome will occur before the deadline", "caseFor", "certainty"],
  ["the other side will not recover from here", "caseAgainst", "certainty"],
  ["a larger position makes sense here", "caseFor", "stake"],
  ["size this one carefully", "caseFor", "stake"],
];

describe("screenRecommendation — accepts what it must", () => {
  it("passes a plainly compliant recommendation", () => {
    expect(screenRecommendation(COMPLIANT_A)).toEqual({ ok: true });
  });

  it("passes a second, differently worded compliant recommendation", () => {
    expect(screenRecommendation(COMPLIANT_B)).toEqual({ ok: true });
  });
});

describe("screenRecommendation — the defeat corpus", () => {
  it.each(CORPUS)("rejects: %s", (sentence, part) => {
    const result = screenRecommendation(with_(part, sentence));
    expect(result.ok, `corpus sentence got through: "${sentence}"`).toBe(false);
  });
});

describe("screenRecommendation — held-out sentences (not in the corpus)", () => {
  it.each(HELD_OUT)("rejects (%s): %s", (sentence, part) => {
    const result = screenRecommendation(with_(part, sentence));
    expect(result.ok, `held-out sentence got through: "${sentence}"`).toBe(false);
  });

  it("names which rule fired, so a failure is diagnosable", () => {
    const r = screenRecommendation(with_("caseFor", "this is very likely to resolve"));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.rule).toBeTruthy();
      expect(r.part).toBe("caseFor");
      expect(r.evidence).toBeTruthy();
    }
  });

  it("never returns a rewritten text — it decides, it does not edit", () => {
    const r = screenRecommendation(with_("caseFor", "this is very likely"));
    expect(Object.keys(r)).not.toContain("text");
    expect(Object.keys(r)).not.toContain("cleaned");
  });
});

describe("screenRecommendation — quantities in any form", () => {
  it.each([
    ["19%", "digit percentage"],
    ["at 0.19 the case holds", "decimal"],
    ["$90 of interest", "currency"],
    ["nine times out of ten", "spelled-out probability"],
    ["two thirds of comparable cases", "spelled-out fraction"],
    ["a hundred similar fixtures", "spelled-out magnitude"],
  ])("rejects %s (%s)", (text) => {
    expect(screenRecommendation(with_("caseFor", `The case is that ${text}.`)).ok).toBe(false);
  });
});

describe("screenRecommendation — length", () => {
  it("rejects a part longer than the bound, so no field accumulates force by volume", () => {
    const long = "The requirement is that the recorded result stands. ".repeat(20);
    expect(long.length).toBeGreaterThan(MAX_PART_CHARS);
    expect(screenRecommendation(with_("caseFor", long)).ok).toBe(false);
  });

  it("accepts a part at the bound", () => {
    const exact = "a".repeat(MAX_PART_CHARS);
    const r = screenRecommendation(with_("caseAgainst", exact));
    expect(r.ok).toBe(true);
  });
});

describe("screenRecommendation — every part is screened", () => {
  it.each(["resolvesOn", "priceImplies", "caseFor", "caseAgainst"] as const)(
    "screens %s",
    (part) => {
      expect(screenRecommendation(with_(part, "this is virtually certain")).ok).toBe(false);
    },
  );

  it("rejects a missing or empty part rather than passing a partial recommendation", () => {
    expect(screenRecommendation({ ...COMPLIANT_A, caseAgainst: "" }).ok).toBe(false);
    expect(screenRecommendation({ ...COMPLIANT_A, caseAgainst: "   " }).ok).toBe(false);
  });
});
