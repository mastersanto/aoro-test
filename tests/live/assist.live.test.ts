/**
 * Live check of the AI assist path against the real Claude API.
 * Costs a real model call — excluded from `npm test`; run with `npm run test:live`.
 * Skips itself when no key is configured.
 */
import { describe, expect, it } from "vitest";
import { groundSuggestions } from "@/lib/ai/grounding";
import { fetchMarkets } from "@/lib/polymarket/gamma";

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!hasKey)("AI assist (live)", () => {
  it("returns suggestions that are all grounded in real supplied markets", async () => {
    const { getAnthropic, ASSIST_MODEL } = await import("@/lib/ai/client");
    const { markets } = await fetchMarkets({ limit: 25 });
    expect(markets.length).toBeGreaterThan(0);

    const client = getAnthropic();
    const message = await client.messages.parse({
      model: ASSIST_MODEL,
      max_tokens: 2048,
      system:
        "Pick at most 3 outcomes from the supplied list that match the user's interest. Only reference a marketId and tokenId that appear in the list. Never invent one.",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["suggestions"],
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["marketId", "tokenId", "reasoning"],
                  properties: {
                    marketId: { type: "string" },
                    tokenId: { type: "string" },
                    reasoning: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      messages: [
        {
          role: "user",
          content: `Interested in: anything popular\n\nOpen markets:\n${JSON.stringify(
            markets.map((m) => ({
              marketId: m.id,
              question: m.question,
              outcomes: m.outcomes.map((o) => ({ tokenId: o.tokenId, label: o.label, price: o.price })),
            })),
          )}`,
        },
      ],
    });

    // The schema must be accepted by the API — a rejected schema is a 400, and
    // mocked tests cannot catch that (this is how the maxItems bug surfaced).
    const grounded = groundSuggestions(markets, message.parsed_output);
    expect(grounded.length).toBeGreaterThan(0);

    const ids = new Set(markets.map((m) => m.id));
    for (const s of grounded) {
      expect(ids.has(s.market.id)).toBe(true);
      expect(s.market.outcomes.some((o) => o.tokenId === s.outcome.tokenId)).toBe(true);
      expect(typeof s.reasoning).toBe("string");
    }
  }, 180_000);
});
