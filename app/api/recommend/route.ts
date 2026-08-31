/**
 * POST /api/recommend — an argued recommendation for ONE selected market
 * (feature 003).
 *
 * Article II permits recommending an outcome; what it forbids is placing one.
 * The risk this route carries is persuasion, so the model's output is
 * constrained in shape and screened before it is serialized — a withheld
 * recommendation never reaches the browser at all.
 */
import { NextResponse } from "next/server";
import { ASSIST_MODEL, MissingApiKeyError, getAnthropic } from "@/lib/ai/client";
import { screenRecommendation, type Parts } from "@/lib/ai/content-screen";
import { fetchMarketById, type Market } from "@/lib/polymarket/gamma";

export const dynamic = "force-dynamic";

/** One regeneration, never a loop: retrying until something passes selects for
 *  prose that is persuasive AND compliant, which is worse than withholding. */
const MAX_ATTEMPTS = 2;

const NO_VIEW = "The assistant has no view to offer on this market right now.";

/** Text and ids only. No numeric property exists here by design (AR-3). */
const RECOMMENDATION_SCHEMA = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["resolvesOn", "priceImplies", "caseFor", "caseAgainst", "favouredTokenId"],
    properties: {
      resolvesOn: { type: "string", description: "What the market resolves on, per its own terms." },
      priceImplies: { type: "string", description: "What the current price shows about how the outcomes trade." },
      caseFor: { type: "string", description: "What must occur for the favoured outcome to be met." },
      caseAgainst: { type: "string", description: "What would have to happen for it to lose." },
      favouredTokenId: { type: "string", description: "tokenId of one outcome of the supplied market." },
    },
  },
};

const SYSTEM = `You describe one Polymarket prediction market for someone deciding whether to bet on it.

Return four short parts and the tokenId of the outcome you would favour.

Absolute rules, because a person may risk money on this:
- Use NO numbers of any kind — no digits, no percentages, no amounts, and no numbers written as words. The application shows the prices itself.
- Do not say how likely anything is. No "likely", "clearly", "certain", "all but", "nothing suggests otherwise", "little stands in the way". Probability is what the price expresses; it is not yours to restate.
- Do not claim the price is wrong, cheap, lagging, or has failed to account for anything.
- Do not tell the reader what to do, and never mention stake size.
- The case for describes what the market's own resolution terms require. The case against describes what would defeat it. Both must be substantive; a recommendation without a real counter-case is not usable.
- Keep every part under 300 characters.`;

function modelView(market: Market) {
  return {
    marketId: market.id,
    question: market.question,
    endDate: market.endDate,
    outcomes: market.outcomes.map((o) => ({ tokenId: o.tokenId, label: o.label, price: o.price })),
  };
}

export async function POST(request: Request) {
  let marketId = "";
  try {
    const body = (await request.json()) as { marketId?: unknown };
    marketId = String(body.marketId ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!marketId) {
    return NextResponse.json({ error: "A market must be selected." }, { status: 400 });
  }

  // Always the server's copy: a client-supplied market could argue about
  // anything at all, and the argued-at price must be one we fetched.
  let market: Market | null;
  try {
    market = await fetchMarketById(marketId);
  } catch {
    return NextResponse.json(
      { error: "Market data is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
  if (!market) {
    return NextResponse.json({ error: "That market could not be found." }, { status: 404 });
  }
  if (market.closed) {
    return NextResponse.json({ withheld: true, reason: "This market has closed." });
  }

  try {
    const client = getAnthropic();

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const message = await client.messages.parse({
        model: ASSIST_MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        output_config: { format: RECOMMENDATION_SCHEMA },
        messages: [
          {
            role: "user",
            content: `Market:\n${JSON.stringify(modelView(market))}`,
          },
        ],
      });

      const out = message.parsed_output as (Parts & { favouredTokenId?: string }) | null;
      if (!out) continue;

      // The favoured outcome must belong to the market the server fetched.
      const outcome = market.outcomes.find((o) => o.tokenId === String(out.favouredTokenId));
      if (!outcome) continue;

      const verdict = screenRecommendation({
        resolvesOn: out.resolvesOn,
        priceImplies: out.priceImplies,
        caseFor: out.caseFor,
        caseAgainst: out.caseAgainst,
      });
      if (!verdict.ok) continue; // never serialized, so never recoverable

      return NextResponse.json({
        recommendation: {
          resolvesOn: out.resolvesOn,
          priceImplies: out.priceImplies,
          caseFor: out.caseFor,
          caseAgainst: out.caseAgainst,
          favouredTokenId: outcome.tokenId,
          // The route's own figure, from the market it fetched (AR-1/AR-3).
          arguedAtPrice: outcome.price,
        },
      });
    }

    // The reason is the app's words. Nothing screened out is echoed back.
    return NextResponse.json({ withheld: true, reason: NO_VIEW });
  } catch (e) {
    console.error("[recommend] failed:", e instanceof Error ? e.message : e);
    if (e instanceof MissingApiKeyError) {
      return NextResponse.json(
        { error: "AI assistance is not configured on this deployment." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "AI assistance is briefly unavailable. Please try again." },
      { status: 503 },
    );
  }
}
