import type { Market } from "@/lib/polymarket/gamma";
import { formatEndDate, formatPercent, formatUsd } from "@/lib/format";
import { OutcomeBar } from "@/components/OutcomeBar";

/**
 * The one statement of what you are betting on (005 / DR-3).
 *
 * Before this, the question was rendered inside the bet panel AND inside the
 * recommendation panel — twice, in a 320px column, with no single anchor saying
 * what the rail was about. It is stated here and nowhere else in the rail.
 */
export function SelectedMarketCard({
  market,
  onClear,
}: {
  market: Market | null;
  onClear: () => void;
}) {
  if (!market) {
    return (
      // Desktop only. On a phone the rail stacks ABOVE the list, so a card that
      // exists only to say "you have not picked anything" pushes the first market
      // row off the fold — the list is the page until something is chosen. Beside
      // the list on a wide screen it costs nothing and explains the empty column.
      <section
        aria-label="Selected market"
        className="hidden rounded-panel border border-dashed border-line-strong p-4 text-sm text-dim lg:block"
      >
        No market chosen yet — pick one from the list to bet on it.
      </section>
    );
  }

  return (
    <section
      aria-label="Selected market"
      // Present only when a market IS selected. The empty state above carries the
      // same accessible name — correct, since both are the selected-market
      // region — which makes "wait until something is selected" inexpressible by
      // label alone. Tests wait on this instead.
      data-testid="selected-market"
      // Sticky within the rail: it is the single statement of the market
      // (DR-3), so everything below it — the bet, the advisor — must be readable
      // WITH it in view. Dropping the advisor's own "About:" line only works if
      // this stays put (005; the appearance gate caught the co-visibility loss).
      className="sticky top-0 z-10 rounded-panel border border-up/35 bg-panel p-4 shadow-[inset_3px_0_0_0_var(--color-up)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.14em] text-dim">
          You&rsquo;re betting on
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="min-h-11 shrink-0 rounded-control px-2 text-xs text-muted hover:bg-white/5"
        >
          Clear
        </button>
      </div>

      <p className="mt-1 text-sm font-medium leading-snug text-ink [overflow-wrap:anywhere]">
        {market.question}
      </p>

      <div className="mt-3">
        <OutcomeBar outcomes={market.outcomes} />
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {market.outcomes.slice(0, 4).map((o, i) => (
          <li key={o.tokenId} className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <span className="truncate text-muted">{o.label}</span>
            <span className={`shrink-0 font-figure tabular-nums ${i === 0 ? "text-up" : "text-down"}`}>
              {formatPercent(o.price)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 flex flex-wrap justify-between gap-x-3 font-figure text-xs tabular-nums text-dim">
        <span>{formatUsd(market.volume)} total</span>
        <span>Resolves {formatEndDate(market.endDate)}</span>
      </p>
    </section>
  );
}
