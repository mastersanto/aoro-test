/**
 * Article II: an AI suggestion may only pre-fill the bet form.
 * Article V: the "not financial advice" disclaimer renders with suggestions.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistPanel } from "@/components/AssistPanel";
import type { GroundedSuggestion } from "@/lib/ai/grounding";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const suggestion = {
  market,
  outcome: market.outcomes[0],
  reasoning: "The book prices this at 9%, which reflects the seeding.",
};

type UseFn = (s: GroundedSuggestion) => void;
let onUse: ReturnType<typeof vi.fn<UseFn>>;

function mockAssist(body: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", spy);
  return spy;
}

beforeEach(() => {
  onUse = vi.fn<UseFn>();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function ask(prompt = "tennis") {
  render(<AssistPanel onUseSuggestion={onUse} />);
  fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
    target: { value: prompt },
  });
  fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
  await waitFor(() => expect(screen.getByTestId("suggestion-0")).toBeInTheDocument());
}

describe("AI assist panel", () => {
  it("shows the not-financial-advice disclaimer whenever suggestions render (Art. V)", async () => {
    mockAssist({ suggestions: [suggestion] });
    await ask();
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });

  it("shows each suggestion's reasoning and the live price of the outcome", async () => {
    mockAssist({ suggestions: [suggestion] });
    await ask();
    expect(screen.getByText(/reflects the seeding/i)).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-0")).toHaveTextContent("9%");
  });

  it("only pre-fills the bet form when a suggestion is used (Art. II)", async () => {
    mockAssist({ suggestions: [suggestion] });
    await ask();
    fireEvent.click(screen.getByRole("button", { name: /use this/i }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: expect.objectContaining({ tokenId: market.outcomes[0].tokenId }) }),
    );
  });

  it("BYPASS CHECK: no control in the panel opens a confirmation or places a bet", async () => {
    mockAssist({ suggestions: [suggestion] });
    await ask();
    for (const el of screen.getAllByRole("button")) fireEvent.click(el);
    // The panel has no placement capability at all — nothing here may be a dialog.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /place bet/i })).not.toBeInTheDocument();
  });

  it("sends the user's prompt to the assist route", async () => {
    const spy = mockAssist({ suggestions: [suggestion] });
    await ask("fed rates");
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toContain("/api/assist");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).prompt).toBe("fed rates");
  });

  it("reports plainly when the model finds nothing, without a disclaimer for absent advice", async () => {
    mockAssist({ suggestions: [] });
    render(<AssistPanel onUseSuggestion={onUse} />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await waitFor(() => expect(screen.getByText(/no open markets matched/i)).toBeInTheDocument());
    expect(onUse).not.toHaveBeenCalled();
  });

  it("surfaces a server error without exposing internals", async () => {
    mockAssist({ error: "AI assistance is briefly unavailable. Please try again." }, false, 503);
    render(<AssistPanel onUseSuggestion={onUse} />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/briefly unavailable/i));
  });

  it("will not ask with an empty prompt", async () => {
    const spy = mockAssist({ suggestions: [] });
    render(<AssistPanel onUseSuggestion={onUse} />);
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    expect(spy).not.toHaveBeenCalled();
  });
});
