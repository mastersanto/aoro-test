/**
 * Article II on the NEW AI→bet-form path (feature 003 T13).
 *
 * Feature 001 has this test for discovery (assist-integration.test.tsx). This
 * feature introduces a second such path, and shipping it without the equivalent
 * gate is how the guarantee quietly stops being one.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const favoured = market.outcomes[0];

const RECOMMENDATION = {
  resolvesOn: "Resolves on the published result for this fixture.",
  priceImplies: "The price shows how the outcomes are trading against each other.",
  caseFor: "It requires the match to complete with the named player recorded as winner.",
  caseAgainst: "It fails if the other player wins or the match is abandoned.",
  favouredTokenId: favoured.tokenId,
  arguedAtPrice: favoured.price,
};

let recommendBody: unknown = { recommendation: RECOMMENDATION };
let geo = { country: "BR", bettingAllowed: true };

beforeEach(() => {
  recommendBody = { recommendation: RECOMMENDATION };
  geo = { country: "BR", bettingAllowed: true };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/recommend")) return { ok: true, status: 200, json: async () => recommendBody };
      if (u.includes("/api/market/")) return { ok: true, status: 200, json: async () => ({ market }) };
      if (u.includes("/api/geo")) return { ok: true, status: 200, json: async () => geo };
      if (u.includes("/api/markets")) return { ok: true, status: 200, json: async () => ({ markets: [market], nextCursor: null, stale: false }) };
      return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function selectAndRecommend() {
  render(<Widget />);
  const heading = await screen.findByRole("heading", { name: /Tirante/i });
  fireEvent.click(heading.closest('[role="button"]')!);
  fireEvent.click(await screen.findByRole("button", { name: /what would you favou?r/i }));
  await waitFor(() => expect(screen.getByTestId("recommendation")).toBeInTheDocument());
}

describe("Article II — the recommendation never places a bet", () => {
  it("does not arm the bet form merely by appearing", async () => {
    await selectAndRecommend();
    const group = within(screen.getByRole("group", { name: /choose an outcome/i }));
    for (const b of group.getAllByRole("button")) {
      expect(b).toHaveAttribute("aria-pressed", "false");
    }
    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fills the outcome and NO amount when acted on", async () => {
    await selectAndRecommend();
    fireEvent.click(screen.getByRole("button", { name: /use this/i }));

    await waitFor(() => {
      const group = within(screen.getByRole("group", { name: /choose an outcome/i }));
      expect(
        group.getByRole("button", { name: new RegExp(`${favoured.label}.*9%`, "i") }),
      ).toHaveAttribute("aria-pressed", "true");
    });
    // The stake stays the user's own decision.
    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe("");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("BYPASS CHECK: no control in the recommendation places or confirms a bet", async () => {
    await selectAndRecommend();
    const panel = within(screen.getByLabelText(/outcome recommendation/i));
    for (const b of panel.getAllByRole("button")) fireEvent.click(b);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/DEMO bet placed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/DEMO · practice \$1000\.00/i)).toBeInTheDocument();
  });

  it("still routes through the one confirmation, which it does not replace", async () => {
    await selectAndRecommend();
    fireEvent.click(screen.getByRole("button", { name: /use this/i }));
    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByTestId("confirm-payout")).toHaveTextContent("$222.22");
  });

  it("keeps exactly one bet-entry surface and one confirmation", async () => {
    await selectAndRecommend();
    expect(screen.getAllByRole("group", { name: /choose an outcome/i })).toHaveLength(1);
    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
  });
});

describe("what the recommendation must say about itself", () => {
  it("states which market it concerns", async () => {
    // 005 / DR-3 states the market ONCE, in the rail's header card, which is
    // sticky directly above this panel. The requirement — a recommendation is
    // never read detached from its market — is unchanged; what carries it moved.
    // The appearance suite asserts the two are on screen together, which jsdom
    // cannot judge because it performs no layout.
    await selectAndRecommend();
    const rail = within(screen.getByTestId("rail"));

    const header = rail.getByLabelText(/selected market/i);
    expect(within(header).getByText(market.question)).toBeInTheDocument();

    // and the recommendation sits inside the same rail, below it.
    const rec = screen.getByTestId("recommendation");
    expect(screen.getByTestId("rail").contains(rec)).toBe(true);
    expect(
      header.compareDocumentPosition(rec) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("is attributed as an opinion about prices, not a prediction", async () => {
    await selectAndRecommend();
    // "not a prediction" appears in both the panel's subtitle and its
    // disclaimer, which is deliberate — scope rather than loosen.
    expect(screen.getAllByText(/not a prediction/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });

  it("is offered only when a market is selected", async () => {
    // 007 / OM-1 opens on a market, so the no-market state is reached by
    // clearing rather than by arriving. The requirement is unchanged: no market,
    // no recommendation.
    render(<Widget />);
    await screen.findByRole("heading", { name: /Tirante/i });
    expect(await screen.findByRole("button", { name: /what would you favou?r/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /what would you favou?r/i })).not.toBeInTheDocument(),
    );
  });

  it("remains available where real betting is disabled (AR-5)", async () => {
    geo = { country: "US", bettingAllowed: false } as typeof geo;
    await selectAndRecommend();
    expect(screen.getByTestId("recommendation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /use this/i })).toBeInTheDocument();
  });

  it("shows a withholding in the app's own words, with no argument", async () => {
    recommendBody = { withheld: true, reason: "The assistant has no view to offer on this market right now." };
    render(<Widget />);
    const heading = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(heading.closest('[role="button"]')!);
    fireEvent.click(await screen.findByRole("button", { name: /what would you favou?r/i }));

    await waitFor(() => expect(screen.getByText(/no view to offer/i)).toBeInTheDocument());
    expect(screen.queryByTestId("recommendation")).not.toBeInTheDocument();
  });
});
