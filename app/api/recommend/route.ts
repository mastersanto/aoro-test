import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// T9 RED: implemented in T10.
export async function POST(_request: Request) {
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
