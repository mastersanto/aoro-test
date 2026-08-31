"use client";

import { useState } from "react";
import type { GroundedSuggestion } from "@/lib/ai/grounding";
import { formatPercent } from "@/lib/format";

export type AssistPanelProps = {
  /** Pre-fills the bet form. Article II: this must never place anything. */
  onUseSuggestion: (suggestion: GroundedSuggestion) => void;
  /** Optional: when supplied, the parent owns the suggestions so selecting a
   *  market can clear advice about other markets while the typed prompt
   *  survives (003 / AR-1). Left out, the panel keeps them itself — which is
   *  why every existing test of this component still renders unchanged. */
  suggestions?: GroundedSuggestion[] | null;
  onSuggestions?: (s: GroundedSuggestion[] | null) => void;
};

export function AssistPanel({
  onUseSuggestion,
  suggestions: controlled,
  onSuggestions,
}: AssistPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [ownSuggestions, setOwnSuggestions] = useState<GroundedSuggestion[] | null>(null);

  const isControlled = onSuggestions !== undefined;
  const suggestions = isControlled ? (controlled ?? null) : ownSuggestions;
  const setSuggestions = (next: GroundedSuggestion[] | null) => {
    if (onSuggestions) onSuggestions(next);
    else setOwnSuggestions(next);
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "AI assistance is briefly unavailable.");
        setSuggestions(null);
      } else {
        setSuggestions(body.suggestions ?? []);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
      setSuggestions(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-label="AI assistance"
      className="rounded-panel border border-line bg-panel p-4"
    >
      <h2 className="text-sm font-semibold text-ink">
        Not sure what to bet on?
      </h2>

      <label className="mt-2 flex flex-col gap-1 text-sm">
        <span className="text-muted">What are you interested in?</span>
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. something about the Fed meeting"
          className="rounded-control border border-line-strong bg-ground px-3 py-2 text-sm text-ink outline-none focus:border-up"
        />
      </label>

      <button
        type="button"
        onClick={ask}
        disabled={loading}
        className="mt-2 min-h-11 rounded-control bg-up px-3 text-sm font-semibold text-on-up disabled:opacity-50"
      >
        {loading ? "Thinking…" : "Get suggestions"}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-control bg-down/10 px-3 py-2 text-xs text-down">
          {error}
        </p>
      )}

      {suggestions !== null && suggestions.length === 0 && !error && (
        <p className="mt-3 text-xs text-dim">
          No open markets matched that. Try describing it differently.
        </p>
      )}

      {suggestions !== null && suggestions.length > 0 && (
        <>
          {/* Article V: rendered with the suggestions themselves, not tucked in a footer. */}
          <p className="mt-3 rounded-control border border-line bg-white/5 px-3 py-2 text-xs text-muted">
            AI assistance is not financial advice. Suggestions describe current market
            prices; they are not predictions, and you decide every bet.
          </p>

          <ul className="mt-3 space-y-3">
            {suggestions.map((s, i) => (
              <li
                key={`${s.market.id}-${s.outcome.tokenId}`}
                data-testid={`suggestion-${i}`}
                className="rounded-control border border-line p-3"
              >
                <p className="text-sm font-medium leading-snug text-ink">
                  {s.market.question}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {s.outcome.label} · <span className="font-figure tabular-nums text-up">{formatPercent(s.outcome.price)}</span>
                </p>
                <p className="mt-1 text-xs leading-relaxed text-dim">{s.reasoning}</p>
                <button
                  type="button"
                  onClick={() => onUseSuggestion(s)}
                  className="mt-2 min-h-11 rounded-control border border-up/40 px-3 text-xs font-medium text-up hover:bg-up/10"
                >
                  Use this
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
