/**
 * Recovering from a failure (004 / UX-5).
 *
 * The gap is not that recovery is missing — the assist panel's button stays
 * mounted and enabled and the prompt survives. It is that the control says the
 * same thing it said before the failure, so nothing marks it as the way back.
 *
 * Two exclusions are constitutional and are asserted as firmly as the
 * affordances: a failed bet placement and a fail-closed geo decision must offer
 * no retry.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistPanel } from "@/components/AssistPanel";
import { RecommendPanel } from "@/components/RecommendPanel";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const [marketA] = fixture.markets.map(normalizeMarket);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("the assist panel (UX-5)", () => {
  function fail() {
    const spy = vi.fn(async (_url: string, _init?: { body?: string }) => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "AI assistance is briefly unavailable." }),
    }));
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  async function ask(text = "the fed meeting") {
    render(<AssistPanel onUseSuggestion={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: text },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await screen.findByRole("alert");
  }

  it("relabels its action as a retry after a failure", async () => {
    fail();
    await ask();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^get suggestions$/i })).toBeNull();
  });

  it("keeps what the user typed", async () => {
    fail();
    await ask("the fed meeting");
    expect(screen.getByLabelText(/what are you interested in/i)).toHaveValue("the fed meeting");
  });

  it("re-sends the same request", async () => {
    const spy = fail();
    await ask("the fed meeting");
    spy.mockClear();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(String(spy.mock.calls[0][1]?.body)).toContain("the fed meeting");
  });

  it("shows a retry in progress and cannot double-fire", async () => {
    let release!: () => void;
    const spy = vi.fn(async () => {
      await new Promise<void>((r) => {
        release = r;
      });
      return { ok: false, status: 503, json: async () => ({ error: "still down" }) };
    });
    render(<AssistPanel onUseSuggestion={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "x" },
    });
    vi.stubGlobal("fetch", spy);

    const button = screen.getByRole("button", { name: /get suggestions/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/thinking/i);

    release();
    await screen.findByRole("alert");
  });

  it("returns to its original label once a retry succeeds", async () => {
    const spy = vi.fn();
    spy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "down" }) });
    spy.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ suggestions: [] }) });
    vi.stubGlobal("fetch", spy);

    render(<AssistPanel onUseSuggestion={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /get suggestions/i })).toBeInTheDocument(),
    );
  });

  it("keeps the disclaimer with the suggestions after a retry (Art. V)", async () => {
    const suggestion = {
      market: marketA,
      outcome: marketA.outcomes[0],
      reasoning: "Odds imply 9%.",
    };
    const spy = vi.fn();
    spy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "down" }) });
    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: [suggestion] }),
    });
    vi.stubGlobal("fetch", spy);

    render(<AssistPanel onUseSuggestion={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await screen.findByTestId("suggestion-0");
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });
});

describe("the recommendation panel (UX-5)", () => {
  it("relabels as a retry and re-requests", () => {
    const onRequest = vi.fn();
    render(
      <RecommendPanel
        market={marketA}
        recommendation={null}
        loading={false}
        error="AI assistance is briefly unavailable."
        withheldReason={null}
        withdrawnReason={null}
        onRequest={onRequest}
        onUse={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it("cannot be pressed while a request is in flight", () => {
    const onRequest = vi.fn();
    render(
      <RecommendPanel
        market={marketA}
        recommendation={null}
        loading
        error="down"
        withheldReason={null}
        withdrawnReason={null}
        onRequest={onRequest}
        onUse={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: /thinking|try again/i });
    expect(button).toBeDisabled();
  });
});

function stubWidget(overrides: (url: string) => unknown | null = () => null) {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url);
    const custom = overrides(u);
    if (custom) return custom;
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (u.includes("/api/geo")) return ok({ country: "MX", bettingAllowed: true, reason: "" });
    if (u.includes("/api/market/")) return ok({ market: marketA });
    if (u.includes("/api/quotes")) return ok({ quotes: {} });
    if (u.includes("clob.polymarket.com")) return ok({ price: "0.09" });
    return ok({ markets: [marketA], nextCursor: null, stale: false });
  });
}

describe("the market list (UX-5)", () => {
  it("offers a retry and says it also retries by itself", async () => {
    stubWidget((u) =>
      u.includes("/api/markets")
        ? { ok: false, status: 503, json: async () => ({ error: "Market data is temporarily unavailable." }) }
        : null,
    );
    render(<Widget />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(alert).toHaveTextContent(/retries on its own/i);
  });
});

describe("exclusions that are constitutional, not oversights", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
  });

  it("blocks a stake above the practice balance before any confirmation exists", async () => {
    // The over-balance placement cannot fail, because it cannot be reviewed:
    // canReview gates on withinBalance. Asserted so a future change that relaxes
    // the gate has to face this test.
    stubWidget();
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "5000" } });

    expect(screen.getByRole("button", { name: /review bet/i })).toBeDisabled();
    expect(screen.queryByRole("dialog", { name: /confirm your bet/i })).toBeNull();
  });

  it("offers NO retry when a placement rejects — recovery is the confirmation itself (Art. II)", async () => {
    // Today Widget.handlePlace swallows every error, so onPlace never rejects.
    // Phase 6 supplies one that can. When it does, the confirmation must stay
    // open — a retry control beside an error message would be a placement path
    // that shows no market, outcome, amount, price or payout.
    const onPlace = vi.fn().mockRejectedValue(new Error("order rejected"));
    const { BetPanel } = await import("@/components/BetPanel");

    render(
      <BetPanel
        market={marketA}
        mode="demo"
        onPlace={onPlace}
        balanceUsd={1000}
        initialOutcome={marketA.outcomes[0]}
      />,
    );
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    const dialog = await screen.findByRole("dialog", { name: /confirm your bet/i });
    await waitFor(() => fireEvent.click(within(dialog).getByRole("button", { name: /place bet/i })));

    await waitFor(() => expect(onPlace).toHaveBeenCalledTimes(1));

    // The confirmation is still there, with its five fields, and nothing new
    // offers to re-send.
    expect(screen.getByRole("dialog", { name: /confirm your bet/i })).toBeInTheDocument();
    expect(screen.getByTestId("confirm-payout")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again|retry/i })).toBeNull();
  });

  it("offers NO retry over a fail-closed geo decision (Art. V)", async () => {
    // Failing closed is a compliance outcome, not a transient error. A retry
    // button would invite re-rolling it until it opens.
    stubWidget((u) => (u.includes("/api/geo") ? Promise.reject(new Error("offline")) : null));
    render(<Widget />);

    const notice = await screen.findByText(/could not determine your region/i);
    expect(within(notice.parentElement!).queryByRole("button", { name: /try again|retry/i })).toBeNull();
  });
});

describe("surfaces that fail silently (audit round 2)", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
  });

  it("says so when the selected market's price has stopped updating", async () => {
    // Widget keeps the last good price through an outage and says nothing. That
    // frozen number is what the confirmation renders as Article II's price, so
    // silence here is the most consequential silence in the app.
    stubWidget((u) =>
      u.includes("/api/market/")
        ? { ok: false, status: 503, json: async () => ({ error: "down" }) }
        : null,
    );
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);

    expect(await screen.findByTestId("market-stale")).toHaveTextContent(/could not be refreshed/i);
  });

  it("clears that notice once the price refreshes again", async () => {
    // It retries on its own every 30 seconds, which is what the notice says.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let fail = true;
    stubWidget((u) =>
      u.includes("/api/market/") && fail
        ? { ok: false, status: 503, json: async () => ({ error: "down" }) }
        : null,
    );
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    await screen.findByTestId("market-stale");

    fail = false;
    await vi.advanceTimersByTimeAsync(31_000);

    await waitFor(() => expect(screen.queryByTestId("market-stale")).toBeNull());
    vi.useRealTimers();
  });
});
