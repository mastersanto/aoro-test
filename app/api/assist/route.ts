/**
 * POST /api/assist — AI-assisted market selection (US-4).
 *
 * Article II: this route suggests; it never places anything. It returns market
 * and outcome references plus reasoning, and the client may only use them to
 * pre-fill the bet form.
 * Article IV: the Claude key is read server-side here and never leaves.
 */
import { NextResponse } from "next/server";
import { ASSIST_MODEL, MissingApiKeyError, getAnthropic } from "@/lib/ai/client";
import { MAX_SUGGESTIONS, groundSuggestions } from "@/lib/ai/grounding";
import { fetchMarkets, searchMarkets, type Market } from "@/lib/polymarket/gamma";

export const dynamic = "force-dynamic";

const CANDIDATE_LIMIT = 40;
const MAX_PROMPT_CHARS = 500;

const SUGGESTION_SCHEMA = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["suggestions"],
    properties: {
      suggestions: {
        // No maxItems: the structured-output schema validator rejects it on
        // arrays. The cap is enforced by the system prompt and, authoritatively,
        // by groundSuggestions() before anything reaches the client.
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["marketId", "tokenId", "reasoning"],
          properties: {
            marketId: { type: "string", description: "id of a market from the supplied list" },
            tokenId: { type: "string", description: "tokenId of one outcome of that market" },
            reasoning: {
              type: "string",
              description:
                "Two sentences at most, referring to the market's current odds. Not financial advice.",
            },
          },
        },
      },
    },
  },
};

const SYSTEM = `You help someone browse Polymarket prediction markets.

You will be given a list of currently open markets with their outcomes and live prices.
Choose at most ${MAX_SUGGESTIONS} outcomes that best match what the user describes.

Rules:
- Only ever reference a marketId and tokenId that appear in the supplied list. Never invent one.
- Base your reasoning on the supplied odds and the market's wording.
- You are not a financial adviser: explain what the market is and what its price implies, never tell the user what they should do or predict a guaranteed result.
- If nothing in the list matches, return an empty suggestions array.`;

/** Only what the model needs — ids, wording and live prices. */
function toModelView(markets: Market[]) {
  return markets.map((m) => ({
    marketId: m.id,
    question: m.question,
    endDate: m.endDate,
    volume24hr: Math.round(m.volume24hr),
    outcomes: m.outcomes.map((o) => ({
      tokenId: o.tokenId,
      label: o.label,
      price: o.price,
    })),
  }));
}

export async function POST(request: Request) {
  let prompt = "";
  try {
    const body = (await request.json()) as { prompt?: unknown };
    prompt = String(body.prompt ?? "").trim().slice(0, MAX_PROMPT_CHARS);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "Describe what you're interested in." }, { status: 400 });
  }

  let candidates: Market[];
  try {
    // Ground in markets that are open right now, biased toward what the user asked about.
    const [searched, top] = await Promise.all([
      searchMarkets(prompt, 20)
        .then((r) => r.markets)
        .catch(() => [] as Market[]),
      fetchMarkets({ limit: CANDIDATE_LIMIT }).then((p) => p.markets).catch(() => [] as Market[]),
    ]);
    const seen = new Set<string>();
    candidates = [...searched, ...top]
      .filter((m) => !m.closed && m.outcomes.length > 0)
      .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
      .slice(0, CANDIDATE_LIMIT);
  } catch {
    return NextResponse.json(
      { error: "Market data is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }

  if (candidates.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const client = getAnthropic();
    const message = await client.messages.parse({
      model: ASSIST_MODEL,
      max_tokens: 2048,
      system: SYSTEM,
      output_config: { format: SUGGESTION_SCHEMA },
      messages: [
        {
          role: "user",
          content: `The user is interested in: ${prompt}\n\nOpen markets:\n${JSON.stringify(
            toModelView(candidates),
          )}`,
        },
      ],
    });

    // Every field the user sees is rebuilt from our own market data (Art. II).
    const suggestions = groundSuggestions(candidates, message.parsed_output);
    return NextResponse.json({ suggestions });
  } catch (e) {
    // Log server-side so a failure is diagnosable; the client still gets a
    // generic message, since provider internals are not its business (Art. IV).
    console.error("[assist] model call failed:", e instanceof Error ? e.message : e);

    if (e instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "AI assistance is not configured on this deployment." },
        { status: 503 },
      );
    }
    // Never surface provider internals to the client.
    return NextResponse.json(
      { error: "AI assistance is briefly unavailable. Please try again." },
      { status: 503 },
    );
  }
}
