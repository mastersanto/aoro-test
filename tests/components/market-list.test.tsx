/**
 * Component tests for the market list (US-1).
 *
 * These close a real coverage gap: the list holds a debounced query, a
 * stale-response race guard, a stale-data flag and error mapping — state
 * transitions and error mapping, which constitution Article VII binds — yet no
 * dedicated test covered them. They also pin the row's CONTENT contract, so a
 * future restyle cannot quietly drop a field.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketList } from "@/components/MarketList";
import { MarketCard } from "@/components/MarketCard";
import { normalizeMarket, type Market } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const markets = fixture.markets.map(normalizeMarket);
const [first, second] = markets;

type Body = { markets?: unknown; nextCursor?: string | null; stale?: boolean; error?: string };

function mockApi(impl: (url: string) => { ok?: boolean; status?: number; body: Body }) {
  const spy = vi.fn(async (url: string) => {
    const { ok = true, status = 200, body } = impl(String(url));
    return { ok, status, json: async () => body };
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

const okPage = { markets, nextCursor: null, stale: false };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("MarketCard — content contract", () => {
  it("shows every field a market row must carry", () => {
    render(<MarketCard market={first} />);
    expect(screen.getByRole("heading", { name: first.question })).toBeInTheDocument();
    for (const o of first.outcomes) {
      expect(screen.getByText(o.label)).toBeInTheDocument();
    }
    // Both volumes: 24h drives the ordering, total shows overall activity.
    expect(screen.getByText(/24h/)).toBeInTheDocument();
    expect(screen.getByText(/total/)).toBeInTheDocument();
    expect(screen.getByText(/^Ends /)).toBeInTheDocument();
  });

  it("renders prices as whole percents", () => {
    render(<MarketCard market={first} />);
    // fixture: 0.09 / 0.91
    expect(screen.getByText("9%")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
  });

  it("is only interactive when it can be selected", () => {
    const { rerender } = render(<MarketCard market={first} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    const onSelect = vi.fn<(m: Market) => void>();
    rerender(<MarketCard market={first} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith(first);
  });

  it("is reachable by keyboard when selectable", () => {
    const onSelect = vi.fn<(m: Market) => void>();
    render(<MarketCard market={first} onSelect={onSelect} />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(card, { key: "Enter" });
    fireEvent.keyDown(card, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it("marks the selected card for assistive tech, not by styling alone", () => {
    render(<MarketCard market={first} selected onSelect={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("MarketList — loading and results", () => {
  it("shows a loading state before the first response, then the markets", async () => {
    mockApi(() => ({ body: okPage }));
    render(<MarketList />);
    expect(screen.getByText(/loading markets/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: first.question })).toBeInTheDocument();
    expect(screen.queryByText(/loading markets/i)).not.toBeInTheDocument();
  });

  it("says so plainly when nothing matches", async () => {
    mockApi(() => ({ body: { markets: [], nextCursor: null } }));
    render(<MarketList />);
    expect(await screen.findByText(/no open markets match/i)).toBeInTheDocument();
  });
});

describe("MarketList — search and filtering", () => {
  it("debounces typing into a single request", async () => {
    const spy = mockApi(() => ({ body: okPage }));
    render(<MarketList />);
    await screen.findByRole("heading", { name: first.question });
    spy.mockClear();

    const box = screen.getByLabelText(/search markets/i);
    fireEvent.change(box, { target: { value: "b" } });
    fireEvent.change(box, { target: { value: "bi" } });
    fireEvent.change(box, { target: { value: "bitcoin" } });
    expect(spy).not.toHaveBeenCalled(); // nothing fires mid-typing

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const queried = spy.mock.calls.map((c) => new URL(String(c[0]), "http://x").searchParams.get("q"));
    expect(queried).toContain("bitcoin");
    expect(queried).not.toContain("b");
    expect(queried).not.toContain("bi");
  });

  it("sends a chosen category as a tag filter, and clears it when deselected", async () => {
    const spy = mockApi(() => ({ body: okPage }));
    render(<MarketList />);
    await screen.findByRole("heading", { name: first.question });

    const chips = within(screen.getByRole("group", { name: /filter by category/i }));
    const politics = chips.getByRole("button", { name: "Politics" });

    fireEvent.click(politics);
    await waitFor(() =>
      expect(
        spy.mock.calls.some((c) => new URL(String(c[0]), "http://x").searchParams.get("tag")),
      ).toBe(true),
    );
    expect(politics).toHaveAttribute("aria-pressed", "true");

    spy.mockClear();
    fireEvent.click(politics); // toggling the same chip clears the filter
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(
      spy.mock.calls.every((c) => !new URL(String(c[0]), "http://x").searchParams.get("tag")),
    ).toBe(true);
  });
});

describe("MarketList — degradation", () => {
  it("warns when the server served cached prices", async () => {
    mockApi(() => ({ body: { ...okPage, stale: true } }));
    render(<MarketList />);
    expect(await screen.findByRole("status")).toHaveTextContent(/recently cached prices/i);
  });

  it("surfaces a server error message without exposing internals", async () => {
    mockApi(() => ({
      ok: false,
      status: 503,
      body: { error: "Market data is temporarily unavailable. Please try again shortly." },
    }));
    render(<MarketList />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/temporarily unavailable/i);
    expect(alert.textContent).not.toMatch(/gamma|polymarket\.com|keyset/i);
  });

  it("reports a plain message when the request itself fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    render(<MarketList />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not reach the server/i);
    expect(alert.textContent).not.toMatch(/network down/i);
  });
});

describe("MarketList — stale-response race", () => {
  it("a slow earlier response cannot overwrite a newer one", async () => {
    // Two in-flight requests resolve out of order: the search fires second but
    // answers first, then the initial load answers late with the full list.
    let releaseSlow: (v: unknown) => void = () => {};
    const slow = new Promise((r) => {
      releaseSlow = r;
    });

    const spy = vi.fn(async (url: string) => {
      if (String(url).includes("q=bitcoin")) {
        return { ok: true, status: 200, json: async () => ({ markets: [second], nextCursor: null }) };
      }
      await slow; // the initial, unfiltered load lags behind
      return { ok: true, status: 200, json: async () => ({ markets, nextCursor: null }) };
    });
    vi.stubGlobal("fetch", spy);

    render(<MarketList />);
    fireEvent.change(screen.getByLabelText(/search markets/i), { target: { value: "bitcoin" } });

    // The newer (search) result lands first.
    expect(await screen.findByRole("heading", { name: second.question })).toBeInTheDocument();

    // Now the stale initial load finally answers — it must be discarded.
    releaseSlow(null);
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.getByRole("heading", { name: second.question })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: first.question })).not.toBeInTheDocument();
  });
});

describe("MarketList — selection", () => {
  it("passes the chosen market up and marks it selected", async () => {
    mockApi(() => ({ body: okPage }));
    const onSelect = vi.fn<(m: Market) => void>();
    const { rerender } = render(<MarketList onSelect={onSelect} />);

    const heading = await screen.findByRole("heading", { name: second.question });
    fireEvent.click(heading.closest('[role="button"]')!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: second.id }));

    rerender(<MarketList onSelect={onSelect} selectedId={second.id} />);
    const chosen = (await screen.findByRole("heading", { name: second.question })).closest(
      '[role="button"]',
    );
    expect(chosen).toHaveAttribute("aria-pressed", "true");
  });
});
