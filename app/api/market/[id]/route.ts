/**
 * GET /api/market/[id] — refresh one market (feature 003 / AR-1).
 *
 * Exists so the selected market's price stays current. The list cannot serve
 * this: it is query-scoped and filtered to open markets, so a market leaving it
 * says nothing about whether it closed.
 */
import { NextResponse } from "next/server";
import { fetchMarketById } from "@/lib/polymarket/gamma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !id.trim()) {
    return NextResponse.json({ error: "A market id is required." }, { status: 400 });
  }

  try {
    const market = await fetchMarketById(id.trim());
    if (!market) {
      return NextResponse.json({ error: "That market could not be found." }, { status: 404 });
    }
    return NextResponse.json({ market }, { headers: { "cache-control": "no-store" } });
  } catch {
    // Generic on purpose: upstream hosts and paths are not the client's business.
    return NextResponse.json(
      { error: "Market data is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
