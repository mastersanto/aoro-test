/**
 * Article II grounding invariant: the AI can only ever point at real, supplied
 * markets, and never supplies the numbers the user acts on.
 */
import { describe, expect, it } from "vitest";
import { MAX_SUGGESTIONS, groundSuggestions } from "@/lib/ai/grounding";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const candidates = fixture.markets.map(normalizeMarket);
const [marketA, marketB] = candidates;

describe("groundSuggestions", () => {
  it("grounds a valid suggestion in the supplied market and outcome", () => {
    const out = groundSuggestions(candidates, {
      suggestions: [
        { marketId: marketA.id, tokenId: marketA.outcomes[0].tokenId, reasoning: "Because." },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].market.id).toBe(marketA.id);
    expect(out[0].outcome.tokenId).toBe(marketA.outcomes[0].tokenId);
    expect(out[0].reasoning).toBe("Because.");
  });

  it("takes price and label from the candidate, never from the model", () => {
    const out = groundSuggestions(candidates, {
      suggestions: [
        {
          marketId: marketA.id,
          tokenId: marketA.outcomes[0].tokenId,
          reasoning: "r",
          // A model trying to assert its own numbers must be ignored.
          price: 0.99,
          outcomeLabel: "TOTALLY MADE UP",
          question: "A market that does not exist",
        },
      ],
    });
    expect(out[0].outcome.price).toBe(marketA.outcomes[0].price);
    expect(out[0].outcome.label).toBe(marketA.outcomes[0].label);
    expect(out[0].market.question).toBe(marketA.question);
    expect(JSON.stringify(out)).not.toContain("TOTALLY MADE UP");
    expect(JSON.stringify(out)).not.toContain("does not exist");
  });

  it("drops a suggestion naming a market that was never supplied", () => {
    const out = groundSuggestions(candidates, {
      suggestions: [{ marketId: "999999", tokenId: "123", reasoning: "invented" }],
    });
    expect(out).toEqual([]);
  });

  it("drops a suggestion whose token belongs to a different market", () => {
    const out = groundSuggestions(candidates, {
      suggestions: [
        { marketId: marketA.id, tokenId: marketB.outcomes[0].tokenId, reasoning: "mismatched" },
      ],
    });
    expect(out).toEqual([]);
  });

  it("keeps the valid suggestions when only some are invented", () => {
    const out = groundSuggestions(candidates, {
      suggestions: [
        { marketId: "999999", tokenId: "123", reasoning: "invented" },
        { marketId: marketB.id, tokenId: marketB.outcomes[1].tokenId, reasoning: "real" },
      ],
    });
    expect(out).toHaveLength(1);
    expect(out[0].market.id).toBe(marketB.id);
  });

  it("returns nothing for malformed model output rather than throwing", () => {
    expect(groundSuggestions(candidates, null)).toEqual([]);
    expect(groundSuggestions(candidates, {})).toEqual([]);
    expect(groundSuggestions(candidates, { suggestions: "nope" })).toEqual([]);
    expect(groundSuggestions(candidates, { suggestions: [null, 42, "x"] })).toEqual([]);
  });

  it("returns nothing when there are no candidates to ground against", () => {
    expect(
      groundSuggestions([], { suggestions: [{ marketId: "1", tokenId: "2", reasoning: "r" }] }),
    ).toEqual([]);
  });

  it("caps how many suggestions can be surfaced", () => {
    const many = Array.from({ length: 10 }, () => ({
      marketId: marketA.id,
      tokenId: marketA.outcomes[0].tokenId,
      reasoning: "r",
    }));
    expect(groundSuggestions(candidates, { suggestions: many }).length).toBeLessThanOrEqual(
      MAX_SUGGESTIONS,
    );
  });

  it("coerces reasoning to a string and never emits undefined", () => {
    const out = groundSuggestions(candidates, {
      suggestions: [{ marketId: marketA.id, tokenId: marketA.outcomes[0].tokenId }],
    });
    expect(out).toHaveLength(1);
    expect(typeof out[0].reasoning).toBe("string");
  });
});
