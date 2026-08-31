import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// T5 RED: implemented in T6.
export async function GET(
  _request: Request,
  _ctx: { params: Promise<{ id: string }> },
) {
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
