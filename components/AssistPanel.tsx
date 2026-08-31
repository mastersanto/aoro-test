"use client";

import type { GroundedSuggestion } from "@/lib/ai/grounding";

export type AssistPanelProps = {
  /** Pre-fills the bet form. Article II: this must never place anything. */
  onUseSuggestion: (suggestion: GroundedSuggestion) => void;
};

// T17 RED: implemented in T18.
export function AssistPanel(_props: AssistPanelProps) {
  return <div />;
}
