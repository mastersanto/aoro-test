import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// T19 RED: implemented in T20.
export async function GET(_request: Request) {
  return NextResponse.json({ country: null, bettingAllowed: true });
}
