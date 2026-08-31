import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/geo/route";

function call(headers: Record<string, string> = {}) {
  return GET(new Request("http://localhost/api/geo", { headers }));
}

describe("GET /api/geo", () => {
  it("reads the country from the platform geo header", async () => {
    const body = await (await call({ "x-vercel-ip-country": "BR" })).json();
    expect(body.country).toBe("BR");
    expect(body.bettingAllowed).toBe(true);
  });

  it("disables betting for a close-only region with an explanation", async () => {
    const body = await (await call({ "x-vercel-ip-country": "US" })).json();
    expect(body.bettingAllowed).toBe(false);
    expect(body.reason).toMatch(/region|available/i);
  });

  it("fails closed when no geo header is present", async () => {
    const body = await (await call()).json();
    expect(body.bettingAllowed).toBe(false);
    expect(body.reason).toBeTruthy();
  });

  it("never caches a geo decision", async () => {
    const res = await call({ "x-vercel-ip-country": "US" });
    expect(res.headers.get("cache-control")).toMatch(/no-store|no-cache/i);
  });
});
