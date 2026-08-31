/**
 * AR-1 context rules (feature 003 T11).
 *
 * The hazard these prevent: advice about one market on screen while another
 * market's bet entry is armed. Nothing is technically wrong on either surface;
 * reading them together is what misleads.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const [a, b] = fixture.markets.map(normalizeMarket);

const rec = (m: typeof a) => ({
  recommendation: {
    resolvesOn: `Resolves on the published result for ${m.question}.`,
    priceImplies: "The price shows how the outcomes are trading against each other.",
    caseFor: "It requires the stated terms to be met before the deadline.",
    caseAgainst: "It fails if those terms are not met, or the event is abandoned.",
    favouredTokenId: m.outcomes[0].tokenId,
    arguedAtPrice: m.outcomes[0].price,
  },
});

let recommendFor = a;
let recommendDelayMs = 0;

beforeEach(() => {
  recommendFor = a;
  recommendDelayMs = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/recommend")) {
        if (recommendDelayMs) await new Promise((r) => setTimeout(r, recommendDelayMs));
        return { ok: true, status: 200, json: async () => rec(recommendFor) };
      }
      if (u.includes("/api/assist")) {
        return {
          ok: true, status: 200,
          json: async () => ({
            suggestions: [{ market: b, outcome: b.outcomes[0], reasoning: "About the other market." }],
          }),
        };
      }
      if (u.includes("/api/market/")) return { ok: true, status: 200, json: async () => ({ market: a }) };
      if (u.includes("/api/geo")) return { ok: true, status: 200, json: async () => ({ country: "BR", bettingAllowed: true }) };
      if (u.includes("/api/markets")) return { ok: true, status: 200, json: async () => ({ markets: [a, b], nextCursor: null, stale: false }) };
      return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function select(market: typeof a) {
  const heading = await screen.findByRole("heading", { name: new RegExp(market.question.slice(0, 18), "i") });
  fireEvent.click(heading.closest('[role="button"]')!);
}

async function askForRecommendation() {
  fireEvent.click(await screen.findByRole("button", { name: /what would you favou?r|recommend/i }));
  await waitFor(() => expect(screen.getByTestId("recommendation")).toBeInTheDocument());
}

describe("a recommendation belongs to its market", () => {
  it("clears when a different market is selected", async () => {
    render(<Widget />);
    await select(a);
    await askForRecommendation();

    await select(b);
    expect(screen.queryByTestId("recommendation")).not.toBeInTheDocument();
  });

  it("clears when the selection is cleared", async () => {
    render(<Widget />);
    await select(a);
    await askForRecommendation();

    fireEvent.click(await screen.findByRole("button", { name: /^clear$/i }));
    expect(screen.queryByTestId("recommendation")).not.toBeInTheDocument();
  });

  it("a response in flight when the selection changes never renders", async () => {
    render(<Widget />);
    await select(a);
    recommendDelayMs = 200;
    fireEvent.click(await screen.findByRole("button", { name: /what would you favou?r|recommend/i }));

    await select(b); // switch while the request is still open
    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });
    expect(screen.queryByTestId("recommendation")).not.toBeInTheDocument();
  });
});

describe("what survives a selection change and what does not", () => {
  it("keeps the assistant's typed prompt", async () => {
    render(<Widget />);
    const box = await screen.findByLabelText(/what are you interested in/i);
    fireEvent.change(box, { target: { value: "tennis" } });
    await select(a);
    expect((screen.getByLabelText(/what are you interested in/i) as HTMLTextAreaElement).value).toBe("tennis");
  });

  it("does NOT keep a bet amount typed against another market", async () => {
    render(<Widget />);
    await select(a);
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "200" } });
    await select(b);
    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe("");
  });

  it("clears discovery suggestions naming other markets", async () => {
    render(<Widget />);
    fireEvent.change(await screen.findByLabelText(/what are you interested in/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await waitFor(() => expect(screen.getByTestId("suggestion-0")).toBeInTheDocument());

    await select(a);
    expect(screen.queryByTestId("suggestion-0")).not.toBeInTheDocument();
  });
});

describe("a mode change clears what was chosen for the other mode", () => {
  it("clears the chosen outcome and the typed amount", async () => {
    render(<Widget />);
    await select(a);
    // Scoped: the market row is also a button carrying the same text.
    const group = within(await screen.findByRole("group", { name: /choose an outcome/i }));
    fireEvent.click(group.getByRole("button", { name: new RegExp(`${a.outcomes[0].label}.*9%`, "i") }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "150" } });

    fireEvent.click(screen.getByRole("button", { name: /real money/i }));

    // Real money is unavailable in this build, so 005 / DR-1 renders no entry at
    // all — a stake chosen against a practice balance cannot carry into real
    // money because there is nowhere for it to carry TO. Stronger than the empty
    // form this used to assert.
    expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull();
    expect(screen.queryByLabelText(/amount/i)).toBeNull();

    // And coming back to demo, the draft is genuinely gone rather than restored.
    fireEvent.click(screen.getByRole("button", { name: /^demo$/i }));

    const outcomes = within(await screen.findByRole("group", { name: /choose an outcome/i }));
    expect(
      outcomes.getByRole("button", { name: new RegExp(`${a.outcomes[0].label}.*9%`, "i") }),
    ).toHaveAttribute("aria-pressed", "false");
    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe("");
  });
});
