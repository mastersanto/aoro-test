"use client";

import { useState } from "react";
import type { GroundedSuggestion } from "@/lib/ai/grounding";
import { formatPercent } from "@/lib/format";

export type AssistPanelProps = {
  /** Pre-fills the bet form. Article II: this must never place anything. */
  onUseSuggestion: (suggestion: GroundedSuggestion) => void;
};

export function AssistPanel({ onUseSuggestion }: AssistPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [suggestions, setSuggestions] = useState<GroundedSuggestion[] | null>(null);
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
      className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-neutral-900"
    >
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Not sure what to bet on?
      </h2>

      <label className="mt-2 flex flex-col gap-1 text-sm">
        <span className="text-neutral-600 dark:text-neutral-300">What are you interested in?</span>
        <textarea
          rows={2}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. something about the Fed meeting"
          className="rounded-md border border-black/15 px-3 py-2 outline-none focus:border-neutral-500 dark:border-white/20 dark:bg-neutral-900"
        />
      </label>

      <button
        type="button"
        onClick={ask}
        disabled={loading}
        className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {loading ? "Thinking…" : "Get suggestions"}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {suggestions !== null && suggestions.length === 0 && !error && (
        <p className="mt-3 text-xs text-neutral-500">
          No open markets matched that. Try describing it differently.
        </p>
      )}

      {suggestions !== null && suggestions.length > 0 && (
        <>
          {/* Article V: rendered with the suggestions themselves, not tucked in a footer. */}
          <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            AI assistance is not financial advice. Suggestions describe current market
            prices; they are not predictions, and you decide every bet.
          </p>

          <ul className="mt-3 space-y-3">
            {suggestions.map((s, i) => (
              <li
                key={`${s.market.id}-${s.outcome.tokenId}`}
                data-testid={`suggestion-${i}`}
                className="rounded-md border border-black/10 p-3 dark:border-white/15"
              >
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {s.market.question}
                </p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {s.outcome.label} · <span className="font-mono">{formatPercent(s.outcome.price)}</span>
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{s.reasoning}</p>
                <button
                  type="button"
                  onClick={() => onUseSuggestion(s)}
                  className="mt-2 rounded-md border border-black/15 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50 dark:border-white/20 dark:text-neutral-200 dark:hover:bg-neutral-800"
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
