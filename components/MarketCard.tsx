import type { Market } from "@/lib/polymarket/gamma";
import { formatEndDate, formatPercent, formatUsd } from "@/lib/format";

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
      className={`rounded-lg border bg-white p-4 shadow-sm transition dark:bg-neutral-900 ${
        interactive ? "cursor-pointer hover:shadow-md" : ""
      } ${
        selected
          ? "border-neutral-900 ring-1 ring-neutral-900 dark:border-white dark:ring-white"
          : "border-black/10 dark:border-white/15"
      }`}
    >
      <h3 className="mb-3 text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-100">
        {market.question}
      </h3>

      <ul className="mb-3 space-y-1.5">
        {market.outcomes.slice(0, 4).map((outcome) => (
          <li key={outcome.tokenId} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-neutral-600 dark:text-neutral-300">{outcome.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatPercent(outcome.price)}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        <span>{formatUsd(market.volume24hr)} 24h</span>
        <span aria-hidden>·</span>
        <span>{formatUsd(market.volume)} total</span>
        <span aria-hidden>·</span>
        <span>Ends {formatEndDate(market.endDate)}</span>
      </div>
    </article>
  );
}
