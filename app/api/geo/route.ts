/**
 * GET /api/geo — may this visitor be offered real betting? (US-5, Art. V)
 *
 * Only gates real betting. Browsing, AI assistance and demo mode are never
 * gated here — they move no money, which is what makes US-5 a read-only
 * degradation rather than a block.
 */
import { NextResponse } from "next/server";
import { evaluateGeo } from "@/lib/geo";

export const dynamic = "force-dynamic";

/** Platform geo headers, most specific first. */
const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-nf-client-connection-country",
];

export async function GET(request: Request) {
  const country =
    COUNTRY_HEADERS.map((h) => request.headers.get(h)).find((v) => v && v.trim()) ?? null;

  const decision = evaluateGeo(country);

  return NextResponse.json(decision, {
    // A geo decision must never be cached and served to a different visitor.
    headers: { "cache-control": "no-store" },
  });
}
