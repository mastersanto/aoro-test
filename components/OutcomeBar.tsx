import { barSegments } from "@/lib/outcome-bar";
import type { Outcome } from "@/lib/polymarket/gamma";

/**
 * Proportional split of a market's outcomes (VR-1) — readable without reading
 * the numbers. Geometry comes from lib/outcome-bar.ts, which is tested.
 */
export function OutcomeBar({ outcomes }: { outcomes: readonly Outcome[] }) {
  const segments = barSegments(outcomes);
  if (segments.length === 0) return null;

  return (
    <div
      data-testid="outcome-bar"
      aria-hidden
      className="flex h-[3px] overflow-hidden rounded-full bg-white/8"
    >
      {segments.map((s, i) => (
        <div
          key={s.tokenId}
          style={{ width: `${s.percent}%` }}
          className={i === 0 ? "bg-up" : i === 1 ? "bg-down" : "bg-muted"}
        />
      ))}
    </div>
  );
}
