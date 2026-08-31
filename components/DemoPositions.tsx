import type { Totals, ValuedPosition } from "@/lib/demo-valuation";
import { formatPercent, formatUsdPrecise } from "@/lib/format";

/** Signed, so a gain reads as a gain rather than as a number that got bigger. */
function signedUsd(n: number): string {
  return `${n >= 0 ? "+" : "-"}${formatUsdPrecise(Math.abs(n))}`;
}

function tone(n: number): string {
  return n > 0 ? "text-up" : n < 0 ? "text-down" : "text-muted";
}

/**
 * What each position is worth now (004 / UX-4).
 *
 * A status that carries no value renders as words, never as $0.00: "unresolved"
 * and "not valued" are things we do not know, and a zero would state that the
 * position is worthless — a settlement the exchange never published.
 */
function valueCell(row: ValuedPosition) {
  if (row.status === "unresolved") {
    return <span className="text-muted">DEMO · unresolved — the exchange published no winner</span>;
  }
  if (row.status === "unvalued") {
    return <span className="text-muted">DEMO · not valued — no current price</span>;
  }
  const label = row.status === "won" ? "won · " : row.status === "lost" ? "lost · " : "";
  return (
    <span>
      DEMO · {label}
      {formatUsdPrecise(row.valueUsd ?? 0)}
    </span>
  );
}

export function DemoPositions({ rows, totals }: { rows: ValuedPosition[]; totals: Totals }) {
  if (rows.length === 0) return null;

  return (
    <section
      aria-label="Demo positions"
      className="rounded-panel border border-demo/30 bg-demo/[0.06] p-4"
    >
      <h2 className="text-sm font-semibold text-demo">
        DEMO positions — no real money involved
      </h2>

      <ul className="mt-2 space-y-3">
        {rows.map(({ position: p, ...row }) => (
          <li
            key={p.id}
            data-testid={`position-${p.id}`}
            className="font-figure text-xs tabular-nums text-ink"
          >
            <span className="font-medium">DEMO</span> · {p.shares.toFixed(2)} shares of{" "}
            <span className="font-medium">{p.outcomeLabel}</span> at {formatPercent(p.priceAtFill)}
            <span className="block font-sans text-muted [overflow-wrap:anywhere]">{p.question}</span>

            <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span data-testid="position-cost">Cost {formatUsdPrecise(p.costUsd)}</span>
              <span data-testid="position-value">{valueCell({ position: p, ...row })}</span>
              {row.pnlUsd !== null && (
                <span data-testid="position-pnl" className={tone(row.pnlUsd)}>
                  {signedUsd(row.pnlUsd)}
                </span>
              )}
            </span>

            {p.fillSource === "listed" && (
              // Cost and value then come from different sources, and the gap
              // between them is the sources disagreeing, not the market moving.
              <span className="block font-sans text-dim">
                Filled at the listed price — the order book was unavailable, so this
                position&rsquo;s change is approximate.
              </span>
            )}
          </li>
        ))}
      </ul>

      <p
        data-testid="position-totals"
        className="mt-3 border-t border-demo/20 pt-2 font-figure text-xs tabular-nums text-ink"
      >
        {totals.valueUsd === null ? (
          <span className="text-muted">
            DEMO · not valued — no current prices for these positions
          </span>
        ) : (
          <>
            <span className="font-medium">DEMO total</span> · cost{" "}
            {formatUsdPrecise(totals.costUsd ?? 0)} · now{" "}
            <span data-testid="totals-value">{formatUsdPrecise(totals.valueUsd)}</span> ·{" "}
            <span data-testid="totals-pnl" className={tone(totals.pnlUsd ?? 0)}>
              {signedUsd(totals.pnlUsd ?? 0)}
            </span>
          </>
        )}
        {totals.excluded > 0 && (
          // Never fold these into the sum: a total that quietly drops positions
          // claims the rest are worth nothing.
          <span className="block font-sans text-muted">
            {totals.excluded} position{totals.excluded === 1 ? "" : "s"} could not be valued and{" "}
            {totals.excluded === 1 ? "is" : "are"} not counted above.
          </span>
        )}
      </p>

      <p className="mt-2 font-sans text-xs text-muted">
        Practice money. Values follow live prices and are not a balance you can bet with.
      </p>
    </section>
  );
}
