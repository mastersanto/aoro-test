import type { Market } from "@/lib/polymarket/gamma";
import { formatEndDate, formatPercent, formatUsd } from "@/lib/format";
import { OutcomeBar } from "@/components/OutcomeBar";

/**
 * A market as a dense row (VR-1). The heading and the button role are the
 * contract tests/visual/market-list.spec.ts and the jsdom suite select by —
 * both are preserved deliberately through the restructure.
 */
export function MarketCard({
  market,
  selected = false,
  onSelect,
}: {
  market: Market;
  selected?: boolean;
  onSelect?: (market: Market) => void;
}) {
  const interactive = Boolean(onSelect);
  return (
    <article
      onClick={onSelect ? () => onSelect(market) : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(market);
              }
            }
          : undefined
      }
      aria-pressed={interactive ? selected : undefined}
      className={`grid grid-cols-1 gap-3 border-b border-line px-4 py-3.5 transition sm:grid-cols-[minmax(0,1fr)_13rem_5.5rem_6rem] sm:items-center ${
        interactive ? "cursor-pointer hover:bg-white/[0.03]" : ""
      } ${selected ? "bg-up/[0.07] shadow-[inset_2px_0_0_0_var(--color-up)]" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-medium leading-snug text-ink">{market.question}</h3>
        <OutcomeBar outcomes={market.outcomes} />
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {market.outcomes.slice(0, 4).map((outcome, i) => (
          <li key={outcome.tokenId} className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <span className="truncate text-muted">{outcome.label}</span>
            <span
              className={`shrink-0 font-figure tabular-nums ${i === 0 ? "text-up" : "text-down"}`}
            >
              {formatPercent(outcome.price)}
            </span>
          </li>
        ))}
      </ul>

      <span className="font-figure text-xs tabular-nums text-dim sm:text-right">
        {formatUsd(market.volume24hr)} 24h
      </span>
      <span className="flex flex-wrap gap-x-2 font-figure text-xs tabular-nums text-dim sm:flex-col sm:items-end sm:gap-0">
        {/* Kept as separate elements so the row's existing queryable contract
            (a "total" figure and an "Ends <date>" label) survives the restructure. */}
        <span>{formatUsd(market.volume)} total</span>
        <span>Ends {formatEndDate(market.endDate)}</span>
      </span>
    </article>
  );
}
