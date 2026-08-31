/**
 * Pagination and sorting in the market list (004 / UX-1, UX-2).
 *
 * The list previously showed 24 markets and stopped: /api/markets returned a
 * nextCursor the client discarded. These pin the state machine that fixes it —
 * accumulation, de-duplication, the in-flight guard, and above all that a
 * cursor is never reused across a changed query.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarketList } from "@/components/MarketList";
import { normalizeMarket, type Market } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const base = fixture.markets.map(normalizeMarket);

function page(ids: string[], nextCursor: string | null): { markets: Market[]; nextCursor: string | null } {
  return {
    markets: ids.map((id, i) => ({ ...base[i % base.length], id, question: `Market ${id}?` })),
    nextCursor,
  };
}

type Handler = (url: URL) => { ok?: boolean; status?: number; body: unknown };

function mockApi(handler: Handler) {
  const spy = vi.fn(async (raw: string) => {
    const url = new URL(String(raw), "http://localhost");
    const { ok = true, status = 200, body } = handler(url);
    return { ok, status, json: async () => body };
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

/** URLs the list actually requested, in order. */
function requested(spy: ReturnType<typeof mockApi>): URL[] {
  return spy.mock.calls.map((c) => new URL(String(c[0]), "http://localhost"));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const loadMore = () => screen.getByRole("button", { name: /load more/i });

describe("Load more (UX-1)", () => {
  it("appends the next page without dropping what is on screen", async () => {
    mockApi((url) =>
      url.searchParams.get("cursor") === "C1"
        ? { body: page(["c", "d"], null) }
        : { body: page(["a", "b"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());

    fireEvent.click(loadMore());

    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());
    // The first page must still be there — this is the whole point.
    expect(screen.getByText("Market a?")).toBeInTheDocument();
    expect(screen.getByText("Market b?")).toBeInTheDocument();
    expect(screen.getByText("Market d?")).toBeInTheDocument();
  });

  it("sends the cursor the previous page returned", async () => {
    const spy = mockApi((url) =>
      url.searchParams.get("cursor") === "C1"
        ? { body: page(["c"], null) }
        : { body: page(["a"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    fireEvent.click(loadMore());

    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());
    expect(requested(spy).some((u) => u.searchParams.get("cursor") === "C1")).toBe(true);
  });

  it("is absent when there is no next page", async () => {
    mockApi(() => ({ body: page(["a", "b"], null) }));

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("loads more search results too — search paginates by page number", async () => {
    // /public-search carries pagination.hasMore and accepts page=N; the route
    // hands the client the same opaque nextCursor either way (004 / UX-1).
    mockApi((url) => {
      if (!url.searchParams.get("q")) return { body: page(["a"], "C1") };
      return url.searchParams.get("cursor") === "2"
        ? { body: { markets: page(["s2"], null).markets, nextCursor: null } }
        : { body: { markets: page(["s1"], null).markets, nextCursor: "2" } };
    });

    render(<MarketList />);
    fireEvent.change(screen.getByLabelText(/search markets/i), { target: { value: "fed" } });
    await waitFor(() => expect(screen.getByText("Market s1?")).toBeInTheDocument());

    fireEvent.click(loadMore());

    await waitFor(() => expect(screen.getByText("Market s2?")).toBeInTheDocument());
    expect(screen.getByText("Market s1?")).toBeInTheDocument();
  });

  it("is absent while searching when the exchange reports no more results", async () => {
    mockApi((url) =>
      url.searchParams.get("q")
        ? { body: { markets: page(["s1"], null).markets, nextCursor: null } }
        : { body: page(["a"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeNull();

    fireEvent.change(screen.getByLabelText(/search markets/i), { target: { value: "fed" } });
    await waitFor(() => expect(screen.getByText("Market s1?")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /load more/i })).toBeNull();
  });

  it("does not double-load when pressed twice in flight", async () => {
    let release!: () => void;
    const spy = vi.fn(async (raw: string) => {
      const url = new URL(String(raw), "http://localhost");
      if (url.searchParams.get("cursor") === "C1") {
        await new Promise<void>((r) => {
          release = r;
        });
        return { ok: true, status: 200, json: async () => page(["c"], null) };
      }
      return { ok: true, status: 200, json: async () => page(["a"], "C1") };
    });
    vi.stubGlobal("fetch", spy);

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());

    // Hold the element: pressing it relabels it to "Loading…", so re-querying
    // by name would find nothing and prove nothing.
    const button = loadMore();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    const withCursor = () =>
      spy.mock.calls.filter((c) => String(c[0]).includes("cursor=C1")).length;
    expect(withCursor()).toBe(1);
    // and it says it is working, so the reader is not left pressing a dead control.
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/loading/i);

    release();
    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());
    expect(withCursor()).toBe(1);
  });

  it("keeps the loaded rows and explains when loading more fails", async () => {
    mockApi((url) =>
      url.searchParams.get("cursor") === "C1"
        ? { ok: false, status: 503, body: { error: "Market data is temporarily unavailable." } }
        : { body: page(["a", "b"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    fireEvent.click(loadMore());

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    // A failed "load more" must not blank the page the reader already has.
    expect(screen.getByText("Market a?")).toBeInTheDocument();
    expect(screen.getByText("Market b?")).toBeInTheDocument();
  });

  it("does not re-render a market that arrives on two pages", async () => {
    mockApi((url) =>
      url.searchParams.get("cursor") === "C1"
        ? { body: page(["b", "c"], null) }
        : { body: page(["a", "b"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    fireEvent.click(loadMore());

    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());
    expect(screen.getAllByText("Market b?")).toHaveLength(1);
  });
});

describe("a changed query never reuses a cursor (UX-1)", () => {
  it("starts a fresh page when the search changes", async () => {
    const spy = mockApi((url) =>
      url.searchParams.get("q")
        ? { body: { markets: page(["s1"], null).markets, nextCursor: null } }
        : url.searchParams.get("cursor") === "C1"
          ? { body: page(["c"], "C2") }
          : { body: page(["a"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    fireEvent.click(loadMore());
    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());

    spy.mockClear();
    fireEvent.change(screen.getByLabelText(/search markets/i), { target: { value: "fed" } });
    await waitFor(() => expect(screen.getByText("Market s1?")).toBeInTheDocument());

    // A cursor from the previous query addresses a different result set: sending
    // it returns a plausible-looking page of the wrong thing.
    expect(requested(spy).every((u) => u.searchParams.get("cursor") === null)).toBe(true);
    // and the old rows are gone, not appended to.
    expect(screen.queryByText("Market a?")).toBeNull();
    expect(screen.queryByText("Market c?")).toBeNull();
  });

  it("starts a fresh page when the category changes", async () => {
    const spy = mockApi((url) =>
      url.searchParams.get("tag")
        ? { body: page(["t1"], null) }
        : url.searchParams.get("cursor") === "C1"
          ? { body: page(["c"], "C2") }
          : { body: page(["a"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    fireEvent.click(loadMore());
    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());

    spy.mockClear();
    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(requested(spy).every((u) => u.searchParams.get("cursor") === null)).toBe(true);
  });

  it("starts a fresh page when the sort changes", async () => {
    const spy = mockApi((url) =>
      url.searchParams.get("sort") === "ending-soon"
        ? { body: page(["e1"], null) }
        : url.searchParams.get("cursor") === "C1"
          ? { body: page(["c"], "C2") }
          : { body: page(["a"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    fireEvent.click(loadMore());
    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());

    spy.mockClear();
    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value: "ending-soon" } });
    await waitFor(() => expect(screen.getByText("Market e1?")).toBeInTheDocument());

    expect(requested(spy).every((u) => u.searchParams.get("cursor") === null)).toBe(true);
    expect(screen.queryByText("Market c?")).toBeNull();
  });
});

describe("the periodic refresh does not truncate loaded pages (UX-1)", () => {
  it("keeps page two when the 30-second refresh of page one lands", async () => {
    // The refresh only ever fetches page 1. Replacing the list with it would
    // silently undo "Load more" every 30 seconds.
    mockApi((url) =>
      url.searchParams.get("cursor") === "C1"
        ? { body: page(["c", "d"], null) }
        : { body: page(["a", "b"], "C1") },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());
    fireEvent.click(loadMore());
    await waitFor(() => expect(screen.getByText("Market c?")).toBeInTheDocument());

    await vi.advanceTimersByTimeAsync(31_000);

    expect(screen.getByText("Market c?")).toBeInTheDocument();
    expect(screen.getByText("Market d?")).toBeInTheDocument();
  });
});

describe("sort control (UX-2)", () => {
  it("offers the orders and sends the chosen one to the server", async () => {
    const spy = mockApi(() => ({ body: page(["a"], null) }));

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value: "ending-soon" } });

    // Server-side: sorting the page already loaded would sort a subset and look
    // right (UX-2).
    await waitFor(() =>
      expect(requested(spy).some((u) => u.searchParams.get("sort") === "ending-soon")).toBe(true),
    );
  });

  it("shows which ordering is active without opening a menu", async () => {
    mockApi(() => ({ body: page(["a"], null) }));
    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());

    const select = screen.getByLabelText(/sort/i) as HTMLSelectElement;
    expect(select.value).toBe("hot");
    fireEvent.change(select, { target: { value: "volume" } });
    expect(select.value).toBe("volume");
  });

  it("keeps the category filter when the ordering changes", async () => {
    const spy = mockApi(() => ({ body: page(["a"], null) }));

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { pressed: false })[0]);
    await waitFor(() => expect(requested(spy).some((u) => u.searchParams.get("tag"))).toBe(true));

    spy.mockClear();
    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value: "volume" } });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const last = requested(spy).at(-1)!;
    expect(last.searchParams.get("tag")).not.toBeNull();
    expect(last.searchParams.get("sort")).toBe("volume");
  });

  it("is unavailable while searching, and says why", async () => {
    mockApi((url) =>
      url.searchParams.get("q")
        ? { body: { markets: page(["s1"], null).markets, nextCursor: null } }
        : { body: page(["a"], null) },
    );

    render(<MarketList />);
    await waitFor(() => expect(screen.getByText("Market a?")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/search markets/i), { target: { value: "fed" } });
    await waitFor(() => expect(screen.getByText("Market s1?")).toBeInTheDocument());

    // Sorting the <=20 rows a search returned would sort a truncated subset and
    // look correct — the failure UX-2 exists to prevent.
    expect((screen.getByLabelText(/sort/i) as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getByText(/best matches/i)).toBeInTheDocument();
  });
});
